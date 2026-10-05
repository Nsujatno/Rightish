import { seededRandom } from "./random";

export const FLASH_GRID_SIZES = [3, 4, 5, 6, 7] as const;
export const FLASH_GRID_LIT_COUNTS = [3, 5, 7, 9, 11] as const;
export const FLASH_GRID_STUDY_SECONDS = 3;
export const FLASH_GRID_RECALL_SECONDS = 20;
export const FLASH_GRID_MIN_STUDY_SECONDS = 1;
export const FLASH_GRID_MAX_STUDY_SECONDS = 15;
export const FLASH_GRID_MIN_RECALL_SECONDS = 5;
export const FLASH_GRID_MAX_RECALL_SECONDS = 60;
export const FLASH_GRID_MAX_ROUNDS = 10;

export type FlashGridRoundOptions = { size: number; studySeconds: number; recallSeconds: number };
export type FlashGridOptions = { rounds: FlashGridRoundOptions[] };
export const defaultFlashGridOptions: FlashGridOptions = {
  rounds: FLASH_GRID_SIZES.map((size) => ({ size, studySeconds: FLASH_GRID_STUDY_SECONDS, recallSeconds: FLASH_GRID_RECALL_SECONDS })),
};

export function isFlashGridRoundOptions(value: unknown): value is FlashGridRoundOptions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const round = value as Record<string, unknown>;
  return Number.isInteger(round.size) && (round.size as number) >= 3 && (round.size as number) <= 7 &&
    Number.isInteger(round.studySeconds) && (round.studySeconds as number) >= FLASH_GRID_MIN_STUDY_SECONDS &&
    (round.studySeconds as number) <= FLASH_GRID_MAX_STUDY_SECONDS &&
    Number.isInteger(round.recallSeconds) && (round.recallSeconds as number) >= FLASH_GRID_MIN_RECALL_SECONDS &&
    (round.recallSeconds as number) <= FLASH_GRID_MAX_RECALL_SECONDS;
}

export function isFlashGridOptions(value: unknown): value is FlashGridOptions {
  return !!value && typeof value === "object" && !Array.isArray(value) && "rounds" in value &&
    Array.isArray(value.rounds) && value.rounds.length >= 1 && value.rounds.length <= FLASH_GRID_MAX_ROUNDS &&
    value.rounds.every(isFlashGridRoundOptions);
}

export type FlashGridChallenge = {
  seed: string;
  generatorVersion: 1;
  size: number;
  litCells: number[];
  studySeconds?: number;
  recallSeconds?: number;
  durationSeconds?: number;
};

export type FlashGridResult = {
  score: number;
  selectedCells: number[];
  correct: number;
  missed: number;
  extra: number;
};

export function generateFlashGrid(seed: string, roundIndex: number): FlashGridChallenge {
  if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= FLASH_GRID_SIZES.length) {
    throw new RangeError("Flash Grid has five rounds.");
  }
  return generateFlashGridForSize(seed, FLASH_GRID_SIZES[roundIndex]);
}

export function generateFlashGridForSize(seed: string, size: number): FlashGridChallenge {
  if (!Number.isInteger(size) || size < 3 || size > 7) throw new RangeError("Flash Grid size must be 3–7.");
  const cells = Array.from({ length: size * size }, (_, index) => index);
  const random = seededRandom(seed);
  for (let index = cells.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [cells[index], cells[swap]] = [cells[swap], cells[index]];
  }
  return { seed, generatorVersion: 1, size, litCells: cells.slice(0, 2 * size - 3).sort((a, b) => a - b) };
}

export function isFlashGridAnswer(challenge: FlashGridChallenge, input: unknown): input is number[] {
  return Array.isArray(input) && input.length <= challenge.size * challenge.size &&
    input.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < challenge.size * challenge.size) &&
    new Set(input).size === input.length;
}

export function scoreFlashGrid(challenge: FlashGridChallenge, answer: unknown): FlashGridResult {
  const selectedCells = isFlashGridAnswer(challenge, answer) ? [...answer].sort((a, b) => a - b) : [];
  const selected = new Set(selectedCells);
  const lit = new Set(challenge.litCells);
  const correct = challenge.litCells.filter((cell) => selected.has(cell)).length;
  const extra = selectedCells.filter((cell) => !lit.has(cell)).length;
  const missed = challenge.litCells.length - correct;
  return {
    score: Math.max(0, Math.round(1000 * (correct - extra) / challenge.litCells.length)),
    selectedCells, correct, missed, extra,
  };
}
