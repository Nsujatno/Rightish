"use client";

import { useEffect, useState } from "react";
import { Illustration } from "@/app/components/art";
import { ANGLE_IT_ROUNDS, ANGLE_IT_SECONDS, ANGLE_IT_START, generateAngleItMatch, scoreAngleIt,
  type AngleItChallenge, type AngleItResult } from "@/lib/games/angle-it";
import { AngleItBoard } from "./angle-it-board";
import { Celebration } from "./celebration";
import { GameActions, GameShell, RoundHeading } from "./game-shell";
import games from "./games.module.css";
import styles from "./angle-it.module.css";

type CompletedRound = AngleItResult & { timedOut: boolean };
type Match = { phase: "intro" | "playing" | "reveal" | "finished"; seed: string;
  challenges: AngleItChallenge[]; roundIndex: number; angle: number; touched: boolean;
  deadline: number | null; results: CompletedRound[] };

function finishRound(match: Match, timedOut: boolean): Match {
  if (match.phase !== "playing") return match;
  return { ...match, phase: "reveal", deadline: null, results: [...match.results,
    { ...scoreAngleIt(match.challenges[match.roundIndex], match.touched ? match.angle : null), timedOut }] };
}

function verdict(result: AngleItResult) {
  if (result.differenceDegrees === null) return "The hand got stage fright.";
  const error = Math.abs(result.differenceDegrees);
  if (error <= 0.5) return "A very acute talent.";
  if (error <= 5) return "You’ve got the right angle-ish.";
  return result.differenceDegrees > 0 ? "A little too open." : "A little too snug.";
}

export default function SoloAngleIt({ initialSeed }: { initialSeed?: string }) {
  const [match, setMatch] = useState<Match>(() => ({ phase: "intro", seed: initialSeed ?? "preview",
    challenges: generateAngleItMatch(initialSeed ?? "preview"), roundIndex: 0, angle: ANGLE_IT_START,
    touched: false, deadline: null, results: [] }));
  const [now, setNow] = useState(0);
  const [copyMessage, setCopyMessage] = useState("");
  const target = match.challenges[match.roundIndex].targetDegrees;
  const result = match.results[match.roundIndex];
  const totalScore = match.results.reduce((sum, round) => sum + round.score, 0);
  const seconds = match.deadline === null ? 0 : Math.max(0, Math.ceil((match.deadline - now) / 1000));

  useEffect(() => {
    if (match.phase !== "playing") return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      setMatch((current) => current.deadline !== null && time >= current.deadline ? finishRound(current, true) : current);
    };
    tick();
    const interval = window.setInterval(tick, 100);
    document.addEventListener("visibilitychange", tick);
    return () => { window.clearInterval(interval); document.removeEventListener("visibilitychange", tick); };
  }, [match.phase, match.deadline]);

  function start(seed?: string) {
    const matchSeed = seed ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), (value) => value.toString(36)).join("-");
    const time = Date.now();
    setNow(time);
    setCopyMessage("");
    setMatch({ phase: "playing", seed: matchSeed, challenges: generateAngleItMatch(matchSeed),
      roundIndex: 0, angle: ANGLE_IT_START, touched: false, deadline: time + ANGLE_IT_SECONDS * 1000, results: [] });
  }
  function change(angle: number) {
    const time = Date.now();
    setMatch((current) => {
      if (current.phase !== "playing") return current;
      if (current.deadline !== null && time >= current.deadline) return finishRound(current, true);
      return { ...current, angle, touched: true };
    });
  }
  function submit() {
    const time = Date.now();
    setMatch((current) => finishRound(current, current.deadline !== null && time >= current.deadline));
  }
  function next() {
    const time = Date.now();
    setNow(time);
    setMatch((current) => {
      if (current.phase !== "reveal") return current;
      if (current.roundIndex + 1 === ANGLE_IT_ROUNDS) return { ...current, phase: "finished" };
      return { ...current, phase: "playing", roundIndex: current.roundIndex + 1, angle: ANGLE_IT_START,
        touched: false, deadline: time + ANGLE_IT_SECONDS * 1000 };
    });
  }
  async function share() {
    const url = new URL("/play/angle-it", window.location.origin);
    url.searchParams.set("seed", match.seed);
    try { await navigator.clipboard.writeText(url.toString()); setCopyMessage("Copied! Same five angles, fresh guesses."); }
    catch { setCopyMessage(`Play these angles: ${url.toString()}`); }
  }

  return <GameShell round={match.roundIndex + 1} roundCount={ANGLE_IT_ROUNDS} totalScore={totalScore}>
    {match.phase === "intro" && <>
      <RoundHeading eyebrow="A LITTLE TURN. A LOT OF CONFIDENCE." title="Angle It." description="How well do you know an angle when you see one?" />
      <section className={games.introLayout}>
        <div className={styles.introArt}><Illustration kind="angle" /><span>feels right-ish.</span></div>
        <div className={games.introRules}>
          <span className={games.eyebrow}>GIVE YOUR GUT A LITTLE GEOMETRY</span>
          <h2>See a number.<br />Give it an angle.</h2>
          <ol>
            <li><span>1</span><div><strong>Meet your target.</strong><p>We give you a number of degrees. Picture what that angle looks like.</p></div></li>
            <li><span>2</span><div><strong>Take the hand for a spin.</strong><p>Drag the round handle. The peach wedge shows the angle from the fixed horizontal arm.</p></div></li>
            <li><span>3</span><div><strong>Lock in your best guess.</strong><p>Then see your angle beside the answer. Each degree off costs 20 of the 1,000 points.</p></div></li>
          </ol>
          <div className={games.introFacts}><span>5 fresh angles</span><i>✦</i><span>20 seconds each</span></div>
          {initialSeed && <p className={games.sharedChallenge}>A friend’s challenge. Same angles, your own little twists.</p>}
          <GameActions><button className={games.primaryButton} onClick={() => start(initialSeed)}>Let’s angle it <span>↗</span></button></GameActions>
        </div>
      </section>
    </>}

    {match.phase === "playing" && <>
      <RoundHeading eyebrow={`ROUND ${match.roundIndex + 1} · EYEBALL IT`} title="Give it a little turn." description="Drag the handle until the peach angle feels like the target." seconds={seconds} />
      <section className={styles.playArea}>
        <div className={styles.boardFrame}>
          <div className={styles.targetBanner}><span>MAKE THIS ANGLE</span><strong>{target}°</strong><span className={styles.targetAside}>trust your<br />inner protractor.</span></div>
          <AngleItBoard key={match.roundIndex} angle={match.angle} onChange={change} />
          <div className={styles.boardFooter}><span className={styles.peachDot} /> The shaded bit is your angle.</div>
        </div>
        <p className={games.feedback}>{match.touched ? "Looking right-ish? You can keep tweaking." : "Grab the round handle and give it a go."}</p>
        <GameActions><button className={games.primaryButton} onClick={submit} disabled={!match.touched}>Lock in my angle <span>↗</span></button></GameActions>
        <details className={games.keyboardHelp}><summary>Playing with a keyboard?</summary><p>Tab to the board. Arrow keys turn the hand; hold Shift for bigger turns. Home and End move to either end of the arc.</p></details>
      </section>
    </>}

    {match.phase === "reveal" && result && <>
      {result.differenceDegrees !== null && Math.abs(result.differenceDegrees) <= 0.5 && <Celebration key={`${match.seed}:${match.roundIndex}`} message="Angle ace!" badge={`${Math.abs(result.differenceDegrees)}° off`} detail="Your inner protractor deserves a little bow." />}
      <RoundHeading eyebrow="THE ANGLE HAS SPOKEN" title={verdict(result)} description={result.timedOut ? "Time’s up! Here’s where your hand landed." : "Your guess and the real thing, together at last."} />
      <section className={styles.revealLayout}>
        <div className={styles.boardFrame}>
          <AngleItBoard angle={result.guessDegrees ?? ANGLE_IT_START} target={result.targetDegrees} />
          <div className={styles.legend}><span><i className={styles.peachDot} />{result.guessDegrees === null ? "Starting hand" : "Your guess"}</span><span><i className={styles.answerLine} />Target angle</span></div>
        </div>
        <div className={styles.resultPanel}>
          <span className={games.eyebrow}>YOUR LITTLE TWIST</span>
          <div className={styles.comparison}><div><span>YOUR GUESS</span><strong>{result.guessDegrees === null ? "—" : `${result.guessDegrees}°`}</strong></div><div><span>THE TARGET</span><strong>{result.targetDegrees}°</strong></div></div>
          <p className={styles.error}>{result.differenceDegrees === null ? "No guess this round." : `${Math.abs(result.differenceDegrees)}° ${result.differenceDegrees === 0 ? "off. Spot on!" : result.differenceDegrees > 0 ? "too wide." : "too narrow."}`}</p>
          <div className={styles.scoreSticker}><strong>+{result.score.toLocaleString()}</strong><span>POINTS</span></div>
          <p className={styles.scoringNote}>{result.guessDegrees === null ? "Give the hand a turn next time to save a guess." : "1,000 points to start. 20 fewer for each degree off."}</p>
        </div>
      </section>
      <div className={`${games.continueBar} ${games.mobileActions}`}><p>{result.timedOut && result.guessDegrees !== null ? "We saved your last position when time ran out." : "A new angle on things?"}</p><button className={games.primaryButton} onClick={next}>{match.roundIndex + 1 === ANGLE_IT_ROUNDS ? "Final score" : "Next angle"} <span>↗</span></button></div>
    </>}

    {match.phase === "finished" && <>
      <RoundHeading eyebrow="FIVE TURNS. QUESTIONABLE CERTAINTY." title="Got an angle on it?" description="Your inner protractor has finished its shift." />
      <section className={games.finalCard}>
        <span className={games.eyebrow}>YOUR GRAND TOTAL</span>
        <strong className={games.finalScore}>{totalScore.toLocaleString()}<span> / 5,000</span></strong>
        <p>{totalScore >= 4500 ? "Suspiciously good. Are you secretly a protractor?" : totalScore >= 3000 ? "Some very well-rounded guesses." : "Geometry has a funny way of humbling us."}</p>
        <div className={styles.history}>{match.results.map((round, index) => <div key={index}>
          <span>ROUND {index + 1}</span><strong>{round.targetDegrees}°</strong><small>{round.guessDegrees === null ? "No guess" : `You: ${round.guessDegrees}° · ${Math.abs(round.differenceDegrees!)}° off`}</small>
          <b>{round.score.toLocaleString()} pts</b>
        </div>)}</div>
        <div className={`${games.finalActions} ${games.mobileActions}`}><button className={games.primaryButton} onClick={() => start()}>Five fresh angles <span>↗</span></button><button className={games.secondaryButton} onClick={() => start(match.seed)}>Replay these angles ↶</button></div>
        <button className={games.shareButton} onClick={() => void share()}>Challenge a friend with these angles ↗</button>
        {copyMessage && <p className={games.copyMessage} role="status">{copyMessage}</p>}
      </section>
    </>}
  </GameShell>;
}
