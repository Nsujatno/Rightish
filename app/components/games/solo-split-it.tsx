"use client";

import { useState } from "react";
import { gameRegistry } from "@/lib/games/registry";
import { formatSplit } from "@/lib/games/split-it/format";
import { isPerfectSplit } from "@/lib/games/split-it";
import { Celebration } from "./celebration";
import { GameActions, GameShell, RoundHeading } from "./game-shell";
import { RoundResults, Standings } from "./round-results";
import { useSoloMatch } from "./use-solo-match";
import { ShapePreview } from "./split-it/shape";
import { SplitItRound } from "./split-it/round";
import { SplitItReveal } from "./split-it/reveal";
import styles from "./games.module.css";

const game = gameRegistry["split-it"];
const settings = { roundCount: game.defaultRoundCount, durationSeconds: game.defaultDurationSeconds };

export default function SoloSplitIt({ initialSeed }: { initialSeed?: string }) {
  const match = useSoloMatch(game, settings, initialSeed);
  const [copyMessage, setCopyMessage] = useState("");
  const round = match.latestRound;
  const perfect = round ? isPerfectSplit(round.result.fractions) : false;
  const players = round ? [{
    playerId: "solo", nickname: "You", result: round.result,
    totalScore: match.totalScore, previousRank: null,
  }] : [];

  function start(seed?: string) {
    setCopyMessage("");
    match.start(seed);
  }

  async function copyChallenge() {
    const url = new URL("/play/split-it", window.location.origin);
    url.searchParams.set("seed", match.matchSeed);
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopyMessage("Copied! This link plays the same five shapes.");
    } catch { setCopyMessage(`Play the same shapes: ${url.toString()}`); }
  }

  return <GameShell round={match.roundIndex + 1} roundCount={settings.roundCount} totalScore={match.totalScore}>
    {match.phase === "ready" && <>
      <RoundHeading eyebrow="TWO HALVES. ONE WILD GUESS." title="Split It." description="How close to half can you get?" />
      <section className={styles.introLayout}>
        <div className={styles.introBoard}><ShapePreview challenge={match.challenge} /><span className={styles.introSticker}>looks easy.<br />probably isn’t.</span></div>
        <div className={styles.introRules}>
          <span className={styles.eyebrow}>A LITTLE PRACTICE. A LOT OF GUESSING.</span>
          <h2>Trust your eyes.<br />Make the cut.</h2>
          <ol>
            <li><span>1</span><div><strong>Place your anchors.</strong><p>Click or tap once for the first point, then on the other side to set a straight cut.</p></div></li>
            <li><span>2</span><div><strong>Make it feel right.</strong><p>Drag either anchor to adjust, then lock it in. At zero, your latest valid cut counts.</p></div></li>
            <li><span>3</span><div><strong>See how close you got.</strong><p>Accuracy earns up to 1,000 points.</p></div></li>
          </ol>
          <div className={styles.introFacts}><span>5 fresh shapes</span><i>✦</i><span>20 seconds each</span></div>
          {initialSeed && <p className={styles.sharedChallenge}>You’ve got a shared challenge. Same shapes, fresh guesses.</p>}
          <GameActions><button className={styles.primaryButton} onClick={() => start(initialSeed)}>Let’s split it <span>↗</span></button></GameActions>
        </div>
      </section>
    </>}

    {match.phase === "playing" && <>
      <RoundHeading eyebrow="GO WITH YOUR GUT" title="Split It." description={game.instructions} seconds={match.remainingSeconds} />
      <SplitItRound key={match.roundIndex} challenge={match.challenge} onAnswerChange={match.changeAnswer} onConfirm={match.confirm} />
    </>}

    {match.phase === "reveal" && round && <>
      {perfect && <Celebration key={`${match.matchSeed}:${match.roundIndex}`} message="Perfect split!" badge="50 / 50" detail="Your eyeballs deserve a tiny trophy." />}
      <RoundHeading eyebrow="THE MOMENT OF ALMOST-TRUTH" title={round.result.score >= 950 ? "That’s pretty right." : round.result.score >= 700 ? "Right-ish. We’ll take it." : "There’s always next round."} description="The percentages are in. Confidence was optional." />
      <RoundResults key={match.roundIndex} players={players} currentPlayerId="solo"
        renderPreview={(result) => <ShapePreview challenge={round.challenge} result={result} mini />}
        renderSummary={(result) => result.fractions ? `${formatSplit(result.fractions).join("% / ")}%` : "No cut submitted"}
        renderDetail={(player) => <SplitItReveal challenge={round.challenge} result={player.result} nickname={player.nickname} />} />
      <Standings players={players} currentPlayerId="solo" />
      <div className={`${styles.continueBar} ${styles.mobileActions}`}><p>Take it in. You set the pace.</p><button className={styles.primaryButton} onClick={match.next}>{match.roundIndex + 1 === settings.roundCount ? "Final scores" : "Next shape"} <span>↗</span></button></div>
    </>}

    {match.phase === "finished" && <>
      <RoundHeading eyebrow="FIVE SHAPES. FIVE EDUCATED GUESSES." title="Close enough. Again?" description="A little wrong, a little wiser." />
      <section className={styles.finalCard}>
        <span className={styles.eyebrow}>YOUR GRAND TOTAL</span>
        <strong className={styles.finalScore}>{match.totalScore.toLocaleString()}<span> / 5,000</span></strong>
        <p>{match.totalScore >= 4500 ? "Your eyes deserve a tiny trophy." : match.totalScore >= 3000 ? "A very respectable amount of almost-right." : "Your confidence was the real winner."}</p>
        <div className={styles.history}>{match.rounds.map((item) => <div key={item.roundIndex}><span>ROUND {item.roundIndex + 1}</span><ShapePreview challenge={item.challenge} result={item.result} mini /><strong>{item.result.score.toLocaleString()}<small> pts</small></strong></div>)}</div>
        <div className={`${styles.finalActions} ${styles.mobileActions}`}><button className={styles.primaryButton} onClick={() => start()}>Five more shapes <span>↗</span></button><button className={styles.secondaryButton} onClick={() => start(match.matchSeed)}>Replay these shapes ↶</button></div>
        <button className={styles.shareButton} onClick={() => void copyChallenge()}>Challenge a friend with these shapes ↗</button>
        {copyMessage && <p className={styles.copyMessage} role="status">{copyMessage}</p>}
      </section>
    </>}
  </GameShell>;
}
