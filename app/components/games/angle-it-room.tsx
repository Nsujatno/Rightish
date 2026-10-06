"use client";

import { useState } from "react";
import { Illustration } from "@/app/components/art";
import { ANGLE_IT_START, isAngleItAnswer, type AngleItChallenge, type AngleItResult } from "@/lib/games/angle-it";
import { AngleItBoard } from "./angle-it-board";
import games from "./games.module.css";
import styles from "./angle-it.module.css";

export function AngleItCountdown({ count }: { count: number }) {
  const angle = count === 3 ? 150 : count === 2 ? 105 : 60;
  const radians = angle * Math.PI / 180;
  const arcX = 100 - Math.cos(radians) * 49;
  const arcY = 137 - Math.sin(radians) * 49;
  return <div className={styles.countdown} role="timer" aria-label={`${count} seconds until Angle It starts`}>
    <svg viewBox="0 0 200 180" fill="none" aria-hidden="true">
      <path d={`M100 137H51A49 49 0 0 1 ${arcX} ${arcY}Z`} fill="#f2c9bb" />
      <path d={`M51 137A49 49 0 0 1 ${arcX} ${arcY}`} stroke="#bb8a80" strokeWidth="2" strokeDasharray="4 5" />
      <path d="M23 137H100" stroke="#a08b76" strokeWidth="8" strokeLinecap="round" />
      <g className={styles.countdownHand} style={{ transform: `rotate(${angle}deg)` }}>
        <path d="M100 137H23" stroke="#c37f6b" strokeWidth="9" strokeLinecap="round" />
        <circle cx="23" cy="137" r="8" fill="#f9e5d8" stroke="#c37f6b" strokeWidth="2.5" />
      </g>
      <circle cx="100" cy="137" r="5" fill="#a08b76" />
    </svg>
    <span className={styles.countdownNumber} aria-hidden="true">{count}</span>
  </div>;
}

export function AngleItRoomRound({ challenge, initialAnswer, onAnswerChange, onConfirm, serverNow, deadline }: {
  challenge: AngleItChallenge; initialAnswer: unknown; serverNow: number; deadline: string;
  onAnswerChange: (answer: number) => void; onConfirm: () => void;
}) {
  const [angle, setAngle] = useState(() => isAngleItAnswer(initialAnswer) ? initialAnswer : ANGLE_IT_START);
  const [touched, setTouched] = useState(() => isAngleItAnswer(initialAnswer));
  const expired = serverNow >= Date.parse(deadline);
  function change(next: number) {
    if (expired) return;
    setAngle(next);
    setTouched(true);
    onAnswerChange(next);
  }
  return <section className={styles.playArea}>
    <div className={styles.boardFrame}>
      <div className={styles.targetBanner}><span>MAKE THIS ANGLE</span><strong>{challenge.targetDegrees}°</strong><span className={styles.targetAside}>trust your<br />inner protractor.</span></div>
      <AngleItBoard angle={angle} onChange={expired ? undefined : change} />
      <div className={styles.boardFooter}><span className={styles.peachDot} />The shaded bit is your angle.</div>
    </div>
    <p className={games.feedback}>{expired ? touched ? "Time’s up. Checking your saved guess." : "Time’s up. No angle saved this round." : touched ? "Looking right-ish? You can keep tweaking." : "Grab the round handle and give it a go."}</p>
    <button className={games.primaryButton} type="button" onClick={onConfirm} disabled={!touched || expired}>Lock in my angle <span>↗</span></button>
    <details className={games.keyboardHelp}><summary>Playing with a keyboard?</summary><p>Tab to the board. Arrow keys turn the hand; hold Shift for bigger turns. Home and End move to either end of the arc.</p></details>
  </section>;
}

export function AngleItRoomWaiting({ challenge }: { challenge: AngleItChallenge }) {
  return <div className={styles.roomWaiting}><Illustration kind="angle" /><span>{challenge.targetDegrees}° was the target</span></div>;
}

export function AngleItRoomPreview({ result }: { result: AngleItResult }) {
  if (result.guessDegrees === null) return <div className={styles.noGuess}>No angle submitted</div>;
  return <AngleItBoard angle={result.guessDegrees} target={result.targetDegrees} compact />;
}

export function AngleItRoomReveal({ result, nickname }: { result: AngleItResult; nickname: string }) {
  return <section className={styles.roomReveal}>
    <div className={games.detailTitle}><h2>{nickname}’s angle.</h2><span>THE REVEAL</span></div>
    <div className={styles.boardFrame}>
      {result.guessDegrees === null ? <div className={styles.noGuess}>No guess was saved before time ran out.<br /><strong>The target was {result.targetDegrees}°.</strong></div>
        : <AngleItBoard angle={result.guessDegrees} target={result.targetDegrees} />}
      {result.guessDegrees !== null && <div className={styles.legend}><span><i className={styles.peachDot} />The guess</span><span><i className={styles.answerLine} />Target angle</span></div>}
    </div>
    <div className={styles.roomResult}>
      <div className={styles.comparison}><div><span>THE GUESS</span><strong>{result.guessDegrees === null ? "—" : `${result.guessDegrees}°`}</strong></div><div><span>THE TARGET</span><strong>{result.targetDegrees}°</strong></div></div>
      <p className={styles.error}>{result.differenceDegrees === null ? "No guess this round." : `${Math.abs(result.differenceDegrees)}° ${result.differenceDegrees === 0 ? "off. Spot on!" : result.differenceDegrees > 0 ? "too wide." : "too narrow."}`}</p>
      <div className={styles.scoreSticker}><strong>+{result.score.toLocaleString()}</strong><span>POINTS</span></div>
      <p className={styles.scoringNote}>1,000 points to start. 20 fewer for each degree off.</p>
    </div>
  </section>;
}
