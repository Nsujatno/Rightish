"use client";

import { useEffect, useRef } from "react";
import { useMotionPreference } from "@/lib/preferences/client";
import styles from "../games.module.css";

type Point = { x: number; y: number };

// Each outline is one closed shape, so the yellow silhouette can become the
// numerals themselves instead of swapping art behind a separate number.
const outlines = [
  "M100 17C122 12 140 22 146 35C165 32 179 43 175 61C189 74 183 94 174 103C181 120 170 139 151 141C140 159 119 161 102 151C84 164 64 156 57 142C34 145 20 126 29 109C13 95 17 78 31 67C26 49 41 35 60 37C68 20 83 16 100 17Z",
  "M60 44C78 22 115 20 138 35C160 49 160 78 137 95C163 108 165 137 146 155C124 176 81 175 58 153C51 146 53 137 61 131C69 124 77 127 83 133C97 146 123 148 131 135C143 117 124 105 106 106L90 106C80 106 76 100 76 92C76 83 81 79 90 79L107 79C127 79 142 68 130 55C120 42 96 43 83 55C77 61 67 64 60 57C54 52 55 48 60 44Z",
  "M59 47C76 23 113 20 138 36C164 53 162 89 144 107C131 121 112 130 88 148L145 148C155 148 161 154 161 162C161 171 154 176 145 176L57 176C47 176 42 169 43 160C44 149 50 144 62 134L113 94C128 82 136 70 131 58C125 43 96 41 85 57C79 65 69 67 62 61C55 55 55 52 59 47Z",
  "M101 27C110 21 119 23 123 32L123 149L145 149C153 149 158 155 158 163C158 171 153 176 145 176L64 176C56 176 51 171 51 163C51 155 56 149 64 149L87 149L87 66L74 75C66 80 58 78 53 71C48 64 50 55 58 50Z",
] as const;

const sampleCount = 96;

function sample(path: SVGPathElement): Point[] {
  const length = path.getTotalLength();
  return Array.from({ length: sampleCount }, (_, index) => {
    const point = path.getPointAtLength(length * index / sampleCount);
    return { x: point.x, y: point.y };
  });
}

function pathFrom(points: Point[]) {
  return `M${points.map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join("L")}Z`;
}

function alignPoints(from: Point[], target: Point[]) {
  let bestShift = 0;
  let bestDistance = Infinity;
  for (let shift = 0; shift < sampleCount; shift++) {
    let distance = 0;
    for (let index = 0; index < sampleCount; index++) {
      const a = from[index];
      const b = target[(index + shift) % sampleCount];
      distance += (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      bestShift = shift;
    }
  }
  return target.map((_, index) => target[(index + bestShift) % sampleCount]);
}

export function SplitItCountdown({ count }: { count: number }) {
  const { paused } = useMotionPreference();
  const sources = useRef<(SVGPathElement | null)[]>([]);
  const displayed = useRef<SVGPathElement | null>(null);
  const current = useRef<Point[] | null>(null);

  useEffect(() => {
    if (sources.current.some((source) => !source) || sources.current.length !== outlines.length) return;
    const sampled = sources.current.map((source) => sample(source!));
    // Outlines are ordered blob, 3, 2, 1; the timer counts down from 3.
    const targetIndex = 4 - Math.max(1, Math.min(3, count));
    const target = sampled[targetIndex];
    if (paused) {
      current.current = target;
      displayed.current?.setAttribute("d", outlines[targetIndex]);
      return;
    }

    const from = current.current ?? sampled[0];
    const alignedTarget = alignPoints(from, target);
    const started = performance.now();
    let frame = 0;
    const animate = (time: number) => {
      const progress = Math.min(1, (time - started) / 680);
      const eased = 1 - Math.pow(1 - progress, 3);
      const points = from.map((point, index) => ({
        x: point.x + (alignedTarget[index].x - point.x) * eased,
        y: point.y + (alignedTarget[index].y - point.y) * eased,
      }));
      current.current = points;
      displayed.current?.setAttribute("d", pathFrom(points));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [count, paused]);

  return <div className={styles.splitCountdown}>
    <svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
      <defs>{outlines.map((outline, index) => <path key={index} d={outline}
        ref={(node) => { sources.current[index] = node; }} />)}</defs>
      <path ref={displayed} d={outlines[0]} fill="#F6BF55" />
    </svg>
    <span className={styles.splitCountdownAccessible}>{count}</span>
  </div>;
}
