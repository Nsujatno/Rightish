"use client";

import { Illustration } from "@/app/components/art";
import {
  internalClockRoundLimitMs, type InternalClockChallenge, type InternalClockResult,
} from "@/lib/games/internal-clock";
import { clockVerdict, TimeTrack } from "./internal-clock-presentation";
import games from "./games.module.css";
import styles from "./internal-clock.module.css";

export function InternalClockCountdown({ count }: { count: number }) {
  return <div className={styles.countdownClock} data-count={count} role="timer" aria-label={`${count} seconds until the hidden clock starts`}>
    <svg viewBox="0 0 200 180" fill="none" aria-hidden="true">
      <rect x="84" y="8" width="32" height="15" rx="5" fill="#7E89AD" />
      <path d="m150 29 10 11" stroke="#7E89AD" strokeWidth="12" strokeLinecap="round" />
      <circle cx="100" cy="98" r="66" fill="#BAC7E5" />
      <circle cx="100" cy="98" r="52" fill="#F9F9F1" />
      <path d="M100 52v5M100 139v5M54 98h5M141 98h5" stroke="#BAC7E5" strokeWidth="4" strokeLinecap="round" />
      <g className={styles.countdownLongHand}><path d="M100 98V58" stroke="#7E89AD" strokeWidth="6" strokeLinecap="round" /></g>
      <g className={styles.countdownShortHand}><path d="m100 98 25 15" stroke="#7E89AD" strokeWidth="6" strokeLinecap="round" /></g>
      <circle cx="100" cy="98" r="6" fill="#7E89AD" />
    </svg>
    <span className={styles.countdownBadge} aria-hidden="true">{count}</span>
  </div>;
}

export function InternalClockRoomRound({ challenge, onAnswerChange, onConfirm }: {
  challenge: InternalClockChallenge;
  onAnswerChange: (answer: "stop") => void;
  onConfirm: () => void;
}) {
  function stop() {
    onAnswerChange("stop");
    onConfirm();
  }
  return <section className={styles.missionCard} data-running="true">
    <div className={styles.missionHeader}><span>YOUR LITTLE TIME MISSION</span>
      <span className={styles.missionStatus}>GO WITH YOUR GUT</span></div>
    <div className={styles.missionBody}>
      <div className={styles.missionTarget}>
        <span className={styles.targetLabel}><i aria-hidden="true" /> YOUR TARGET</span>
        <div className={styles.targetNumber}><strong>{challenge.targetSeconds}</strong><span>seconds</span></div>
        <p>Keep this number in mind. Stop when it feels right.</p>
      </div>
      <div className={styles.missionBuddy} aria-hidden="true">
        <span className={styles.missionSparkle}>✦</span>
        <div className={styles.clockFace}><Illustration kind="clock" /></div>
        <span className={styles.clockBubble}>your call!</span>
      </div>
    </div>
    <div className={styles.missionFooter}>
      <p><strong>Trust that feeling.</strong><span>Everyone’s hidden clock started together.</span></p>
      <button className={games.primaryButton} type="button" onClick={stop}>Stop the clock <span>■</span></button>
    </div>
  </section>;
}

export function InternalClockRoomPreview({ result }: { result: InternalClockResult }) {
  return <div className={styles.roomPreview}><TimeTrack round={result} compact /></div>;
}

export function InternalClockRoomWaiting({ challenge }: { challenge: InternalClockChallenge }) {
  return <div className={styles.roomWaiting}>
    <Illustration kind="clock" /><span>{challenge.targetSeconds}s was the target</span>
  </div>;
}

export function InternalClockRoomReveal({ result, nickname }: { result: InternalClockResult; nickname: string }) {
  const timedOut = result.elapsedMs >= internalClockRoundLimitMs(result.targetMs / 1000);
  return <section className={styles.revealCard}>
    <div className={styles.revealTop}>
      <div className={styles.revealMascot} aria-hidden="true"><Illustration kind="clock" />
        <span>{timedOut ? "time's up!" : result.score >= 800 ? "nice timing!" : "time flies, huh?"}</span></div>
      <div className={styles.verdict}><span>{nickname.toUpperCase()} · THE VERDICT</span>
        <h2>{clockVerdict(result)}</h2>
        <p>{timedOut ? "No stop was submitted before the clock ended." : "That yellow pin is the moment they stopped."}</p></div>
      <div className={styles.scoreSticker}><strong>+{result.score.toLocaleString()}</strong><span>POINTS</span></div>
    </div>
    <TimeTrack round={result} />
  </section>;
}
