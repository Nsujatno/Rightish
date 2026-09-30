"use client";

import { useState } from "react";
import type { SplitItResult } from "@/lib/games/split-it";
import type { SplitItChallenge } from "@/lib/games/split-it/generator";
import { formatSplit } from "@/lib/games/split-it/format";
import { ShapePreview } from "./shape";
import styles from "../games.module.css";

export function SplitItReveal({ challenge, result, nickname, targetPercent = 50 }: {
  challenge: SplitItChallenge; result: SplitItResult; nickname: string; targetPercent?: number;
}) {
  const [showPerfect, setShowPerfect] = useState(false);
  const percentages = result.fractions ? formatSplit(result.fractions) : null;
  return <>
    <div className={styles.detailTitle}><h2>{nickname === "You" ? "Your cut." : `${nickname}’s cut.`}</h2><span>{result.score.toLocaleString()} / 1,000 pts</span></div>
    <div className={styles.revealBoard}><ShapePreview challenge={challenge} result={result} showPerfect={showPerfect} /></div>
    {percentages ? <>
      <div className={styles.splitNumbers}><strong>{percentages[0]}<span>%</span></strong><i>/</i><strong>{percentages[1]}<span>%</span></strong></div>
      <button className={styles.comparisonButton} aria-pressed={showPerfect} onClick={() => setShowPerfect(!showPerfect)}>{showPerfect ? "Show separated pieces" : `Where was ${targetPercent} / ${100 - targetPercent}?`} <span>{showPerfect ? "↶" : "✦"}</span></button>
      <p className={styles.comparisonNote}>{showPerfect ? <><i className={styles.legendCut} /> Your cut <i className={styles.legendPerfect} /> A perfect cut, at your angle</> : "Two halves. One very confident guess."}</p>
    </> : <div className={styles.noCut}><strong>No cut this time.</strong><p>Time got away from you. The next shape is a fresh start.</p></div>}
  </>;
}
