"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { splitIt } from "@/lib/games/split-it";
import type { SplitItChallenge } from "@/lib/games/split-it/generator";
import { isCut, type Cut, type Point } from "@/lib/games/split-it/geometry";
import type { RoundViewProps } from "@/lib/games/types";
import { ShapeDrawing } from "./shape";
import styles from "../games.module.css";

type Gesture =
  | { pointerId: number; kind: "first"; restore: Point | null }
  | { pointerId: number; kind: "second"; a: Point }
  | { pointerId: number; kind: "endpoint"; base: Cut; endpoint: "a" | "b"; offset: Point };

function Anchor({ point, label, endpoint, preview = false }: {
  point: Point; label: string; endpoint: "first" | "a" | "b"; preview?: boolean;
}) {
  return <g transform={`translate(${point.x * 1000},${point.y * 1000})`} data-anchor={preview ? undefined : endpoint}
    className={styles.anchor} data-preview={preview} data-second={label === "2"} aria-hidden="true">
    <circle r="80" className={styles.anchorHit} />
    <circle r="34" className={styles.anchorHalo} />
    <circle r="23" className={styles.anchorDot} />
    <text className={styles.anchorLabel} dominantBaseline="central" textAnchor="middle">{label}</text>
  </g>;
}

export function SplitItRound({ challenge, onAnswerChange, onConfirm, targetPercent = 50, initialAnswer = null }: RoundViewProps<SplitItChallenge, Cut> & { targetPercent?: number; initialAnswer?: Cut | null }) {
  // A second anchor establishes the answer; aiming alone never replaces it.
  // Valid handle movements update it live for timeouts. Cancelling restores the
  // cut from before the drag.
  const [cut, setCut] = useState<Cut | null>(initialAnswer);
  const [firstAnchor, setFirstAnchor] = useState<Point | null>(null);
  const [draft, setDraft] = useState<Cut | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [message, setMessage] = useState("Click or tap to place your first anchor.");
  const gesture = useRef<Gesture | null>(null);

  function point(event: PointerEvent<SVGSVGElement>): Point {
    const matrix = event.currentTarget.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    return { x: Math.max(0.025, Math.min(0.975, local.x / 1000)), y: Math.max(0.025, Math.min(0.975, local.y / 1000)) };
  }

  function apply(candidate: Cut) {
    if (!splitIt.validateAnswer(challenge, candidate)) return false;
    setCut(candidate);
    setFirstAnchor(null);
    setDraft(null);
    onAnswerChange(candidate);
    setMessage("Drag either anchor to adjust your cut, or lock it in.");
    return true;
  }

  function dragCandidate(current: Extract<Gesture, { kind: "endpoint" }>, position: Point): Cut {
    return { ...current.base, [current.endpoint]: {
      x: Math.max(0.025, Math.min(0.975, position.x - current.offset.x)),
      y: Math.max(0.025, Math.min(0.975, position.y - current.offset.y)),
    } };
  }

  function down(event: PointerEvent<SVGSVGElement>) {
    if (!event.isPrimary || event.button !== 0 || gesture.current) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });
    const position = point(event);
    const endpoint = (event.target as Element).closest("[data-anchor]")?.getAttribute("data-anchor");

    if (!firstAnchor && cut && (endpoint === "a" || endpoint === "b")) {
      gesture.current = { pointerId: event.pointerId, kind: "endpoint", base: cut, endpoint,
        offset: { x: position.x - cut[endpoint].x, y: position.y - cut[endpoint].y } };
      setDraft(cut);
    } else if (firstAnchor && endpoint !== "first") {
      gesture.current = { pointerId: event.pointerId, kind: "second", a: firstAnchor };
      const candidate = { a: firstAnchor, b: position };
      setDraft(isCut(candidate) ? candidate : null);
    } else {
      gesture.current = { pointerId: event.pointerId, kind: "first", restore: firstAnchor };
      setFirstAnchor(position);
      setDraft(null);
      setMessage("First anchor placed. Click or tap on the other side to set the line.");
    }
    setDrawing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent<SVGSVGElement>) {
    const current = gesture.current;
    const position = point(event);
    if (!current) {
      if (firstAnchor && event.isPrimary) {
        const candidate = { a: firstAnchor, b: position };
        setDraft(isCut(candidate) ? candidate : null);
      }
      return;
    }
    if (current.pointerId !== event.pointerId) return;
    if (current.kind === "first") { setFirstAnchor(position); return; }
    const candidate = current.kind === "second" ? { a: current.a, b: position } : dragCandidate(current, position);
    setDraft(isCut(candidate) ? candidate : null);
    if (current.kind === "endpoint" && splitIt.validateAnswer(challenge, candidate)) {
      setCut(candidate);
      onAnswerChange(candidate);
    }
  }

  function up(event: PointerEvent<SVGSVGElement>) {
    const current = gesture.current;
    if (current?.pointerId !== event.pointerId) return;
    const position = point(event);
    gesture.current = null;
    setDrawing(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);

    if (current.kind === "first") { setFirstAnchor(position); setDraft(null); return; }
    const candidate = current.kind === "second" ? { a: current.a, b: position } : dragCandidate(current, position);
    if (apply(candidate)) return;
    if (current.kind === "second") {
      setDraft(isCut(candidate) ? candidate : null);
      setMessage("The line needs to cross the shape. Choose another spot for anchor 2.");
    } else {
      setCut(current.base);
      onAnswerChange(current.base);
      setDraft(null);
      setMessage("That move missed the shape. Your previous cut is still saved.");
    }
  }

  function cancel(event: PointerEvent<SVGSVGElement>) {
    const current = gesture.current;
    if (current?.pointerId !== event.pointerId) return;
    gesture.current = null;
    setDrawing(false);
    setDraft(null);
    if (current.kind === "first") setFirstAnchor(current.restore);
    if (current.kind === "endpoint") {
      setCut(current.base);
      onAnswerChange(current.base);
    }
    setMessage(current.kind === "second" || (current.kind === "first" && current.restore)
      ? "Place the second anchor to finish your line."
      : cut ? "Your cut is still saved. Drag an anchor to adjust it." : "Click or tap to place your first anchor.");
  }

  function clear() {
    setCut(null);
    setFirstAnchor(null);
    setDraft(null);
    onAnswerChange(null);
    setMessage("Fresh eyes. Place your first anchor.");
  }

  function keyboard(event: KeyboardEvent<SVGSVGElement>) {
    if (gesture.current) return;
    if (event.key === "Enter") { event.preventDefault(); if (!firstAnchor) onConfirm(); return; }
    if (event.key === "Escape") { event.preventDefault(); clear(); return; }
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "q", "Q", "e", "E"].includes(event.key)) return;
    event.preventDefault();
    const previous = cut ?? { a: { x: 0.15, y: 0.5 }, b: { x: 0.85, y: 0.5 } };
    const center = { x: (previous.a.x + previous.b.x) / 2, y: (previous.a.y + previous.b.y) / 2 };
    let angle = Math.atan2(previous.b.y - previous.a.y, previous.b.x - previous.a.x);
    const step = event.shiftKey ? 0.005 : 0.015;
    if (event.key === "ArrowUp") center.y -= step;
    if (event.key === "ArrowDown") center.y += step;
    if (event.key === "ArrowLeft") center.x -= step;
    if (event.key === "ArrowRight") center.x += step;
    if (event.key.toLowerCase() === "q") angle -= Math.PI / 36;
    if (event.key.toLowerCase() === "e") angle += Math.PI / 36;
    const extent = Math.hypot(previous.b.x - previous.a.x, previous.b.y - previous.a.y) / 2;
    apply({
      a: { x: center.x - Math.cos(angle) * extent, y: center.y - Math.sin(angle) * extent },
      b: { x: center.x + Math.cos(angle) * extent, y: center.y + Math.sin(angle) * extent },
    });
  }

  const shownCut = draft ?? (firstAnchor ? null : cut);
  return <>
    <div className={styles.playBoard}>
      <span className={styles.boardNote}>a little off is kind of the point.</span>
      <svg viewBox="0 0 1000 1000" className={`${styles.shapeSvg} ${styles.interactive}`} tabIndex={0}
        role="group" aria-label="Cutting board" aria-describedby="anchor-help cut-help"
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel} onLostPointerCapture={cancel}
        onPointerLeave={() => { if (!gesture.current && firstAnchor) setDraft(null); }} onKeyDown={keyboard}>
        <ShapeDrawing challenge={challenge} cut={shownCut} cutState={firstAnchor || drawing ? "preview" : "anchored"} />
        {firstAnchor ? <>
          {draft && <Anchor point={draft.b} label="2" endpoint="b" preview />}
          <Anchor point={firstAnchor} label="1" endpoint="first" />
        </> : shownCut && <><Anchor point={shownCut.a} label="1" endpoint="a" /><Anchor point={shownCut.b} label="2" endpoint="b" /></>}
      </svg>
      <span className={styles.boardBadge}>{targetPercent} / {100 - targetPercent} ?</span>
    </div>
    <p className={styles.feedback} role="status">{message}</p>
    <div className={styles.controls}>
      <button className={styles.secondaryButton} onClick={clear} disabled={(!cut && !firstAnchor) || drawing}>↶ Start over</button>
      <button className={styles.primaryButton} onClick={onConfirm} disabled={!cut || !!firstAnchor || drawing}>Lock it in <span>↗</span></button>
    </div>
    <p className={styles.help} id="anchor-help">Place two anchors. Drag either to adjust. At zero, your latest valid cut counts.</p>
    <details className={styles.keyboardHelp}><summary>Playing with a keyboard?</summary><p id="cut-help">Focus the board. Arrow keys move the cut; Q / E rotate it. Hold Shift for smaller moves. Enter locks it in; Escape starts over.</p></details>
  </>;
}
