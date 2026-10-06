"use client";

import type { CSSProperties } from "react";
import { formatClockSeconds, internalClockRoundLimitMs, type InternalClockResult } from "@/lib/games/internal-clock";
import styles from "./internal-clock.module.css";

export type ClockDisplayResult = InternalClockResult & { timedOut?: boolean };

export function clockVerdict(round: ClockDisplayResult) {
  if (round.timedOut ?? round.elapsedMs >= internalClockRoundLimitMs(round.targetMs / 1000)) return "Time got away!";
  if (Math.abs(round.differenceMs) < 5) return "Right on time!";
  return `${formatClockSeconds(Math.abs(round.differenceMs))}s ${round.differenceMs < 0 ? "early" : "late"}!`;
}

export function TimeTrack({ round, compact = false }: { round: ClockDisplayResult; compact?: boolean }) {
  const limitMs = internalClockRoundLimitMs(round.targetMs / 1000);
  const targetPosition = round.targetMs / limitMs * 100;
  const stopPosition = round.elapsedMs / limitMs * 100;
  const style = {
    "--target-position": `${targetPosition}%`,
    "--stop-position": `${stopPosition}%`,
    "--gap-start": `${Math.min(targetPosition, stopPosition)}%`,
    "--gap-width": `${Math.abs(targetPosition - stopPosition)}%`,
  } as CSSProperties;

  return <div className={compact ? styles.miniTrack : styles.timeTrack} style={style}>
    <div className={styles.trackGraphic} aria-hidden="true">
      <span className={styles.trackRail} /><span className={styles.trackGap} />
      <span className={styles.targetPin}><i /></span><span className={styles.stopPin}><i /></span>
    </div>
    {compact ? null : <div className={styles.trackScale}><span>0s</span><span>{formatClockSeconds(limitMs)}s</span></div>}
    {!compact && <div className={styles.trackLegend}>
      <span><i className={styles.targetKey} />Target <strong>{formatClockSeconds(round.targetMs)}s</strong></span>
      <span><i className={styles.stopKey} />Your stop <strong>{formatClockSeconds(round.elapsedMs)}s</strong></span>
    </div>}
  </div>;
}
