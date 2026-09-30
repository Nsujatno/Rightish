import type { CSSProperties } from "react";
import styles from "./games.module.css";

const colors = ["#f5d58d", "#c4d9bf", "#c6d3ee", "#efb9a7", "#dcc8e7", "#b8ded8"];

function Trophy({ className }: { className: string }) {
  return <svg className={className} viewBox="0 0 220 220" fill="none" aria-hidden="true">
    <ellipse cx="110" cy="201" rx="49" ry="7" fill="#c9b88b" opacity=".2" />
    <g className={styles.trophyDance}>
      <path d="M61 58C14 33 20 107 67 115M159 58C206 33 200 107 153 115" stroke="#deb058" strokeWidth="11" strokeLinecap="round" />
      <path d="M100 133h20v41h-20z" fill="#e8bb66" stroke="#b08a45" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M57 41Q110 30 163 41L155 98Q149 128 110 139Q71 128 65 98L57 41Z" fill="#f5d58d" stroke="#b08a45" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M69 50Q79 47 88 47M71 60l4 24" stroke="#fff5d4" strokeWidth="7" strokeLinecap="round" />
      <ellipse cx="87" cy="79" rx="4.5" ry="7" fill="#655035" />
      <path d="M126 81q7-10 14 0" stroke="#655035" strokeWidth="4" strokeLinecap="round" />
      <path d="M95 98q15 17 30-1" stroke="#655035" strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="77" cy="96" rx="9" ry="4" fill="#efb9a7" />
      <ellipse cx="144" cy="96" rx="9" ry="4" fill="#efb9a7" />
      <path d="M79 173Q110 161 141 173L148 193Q110 201 72 193L79 173Z" fill="#f5d58d" stroke="#b08a45" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="m109 173 3 6 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1 3-6Z" fill="#c49b52" />
    </g>
    <path d="m172 24 4 11 11 4-11 4-4 11-4-11-11-4 11-4Z" fill="#b8ded8" />
    <path d="m40 133 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" fill="#dcc8e7" />
  </svg>;
}

function Star() {
  return <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 1 3.2 7.8L23 12l-7.8 3.2L12 23l-3.2-7.8L1 12l7.8-3.2Z" /></svg>;
}

export function Celebration({ message, badge, detail }: { message: string; badge?: string; detail?: string }) {
  return <>
    <div className={styles.celebration} role="status">
      <Trophy className={styles.trophyStamp} />
      <div className={styles.celebrationCopy}><span>THE EYEBALLS HAVE IT.</span><strong>{message}</strong>{detail && <p>{detail}</p>}</div>
      {badge && <span className={styles.celebrationBadge}>{badge}<i>nailed it.</i></span>}
      <span className={styles.bannerSpark} aria-hidden="true"><Star /></span>
    </div>
    <div className={styles.celebrationScene} aria-hidden="true">
      <div className={styles.celebrationHero}>
        <div className={styles.celebrationSunburst} />
        {Array.from({ length: 10 }, (_, index) => <span key={index} className={styles.celebrationStar} style={{
          "--star-x": `${Math.cos(index * Math.PI / 5) * 155}px`,
          "--star-y": `${Math.sin(index * Math.PI / 5) * 120 - 35}px`,
          "--star-rotate": `${index * 23 - 40}deg`,
          color: colors[index % colors.length],
          width: `${18 + (index % 3) * 10}px`,
          animationDelay: `${100 + (index % 4) * 70}ms`,
        } as CSSProperties}><Star /></span>)}
        <Trophy className={styles.trophyHero} />
        <span className={styles.celebrationHeroEyebrow}>NOT EVEN RIGHT-ISH.</span>
        <strong>{message}</strong>
        <svg className={styles.celebrationUnderline} viewBox="0 0 300 22" fill="none"><path d="M7 12Q130-3 291 11M29 20q135-10 235-2" stroke="#eab64d" strokeWidth="5" strokeLinecap="round" /></svg>
        {badge && <span className={styles.celebrationHeroBadge}>{badge}</span>}
      </div>
    </div>
    <div className={styles.confetti} aria-hidden="true">
      {Array.from({ length: 88 }, (_, index) => <span key={index} className={styles.confettiParticle} style={{
        "--confetti-x": `${(index % 2 ? -1 : 1) * (18 + (index * 19) % 78)}vw`,
        "--confetti-rise": `${-28 - (index % 7) * 5}vh`,
        "--confetti-end": `${18 + (index % 5) * 5}vh`,
        "--confetti-spin": `${(index % 2 ? 1 : -1) * (360 + (index % 4) * 180)}deg`,
        "--confetti-color": colors[index % colors.length],
        left: index % 2 ? "100%" : "0%",
        width: `${10 + (index % 4) * 3}px`,
        height: `${15 + (index % 3) * 4}px`,
        animationDelay: `${(index % 8) * 35 + (index >= 64 ? 500 : 0)}ms`,
        animationDuration: `${2400 + (index % 5) * 140}ms`,
      } as CSSProperties}>{index % 5 === 0 ? <Star /> : <i className={styles.confettiBit} data-kind={index % 4} />}</span>)}
    </div>
  </>;
}
