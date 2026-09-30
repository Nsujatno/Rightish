"use client";

import { useEffect, useRef, useState } from "react";
import { Celebration } from "@/app/components/games/celebration";
import { GameShell, RoundHeading } from "@/app/components/games/game-shell";
import { RoundResults, Standings } from "@/app/components/games/round-results";
import { roomGameViews } from "@/app/components/games/room-game-views";
import { gameCatalog, matchRoundCount } from "@/lib/games/registry";
import { gameOptionsFor } from "@/lib/games/settings";
import type { PlayerRoundResult, ScoredResult } from "@/lib/games/types";
import { readRoom, RoomRequestError, roomRequest } from "@/lib/rooms/client";
import type { RoomSnapshot } from "@/lib/rooms/types";
import games from "@/app/components/games/games.module.css";
import styles from "./room.module.css";

type PendingAnswer = { answer: unknown | null; confirm: boolean };

export function RoomMatch({ code, snapshot, onSnapshot, onLeave }: {
  code: string;
  snapshot: RoomSnapshot;
  onSnapshot: (snapshot: RoomSnapshot) => void;
  onLeave: () => Promise<void>;
}) {
  const match = snapshot.match!;
  const view = roomGameViews[match.gameId];
  const Round = view.Round;
  const CountdownArt = view.CountdownArt;
  const gameTitle = gameCatalog.find((game) => game.id === match.gameId)?.name ?? match.gameId;
  const options = gameOptionsFor(match.settings, match.gameId);
  const isHost = snapshot.room.host_id === snapshot.currentPlayerId;
  const myScore = match.players.find((player) => player.playerId === snapshot.currentPlayerId)?.totalScore ?? 0;
  const [now, setNow] = useState(() => Date.now());
  const [locking, setLocking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestAnswer = useRef<unknown | null>(match.myAnswer);
  const pending = useRef<PendingAnswer | null>(null);
  const sending = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);
  const offset = snapshot.serverNow && snapshot.clientReceivedAt
    ? Date.parse(snapshot.serverNow) - snapshot.clientReceivedAt : 0;
  const serverNow = now + (Number.isFinite(offset) ? offset : 0);
  const startTime = Date.parse(match.startsAt);
  const deadline = Date.parse(match.deadline);
  const countdown = Math.min(3, Math.max(0, Math.ceil((startTime - serverNow) / 1000)));
  const seconds = Math.max(0, Math.ceil((deadline - serverNow) / 1000));

  useEffect(() => {
    alive.current = true;
    const tick = () => setNow(Date.now());
    const interval = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => {
      alive.current = false;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    if (match.phase !== "playing") return;
    const delay = Math.max(0, Date.parse(match.deadline) - (Date.now() + (Number.isFinite(offset) ? offset : 0)) + 120);
    const timer = window.setTimeout(() => {
      void readRoom(code).then(onSnapshot).catch(() => {});
    }, delay);
    return () => window.clearTimeout(timer);
  }, [code, match.deadline, match.phase, offset, onSnapshot]);

  async function refresh() {
    try { onSnapshot(await readRoom(code)); }
    catch { /* The lobby polling and Realtime subscription will retry. */ }
  }

  async function drain() {
    if (sending.current) return;
    sending.current = true;
    try {
      while (pending.current) {
        const item = pending.current;
        pending.current = null;
        const response = await roomRequest<{ snapshot: RoomSnapshot }>(`/api/rooms/${code}/match`, {
          method: "POST", body: JSON.stringify({ action: "answer", roundIndex: match.roundIndex,
            answer: item.answer, confirm: item.confirm }),
        });
        if (!alive.current) return;
        if (item.confirm || response.snapshot.match?.phase !== "playing") {
          pending.current = null;
          onSnapshot(response.snapshot);
          setLocking(false);
          break;
        }
      }
      setError(null);
    } catch (failure) {
      if (!alive.current) return;
      pending.current = null;
      setLocking(false);
      if (failure instanceof RoomRequestError && ["ROUND_CLOSED", "ALREADY_CONFIRMED", "ROUND_NOT_STARTED"].includes(failure.code)) {
        void refresh();
      } else {
        setError(failure instanceof Error ? failure.message : "Your cut couldn’t be saved. Try again.");
      }
    } finally { sending.current = false; }
  }

  function changeAnswer(answer: unknown | null) {
    if (locking || match.myConfirmed || serverNow >= deadline) return;
    latestAnswer.current = answer;
    pending.current = { answer, confirm: false };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => { saveTimer.current = null; void drain(); }, 120);
  }

  function confirm() {
    if (locking || match.myConfirmed || latestAnswer.current === null || serverNow >= deadline) return;
    setLocking(true);
    pending.current = { answer: latestAnswer.current, confirm: true };
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = null;
    void drain();
  }

  async function act(action: "next" | "rematch") {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await roomRequest<{ snapshot: RoomSnapshot }>(`/api/rooms/${code}/match`, {
        method: "POST", body: JSON.stringify({ action, roundIndex: match.roundIndex }),
      });
      onSnapshot(response.snapshot);
    } catch (failure) { setError(failure instanceof Error ? failure.message : "The room couldn’t move on. Try again."); }
    finally { setBusy(false); }
  }

  const results: PlayerRoundResult<ScoredResult>[] = (match.results ?? []).map((player) => ({
    playerId: player.playerId, nickname: player.nickname,
    result: view.result(match.challenge, player.result, options),
    totalScore: player.totalScore, previousRank: null,
  }));
  for (const player of results) {
    const previous = player.totalScore - player.result.score;
    player.previousRank = 1 + results.filter((other) =>
      other.totalScore - other.result.score > previous).length;
  }
  const mine = results.find((player) => player.playerId === snapshot.currentPlayerId);
  const exact = mine && view.exact(mine.result, options);

  return <GameShell round={match.roundIndex + 1} roundCount={matchRoundCount(match.settings)}
    totalScore={myScore} roomCode={code} onLeave={() => void onLeave()}>
    {error && <p className={styles.error} role="alert">{error}<button className={styles.retryButton} onClick={() => void refresh()}>Refresh room</button></p>}

    {match.phase === "playing" && countdown > 0 && <>
      <RoundHeading eyebrow="SAME ROUND. SAME MOMENT." title="Get your eyes ready." description={`Round ${match.roundIndex + 1} is about to begin.`} />
      <div className={styles.countdownPanel} role="status" aria-live="polite">
        <span className={styles.countdownEyebrow}>{view.countdownLabel ?? "READY TO PLAY"}</span>
        <div className={styles.countdownStage}>
          {CountdownArt ? <CountdownArt count={countdown} />
            : <strong key={countdown} className={styles.countdownFallback}>{countdown}</strong>}
        </div>
        <div className={styles.countdownSteps} aria-hidden="true">
          {[3, 2, 1].map((step) => <i key={step} data-current={step === countdown} data-done={step > countdown} />)}
        </div>
        <p>Everyone starts together!</p>
      </div>
    </>}

    {match.phase === "playing" && countdown === 0 && <>
      <RoundHeading eyebrow={`ROUND ${match.roundIndex + 1} · GO WITH YOUR GUT`}
        title={`${gameTitle}.`}
        description={view.prompt(options)} seconds={seconds} />
      {match.myConfirmed || locking ? <section className={styles.waitingCard} aria-live="polite">
        <span className={styles.waitingArt} aria-hidden="true">✦</span>
        <h2>Cut locked in.</h2>
        <p>{match.confirmedCount} of {match.players.length} players ready. The reveal starts when everyone locks in or the timer ends.</p>
        <div className={styles.waitingPreview}>{view.preview(match.challenge, view.result(match.challenge, null, options))}</div>
      </section> : <div key={`${match.id}:${match.roundIndex}`}>
        <Round challenge={match.challenge} options={options} initialAnswer={match.myAnswer}
          onAnswerChange={changeAnswer} onConfirm={confirm} />
        {seconds === 0 && <p className={styles.matchNotice}>Time is up. Checking everyone’s cuts…</p>}
      </div>}
    </>}

    {match.phase === "reveal" && <>
      {exact && <Celebration key={`${match.id}:${match.roundIndex}`} message="Perfect target!"
        badge={view.exactBadge(options)} detail="Your eyeballs deserve a tiny trophy." />}
      <RoundHeading eyebrow="THE MOMENT OF ALMOST-TRUTH" title="The cuts are in."
        description="Pick a friend’s card to see how their guess landed." />
      <RoundResults key={match.roundIndex} players={results} currentPlayerId={snapshot.currentPlayerId}
        renderPreview={(result) => view.preview(match.challenge, result)}
        renderSummary={(result) => view.summary(result)}
        renderDetail={(player) => view.detail(match.challenge, player.result, player.nickname, options)} />
      <Standings players={results} currentPlayerId={snapshot.currentPlayerId} />
      <div className={games.continueBar}>
        <p>{isHost ? "Take it in. You set the pace." : "The host will start the next part when everyone’s ready."}</p>
        {isHost && <button className={games.primaryButton} onClick={() => void act("next")} disabled={busy}>
          {match.roundIndex + 1 === matchRoundCount(match.settings) ? "Final scores" : "Next round"} <span>↗</span>
        </button>}
      </div>
    </>}

    {match.phase === "finished" && <>
      <RoundHeading eyebrow="THE FINAL ALMOST-TRUTH" title="Well played, crew."
        description="A little wrong, a little wiser. Ready to go again?" />
      <section className={styles.finalMatchCard}>
        <span className={styles.eyebrow}>FINAL STANDINGS</span>
        <Standings players={results} currentPlayerId={snapshot.currentPlayerId} />
        <p>{isHost ? "Same room, fresh shapes. You can tweak the settings before the rematch." : "The host can bring everyone back to the lobby for another match."}</p>
        {isHost && <button className={games.primaryButton} onClick={() => void act("rematch")} disabled={busy}>Back to lobby <span>↗</span></button>}
      </section>
    </>}
  </GameShell>;
}
