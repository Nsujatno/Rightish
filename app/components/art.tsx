import type { CSSProperties } from "react";
import styles from "./landing.module.css";

export type GameArt = "split" | "grid" | "clock" | "mirror";

export function Illustration({ kind }: { kind: GameArt }) {
  return (
    <svg viewBox="0 0 200 180" fill="none" aria-hidden="true">
      {kind === "split" && <>
        <path d="M88 28C69 12 35 29 36 49C9 50 15 90 32 99C14 122 40 151 64 142C77 163 105 152 109 130L88 28Z" fill="#F6BF55" />
        <path d="M101 27C122 14 148 26 149 47C177 47 190 80 171 102C191 128 159 154 137 143C136 164 128 149 122 132L101 27Z" fill="#F6BF55" />
        <path d="M91.3 12L122.2 162" stroke="#A47531" strokeWidth="3" strokeDasharray="7 7" strokeLinecap="round" />
        <ellipse cx="63" cy="81" rx="4" ry="7" fill="#5C492D" /><ellipse cx="133" cy="81" rx="4" ry="7" fill="#5C492D" />
        <path d="M73 103Q89.322 115.824 105.644 113.697M117.624 110.122Q123.312 107.469 129 103" stroke="#5C492D" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="52" cy="97" rx="8" ry="4" fill="#EAA16B" /><ellipse cx="145" cy="97" rx="8" ry="4" fill="#EAA16B" />
      </>}
      {kind === "grid" && <>
        <rect x="28" y="14" width="144" height="144" rx="22" fill="#B2C6B5" />
        {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((cell) => <rect key={cell} x={37 + (cell % 3) * 45} y={23 + Math.floor(cell / 3) * 45} width="36" height="36" rx="9" fill={[0, 4, 5, 7].includes(cell) ? "#FBF4CF" : "#D8E6D6"} className={[0, 4, 5, 7].includes(cell) ? styles.flash : undefined} />)}
        <path d="m158 153 20 4-15-20-5 16Z" fill="#627C68" />
      </>}
      {kind === "clock" && <>
        <rect x="84" y="8" width="32" height="15" rx="5" fill="#7E89AD" /><path d="m150 29 10 11" stroke="#7E89AD" strokeWidth="12" strokeLinecap="round" />
        <circle cx="100" cy="98" r="66" fill="#BAC7E5" /><circle cx="100" cy="98" r="52" fill="#F9F9F1" />
        <path d="M100 58v40l25 15" stroke="#7E89AD" strokeWidth="6" strokeLinecap="round" /><circle cx="100" cy="98" r="6" fill="#7E89AD" />
        <path d="M100 52v5M100 139v5M54 98h5M141 98h5" stroke="#BAC7E5" strokeWidth="4" strokeLinecap="round" />
      </>}
      {kind === "mirror" && <>
        <path d="m47 45 26 47-53 1 27-48Z" fill="#E99D8C" /><path d="m153 45 26 47-53 1 27-48Z" fill="#F2C9BB" />
        <path d="M100 17v140" stroke="#BB8A80" strokeWidth="3" strokeDasharray="6 8" strokeLinecap="round" />
        <circle cx="53" cy="124" r="20" fill="#E99D8C" /><circle cx="147" cy="124" r="20" fill="#F2C9BB" />
        <path d="m79 33-9-5m9 5-8 6m-1-6h-18M122 33l9-5m-9 5 8 6m1-6h18" stroke="#BB8A80" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </>}
    </svg>
  );
}

export function Doodles() {
  return <div className={styles.doodles} aria-hidden="true">
    <div className={`${styles.doodle} ${styles.splitDoodle}`}><Illustration kind="split" /><span>half-ish?</span></div>
    <div className={`${styles.doodle} ${styles.gridDoodle}`}><Illustration kind="grid" /><span>wait, which ones?</span></div>
    <div className={`${styles.doodle} ${styles.clockDoodle}`}><Illustration kind="clock" /></div>
    <div className={`${styles.doodle} ${styles.mirrorDoodle}`}><Illustration kind="mirror" /><span>looks about right.</span></div>
    {[
      ["8%", "14%", "#c2cfe2", "12deg"], ["29%", "28%", "#e8aa99", "-16deg"],
      ["71%", "16%", "#c5d4b8", "12deg"], ["92%", "65%", "#e8aa99", "22deg"],
      ["23%", "69%", "#c5d4b8", "-20deg"], ["77%", "75%", "#e8c976", "25deg"],
    ].map(([left, top, color, rotate], index) => <span key={index} className={styles.sparkle} style={{ left, top, color, rotate } as CSSProperties}>✦</span>)}
    <svg className={styles.squiggle} viewBox="0 0 100 60"><path d="M5 40c15-50 30 45 45 0s30 40 45-20" stroke="#CFD9BE" strokeWidth="5" fill="none" strokeLinecap="round" /></svg>
    <span className={styles.littleRing} />
  </div>;
}
