"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useMotionPreference } from "@/lib/preferences/client";
import styles from "./games.module.css";

export function GameShell({ children, round, roundCount, totalScore, roomCode, onLeave }: {
  children: ReactNode; round: number; roundCount: number; totalScore: number;
  roomCode?: string; onLeave?: () => void;
}) {
  const { paused, motion } = useMotionPreference();
  return <div className={styles.page} data-paused={paused} data-motion={motion}>
    <a className={styles.skipLink} href="#game-main">Skip to game</a>
    <header className={styles.header}>
      <Link className={styles.wordmark} href="/" aria-label="Rightish home">right<span>ish</span><i>.</i></Link>
      <span className={styles.practiceLabel}><i /> {roomCode ? `Room ${roomCode}` : "Solo practice"}</span>
      {onLeave ? <button className={styles.backLinkButton} type="button" onClick={onLeave}>Leave room ↗</button>
        : <Link className={styles.backLink} href="/">Back home ↗</Link>}
    </header>
    <main id="game-main" className={styles.main}>
      <div className={styles.matchBar}>
        <span>ROUND <strong>{round}</strong> / {roundCount}</span>
        <div className={styles.roundDots} aria-hidden="true">{Array.from({ length: roundCount }, (_, index) => <i key={index} data-state={index + 1 < round ? "done" : index + 1 === round ? "current" : "next"} />)}</div>
        <span><strong>{totalScore.toLocaleString()}</strong> POINTS</span>
      </div>
      {children}
    </main>
    <footer className={styles.footer}>Trust your gut. It’s probably almost right.</footer>
  </div>;
}

export function RoundHeading({ eyebrow, title, description, seconds }: {
  eyebrow: string; title: string; description: string; seconds?: number;
}) {
  return <div className={styles.heading}>
    <div><span className={styles.eyebrow}>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>
    {seconds !== undefined && <div className={styles.timer} data-urgent={seconds <= 5} role="timer" aria-label={`${seconds} seconds remaining`}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="13" r="8" /><path d="M12 8v5l3 2M9 2h6M12 2v3" /></svg>
      <strong>{seconds}</strong><span>SECONDS</span>
    </div>}
  </div>;
}
