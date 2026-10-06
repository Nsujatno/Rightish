"use client";

import { useRef, type KeyboardEvent, type PointerEvent } from "react";
import { angleFromPoint } from "@/lib/games/angle-it";
import styles from "./angle-it.module.css";

const pivot = { x: 250, y: 300 };
function endpoint(angle: number, length: number) {
  const radians = angle * Math.PI / 180;
  return { x: pivot.x - Math.cos(radians) * length, y: pivot.y - Math.sin(radians) * length };
}

export function AngleItBoard({ angle, target, onChange, compact = false }: { angle: number; target?: number; onChange?: (angle: number) => void; compact?: boolean }) {
  const pointer = useRef<number | null>(null);
  const hand = endpoint(angle, 180);
  const arc = endpoint(angle, 95);
  const answer = target === undefined ? null : endpoint(target, 180);
  function update(event: PointerEvent<SVGSVGElement>) {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix || !onChange) return;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    if (Math.hypot(point.x - pivot.x, point.y - pivot.y) < 20) return;
    onChange(Math.round(angleFromPoint(point.x, point.y, pivot.x, pivot.y) * 10) / 10);
  }
  function down(event: PointerEvent<SVGSVGElement>) {
    if (!onChange || !event.isPrimary || event.button !== 0) return;
    pointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    event.currentTarget.focus();
    update(event);
  }
  function up(event: PointerEvent<SVGSVGElement>) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function keyboard(event: KeyboardEvent<SVGSVGElement>) {
    if (!onChange || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 5 : 1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? 180 :
      angle + (["ArrowRight", "ArrowUp"].includes(event.key) ? step : -step);
    onChange(Math.max(0, Math.min(180, next)));
  }
  return <svg className={styles.boardSvg} data-interactive={!!onChange} viewBox={compact ? "35 95 430 245" : "0 0 500 390"}
    role={onChange ? "slider" : "img"} tabIndex={onChange ? 0 : undefined}
    aria-label={onChange ? "Rotate the hand to match the target angle" : `Your angle ${angle} degrees${target === undefined ? "" : `; target ${target} degrees`}`}
    aria-valuemin={onChange ? 0 : undefined} aria-valuemax={onChange ? 180 : undefined}
    aria-valuenow={onChange ? angle : undefined} aria-valuetext={onChange ? `${angle} degrees` : undefined}
    onPointerDown={down} onPointerMove={(event) => { if (pointer.current === event.pointerId) update(event); }}
    onPointerUp={up} onPointerCancel={up} onLostPointerCapture={() => { pointer.current = null; }} onKeyDown={keyboard}>
    <g aria-hidden="true">
      {!compact && <text x="38" y="46" className={styles.boardCaption}>{onChange ? "a little turn. a wild guess." : answer ? "let’s see how that lines up." : "looks about right?"}</text>}
      <path d={`M250 300 L155 300 A95 95 0 0 1 ${arc.x} ${arc.y} Z`} fill="#edb4a0" fillOpacity=".55" />
      <path d={`M155 300 A95 95 0 0 1 ${arc.x} ${arc.y}`} fill="none" stroke="#bf7964" strokeWidth="2.5" strokeDasharray="5 6" />
      <path d="M70 300H250" stroke="#8b8372" strokeWidth="11" strokeLinecap="round" />
      {answer && <><path d={`M250 300 L${answer.x} ${answer.y}`} stroke="#6e8a67" strokeWidth="6" strokeDasharray="8 9" strokeLinecap="round" /><circle cx={answer.x} cy={answer.y} r="9" fill="#dce7cf" stroke="#6e8a67" strokeWidth="3" /></>}
      <path d={`M250 300 L${hand.x} ${hand.y}`} stroke="#b86e59" strokeWidth="12" strokeLinecap="round" />
      <circle cx={hand.x} cy={hand.y} r="14" fill="#f9e5d8" stroke="#b86e59" strokeWidth="3" />
      <path d={`M${hand.x - 3} ${hand.y - 4}v8 M${hand.x + 3} ${hand.y - 4}v8`} stroke="#b86e59" strokeWidth="2" strokeLinecap="round" />
      <circle cx="250" cy="300" r="6" fill="#8b6b58" />
      {!compact && <><text x="70" y="338" className={styles.baselineLabel}>this bit stays put.</text>
        <path d="m441 56 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z" fill="#d7ad67" /></>}
    </g>
  </svg>;
}
