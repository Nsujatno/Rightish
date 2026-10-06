"use client";

import { useEffect, useRef, useState } from "react";
import { Illustration } from "@/app/components/art";
import {
  formatClockSeconds, INTERNAL_CLOCK_TARGETS, internalClockRoundLimitMs, scoreInternalClock,
  type InternalClockResult,
} from "@/lib/games/internal-clock";
import { Celebration } from "./celebration";
import { GameActions, GameShell, RoundHeading } from "./game-shell";
import { clockVerdict, TimeTrack } from "./internal-clock-presentation";
import games from "./games.module.css";
import styles from "./internal-clock.module.css";

type Phase = "intro" | "ready" | "running" | "reveal" | "finished";
type CompletedRound = InternalClockResult & { timedOut: boolean };

export default function SoloInternalClock() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [roundIndex, setRoundIndex] = useState(0);
  const [results, setResults] = useState<CompletedRound[]>([]);
  const startedAt = useRef<number | null>(null);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const target = INTERNAL_CLOCK_TARGETS[roundIndex];
  const result = results[roundIndex];
  const totalScore = results.reduce((total, round) => total + round.score, 0);

  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);

  function start() {
    if (phase !== "ready" || startedAt.current !== null) return;
    startedAt.current = performance.now();
    timeout.current = setTimeout(stop, internalClockRoundLimitMs(target));
    setPhase("running");
  }

  function stop() {
    const startTime = startedAt.current;
    if (startTime === null) return;
    const limitMs = internalClockRoundLimitMs(target);
    const elapsedMs = Math.min(limitMs, Math.max(0, performance.now() - startTime));
    startedAt.current = null;
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
    setResults((current) => [...current, { ...scoreInternalClock(target, elapsedMs), timedOut: elapsedMs >= limitMs }]);
    setPhase("reveal");
  }

  function next() {
    if (phase !== "reveal") return;
    if (roundIndex + 1 === INTERNAL_CLOCK_TARGETS.length) setPhase("finished");
    else { setRoundIndex(roundIndex + 1); setPhase("ready"); }
  }

  function replay() {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = null;
    startedAt.current = null;
    setResults([]);
    setRoundIndex(0);
    setPhase("intro");
  }

  const difference = result ? Math.abs(result.differenceMs) : 0;

  return <GameShell round={roundIndex + 1} roundCount={INTERNAL_CLOCK_TARGETS.length} totalScore={totalScore}>
    {phase === "intro" && <>
      <RoundHeading eyebrow="NO WATCHES. JUST VIBES." title="Internal Clock."
        description="Five chances to find out whether your brain knows what a second feels like." />
      <section className={styles.intro}>
        <div className={styles.clockCard}><Illustration kind="clock" /><span>tick? tock? who knows.</span></div>
        <div className={styles.introCopy}>
          <span className={games.eyebrow}>A VERY SIMPLE LITTLE TEST</span>
          <h2>See the target.<br />Feel the time.</h2>
          <ol>
            <li><b>1</b><span>Look at the target number of seconds.</span></li>
            <li><b>2</b><span>Press Start. The timer runs out of sight.</span></li>
            <li><b>3</b><span>Press Stop when you think that time has passed.</span></li>
          </ol>
          <p>Five quick targets, from 3 to 8 seconds. Each second off costs 200 points. The clock stops itself five seconds after the target.</p>
          <GameActions><button className={games.primaryButton} type="button" onClick={() => setPhase("ready")}>Let’s play <span>↗</span></button></GameActions>
        </div>
      </section>
    </>}

    {(phase === "ready" || phase === "running") && <>
      <RoundHeading eyebrow={`ROUND ${roundIndex + 1} · TRUST YOUR GUT`}
        title={phase === "running" ? "Is it time yet?" : "Ready when you are."}
        description={phase === "running" ? "The timer is hidden. Stop it when the target feels right." : "Take a breath, then start your invisible timer."} />
      <section className={styles.missionCard} data-running={phase === "running"}>
        <div className={styles.missionHeader}>
          <span>YOUR LITTLE TIME MISSION</span>
          <span className={styles.missionStatus}>{phase === "running" ? "GO WITH YOUR GUT" : "MISSION READY"}</span>
        </div>
        <div className={styles.missionBody}>
          <div className={styles.missionTarget}>
            <span className={styles.targetLabel}><i aria-hidden="true" /> YOUR TARGET</span>
            <div className={styles.targetNumber}><strong>{target}</strong><span>seconds</span></div>
            <p>{phase === "running" ? "Keep this number in mind. Stop when it feels right." : "Picture this much time passing. Then give it a go."}</p>
          </div>
          <div className={styles.missionBuddy} aria-hidden="true">
            <span className={styles.missionSparkle}>✦</span>
            <div className={styles.clockFace}><Illustration kind="clock" /></div>
            <span className={styles.clockBubble}>{phase === "running" ? "your call!" : "you got this!"}</span>
          </div>
        </div>
        <div className={styles.missionFooter}>
          <p><strong>{phase === "running" ? "Trust that feeling." : "No ticking, no tricks."}</strong>
            <span>{phase === "running" ? "There are no clues—just your sense of time." : "The invisible clock starts when you press Start."}</span></p>
          <GameActions><button className={games.primaryButton} type="button" onClick={phase === "running" ? stop : start}>
            {phase === "running" ? "Stop the clock" : "Start the clock"}<span>{phase === "running" ? "■" : "↗"}</span>
          </button></GameActions>
        </div>
      </section>
    </>}

    {phase === "reveal" && result && <>
      {result.score >= 980 && <Celebration key={roundIndex} message="Clock wizard!" badge={`${formatClockSeconds(difference)}s off`}
        detail="Your brain brought its own stopwatch." />}
      <RoundHeading eyebrow="TIME TO FACE THE CLOCK" title="The clock has spoken."
        description={result.timedOut ? "The clock stopped itself so this round wouldn’t drag on." : "See exactly where your stop landed."} />
      <section className={styles.revealCard}>
        <div className={styles.revealTop}>
          <div className={styles.revealMascot} aria-hidden="true"><Illustration kind="clock" />
            <span>{result.timedOut ? "I gave you a nudge!" : result.score >= 800 ? "nice timing!" : "time flies, huh?"}</span></div>
          <div className={styles.verdict}><span>ROUND {roundIndex + 1} · THE VERDICT</span><h2>{clockVerdict(result)}</h2>
            <p>{result.timedOut ? "The clock stopped at the round limit." : "That yellow marker is the moment you pressed Stop."}</p></div>
          <div className={styles.scoreSticker}><strong>+{result.score.toLocaleString()}</strong><span>POINTS</span></div>
        </div>
        <TimeTrack round={result} />
      </section>
      <div className={`${games.continueBar} ${games.mobileActions}`}><p>{roundIndex + 1 === INTERNAL_CLOCK_TARGETS.length ? "That was the last target." : "Think you can get closer next time?"}</p>
        <button className={games.primaryButton} type="button" onClick={next}>{roundIndex + 1 === INTERNAL_CLOCK_TARGETS.length ? "Final score" : "Next target"}<span>↗</span></button></div>
    </>}

    {phase === "finished" && <>
      <RoundHeading eyebrow="FIVE INVISIBLE TIMERS LATER" title="How’s your inner clock?"
        description="No ticking, no numbers—just you and your sense of time." />
      <section className={games.finalCard}>
        <span className={games.eyebrow}>YOUR GRAND TOTAL</span>
        <strong className={games.finalScore}>{totalScore.toLocaleString()}<span> / 5,000</span></strong>
        <p>{totalScore >= 4500 ? "Your internal clock is suspiciously precise." : totalScore >= 3000 ? "You have a pretty good feel for time." : "Time is a slippery little thing."}</p>
        <div className={styles.summaryList}>{results.map((round, index) => <div className={styles.summaryCard} key={index}>
          <div className={styles.summaryHeading}><span>ROUND {index + 1} · {formatClockSeconds(round.targetMs)}s TARGET</span>
            <strong>+{round.score.toLocaleString()} pts</strong></div>
          <TimeTrack round={round} compact />
          <p>{clockVerdict(round)} <small>Your stop: {formatClockSeconds(round.elapsedMs)}s</small></p>
        </div>)}</div>
        <GameActions><button className={`${games.primaryButton} ${styles.replayButton}`} type="button" onClick={replay}>Try those times again <span>↗</span></button></GameActions>
      </section>
    </>}
  </GameShell>;
}
