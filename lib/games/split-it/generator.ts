import { seededRandom } from "../random";
import type { Point } from "./geometry";

export const SHAPE_GENERATOR_VERSION = 1;
export type ShapeFamily = "pebble" | "lobes" | "dent" | "angular";
export type SplitItChallenge = {
  seed: string;
  generatorVersion: typeof SHAPE_GENERATOR_VERSION;
  family: ShapeFamily;
  points: Point[];
  color: string;
};

// Match the pastel player colors already used by the multiplayer lobby.
const colors = ["#f5d58d", "#c4d9bf", "#c6d3ee", "#efb9a7", "#dcc8e7", "#b8ded8"];
const TAU = Math.PI * 2;

/**
 * Positive radii in angular order guarantee one simple connected silhouette.
 * Harmonics, broad dents, control points and affine transforms vary its character.
 * The sampled polygon is both the displayed boundary and the scored boundary.
 * Freeze v1 once multiplayer ships; a new recipe must get a new version.
 */
export function generateShape(seed: string): SplitItChallenge {
  const random = seededRandom(`split-it:v${SHAPE_GENERATOR_VERSION}:${seed}`);
  const range = (low: number, high: number) => low + random() * (high - low);
  const family = (["pebble", "lobes", "dent", "angular"] as const)[Math.floor(random() * 4)];
  const rotation = range(0, TAU);
  const stretch = range(0.58, 1.35);
  const shear = range(-0.25, 0.25);
  const phase1 = range(0, TAU);
  const phase2 = range(0, TAU);
  const phase3 = range(0, TAU);
  const asymmetry = range(0.12, 0.3);
  const frequency = Math.floor(range(2, 5));
  const lobes = family === "lobes" ? range(0.24, 0.38) : range(0.06, 0.17);
  const ripple = range(0.03, 0.09);
  const dentAngle = range(0, TAU);
  const dentDepth = family === "dent" ? range(0.48, 0.68) : range(0, 0.22);
  const dentWidth = range(0.3, 0.58);
  const knotCount = Math.floor(range(6, 11));
  const knotRadii = Array.from({ length: knotCount }, () => range(0.6, 1.4));
  const points: Point[] = [];

  for (let index = 0; index < 256; index++) {
    const angle = (index / 256) * TAU;
    const difference = Math.atan2(Math.sin(angle - dentAngle), Math.cos(angle - dentAngle));
    let radius = 1 + asymmetry * Math.cos(angle + phase1) +
      lobes * Math.sin(frequency * angle + phase2) + ripple * Math.cos(5 * angle + phase3) -
      dentDepth * Math.exp(-(difference * difference) / (2 * dentWidth * dentWidth));
    if (family === "angular") {
      // Intersect a ray with an irregular control polygon, preserving straight edges.
      const segment = (angle / TAU) * knotCount;
      const knot = Math.floor(segment);
      const aAngle = knot * TAU / knotCount;
      const bAngle = (knot + 1) * TAU / knotCount;
      const ra = knotRadii[knot];
      const rb = knotRadii[(knot + 1) % knotCount];
      radius = ra * rb * Math.sin(bAngle - aAngle) /
        (rb * Math.sin(bAngle - angle) + ra * Math.sin(angle - aAngle));
    }
    radius = Math.max(0.42, radius);
    const x = Math.cos(angle) * radius * stretch;
    const y = Math.sin(angle) * radius;
    const sx = x + shear * y;
    points.push({ x: sx * Math.cos(rotation) - y * Math.sin(rotation), y: sx * Math.sin(rotation) + y * Math.cos(rotation) });
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const scale = 0.69 / Math.max(maxX - minX, maxY - minY);
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  // Tiny position changes avoid treating the board center as a universal answer.
  const offsetX = range(-0.025, 0.025);
  const offsetY = range(-0.025, 0.025);
  return {
    seed,
    generatorVersion: SHAPE_GENERATOR_VERSION,
    family,
    color: colors[Math.floor(random() * colors.length)],
    points: points.map((point) => ({
      x: Number((0.5 + offsetX + (point.x - centerX) * scale).toFixed(6)),
      y: Number((0.5 + offsetY + (point.y - centerY) * scale).toFixed(6)),
    })),
  };
}
