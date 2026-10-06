import { seededRandom } from "./random";

export const ANGLE_IT_ROUNDS = 5;
export const ANGLE_IT_SECONDS = 20;
export const ANGLE_IT_START = 110;
export const ANGLE_IT_MAX_ROUNDS = 10;
export const ANGLE_IT_MIN_SECONDS = 5;
export const ANGLE_IT_MAX_SECONDS = 60;

export type AngleItChallenge = { seed: string; generatorVersion: 1; targetDegrees: number };
export type AngleItResult = { targetDegrees: number; guessDegrees: number | null; differenceDegrees: number | null; score: number };

function angleCandidates(roundIndex: number, used = new Set<number>()) {
  const step = roundIndex < 2 ? 15 : roundIndex === 2 ? 5 : 1;
  return Array.from({ length: 151 }, (_, offset) => offset + 15)
    .filter((angle) => angle % step === 0 && angle !== 90 && !used.has(angle));
}

// Room rounds receive their own server seed and their index within Angle It.
export function generateAngleItRound(seed: string, roundIndex: number): AngleItChallenge {
  if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= ANGLE_IT_MAX_ROUNDS) {
    throw new RangeError("Angle It supports 1–10 room rounds.");
  }
  const candidates = angleCandidates(roundIndex);
  const targetDegrees = candidates[Math.floor(seededRandom(seed)() * candidates.length)];
  return { seed, generatorVersion: 1, targetDegrees };
}

export function generateAngleItMatch(seed: string): AngleItChallenge[] {
  const random = seededRandom(seed);
  const used = new Set<number>();
  return Array.from({ length: ANGLE_IT_ROUNDS }, (_, index) => {
    // Start with familiar angles, then ask for increasingly awkward estimates.
    const candidates = angleCandidates(index, used);
    const targetDegrees = candidates[Math.floor(random() * candidates.length)];
    used.add(targetDegrees);
    return { seed: `${seed}:round:${index}`, generatorVersion: 1, targetDegrees };
  });
}

export function isAngleItAnswer(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 180;
}

// The horizontal ray points left. The shaded angle opens across the upper half.
export function angleFromPoint(x: number, y: number, pivotX: number, pivotY: number): number {
  return Math.atan2(Math.max(0, pivotY - y), pivotX - x) * 180 / Math.PI;
}

export function scoreAngleIt(challenge: AngleItChallenge, answer: unknown): AngleItResult {
  if (!isAngleItAnswer(answer)) return { targetDegrees: challenge.targetDegrees, guessDegrees: null, differenceDegrees: null, score: 0 };
  const guessDegrees = Math.round(answer * 10) / 10;
  const differenceDegrees = Math.round((guessDegrees - challenge.targetDegrees) * 10) / 10;
  return { targetDegrees: challenge.targetDegrees, guessDegrees, differenceDegrees,
    score: Math.max(0, Math.round(1000 - Math.abs(differenceDegrees) * 20)) };
}
