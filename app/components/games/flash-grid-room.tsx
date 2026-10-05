"use client";

import { useState } from "react";
import { FlashGridBoard } from "./solo-flash-grid";
import type { FlashGridChallenge, FlashGridResult } from "@/lib/games/flash-grid";
import styles from "./flash-grid.module.css";
import games from "./games.module.css";

export function FlashGridRoomRound({ challenge, initialAnswer, serverNow, startsAt, onAnswerChange, onConfirm }: {
  challenge: FlashGridChallenge; initialAnswer: unknown; serverNow: number; startsAt: string;
  onAnswerChange: (answer: number[]) => void; onConfirm: () => void;
}) {
  const [selected, setSelected] = useState<number[]>(Array.isArray(initialAnswer) ? initialAnswer : []);
  const studying = serverNow < Date.parse(startsAt) + (challenge.studySeconds ?? 3) * 1000;
  function toggle(cell: number) {
    if (studying) return;
    const next = selected.includes(cell) ? selected.filter((item) => item !== cell) : [...selected, cell];
    setSelected(next);
    onAnswerChange(next);
  }
  return <div className={styles.playArea}>
    <div className={styles.boardFrame}>
      <div className={styles.boardTop}><span>{challenge.size} × {challenge.size} GRID</span>
        <strong>{studying ? "LOOK CLOSELY" : `${selected.length} PICKED`}</strong></div>
      <FlashGridBoard challenge={challenge} mode={studying ? "study" : "recall"}
        selectedCells={selected} onToggle={toggle} />
      <span className={styles.boardDoodle} aria-hidden="true">✦</span>
    </div>
    <p className={styles.phaseNote} role="status">{studying ? "Remember the glowing squares." : "Tap the squares you remember. Tap again to undo."}</p>
    {!studying && <button className={games.primaryButton} type="button" onClick={onConfirm} disabled={initialAnswer === null && selected.length === 0}>
      Lock in my picks <span>↗</span>
    </button>}
  </div>;
}

export function FlashGridRoomReveal({ challenge, result, nickname }: {
  challenge: FlashGridChallenge; result: FlashGridResult; nickname: string;
}) {
  return <div className={styles.revealLayout}>
    <div className={styles.revealBoardWrap}>
      <div className={styles.boardTop}><span>{challenge.size} × {challenge.size} GRID</span><strong>{nickname.toUpperCase()}’S PICKS</strong></div>
      <FlashGridBoard challenge={challenge} mode="reveal" result={result} />
    </div>
    <div className={styles.revealPanel}>
      <strong className={styles.roundScore}>{result.score.toLocaleString()}<small> / 1,000 pts</small></strong>
      <p>{result.correct} of {challenge.litCells.length} glowing squares found.</p>
      <div className={styles.tally}>
        <span><i data-kind="correct" />Found <b>{result.correct}</b></span>
        <span><i data-kind="missed" />Missed <b>{result.missed}</b></span>
        <span><i data-kind="extra" />Extra <b>{result.extra}</b></span>
      </div>
    </div>
  </div>;
}
