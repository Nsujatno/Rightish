"use client";

import type { CSSProperties } from "react";
import games from "./games.module.css";
import styles from "./flash-grid-countdown.module.css";

// A five-column tile board draws the same 3, 2, 1 shown by the room timer.
const digits: Record<number, readonly string[]> = {
  3: ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  2: ["11110", "00001", "00001", "11110", "10000", "10000", "11111"],
  1: ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
};

export function FlashGridCountdown({ count }: { count: number }) {
  const digit = Math.max(1, Math.min(3, count));
  const cells = digits[digit].join("").split("");
  let flashOrder = 0;

  return <div className={styles.countdown}>
    <div key={digit} className={styles.tiles} aria-hidden="true">
      {cells.map((cell, index) => {
        const lit = cell === "1";
        const delay = lit ? flashOrder++ * 25 : 0;
        return <span key={index} className={styles.tile} data-lit={lit}
          style={{ "--flash-delay": `${delay}ms` } as CSSProperties} />;
      })}
    </div>
    <span className={games.splitCountdownAccessible}>{digit}</span>
  </div>;
}
