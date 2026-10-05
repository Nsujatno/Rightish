import type { GameDefinition } from "./types";
import {
  defaultFlashGridOptions, generateFlashGridForSize, isFlashGridAnswer, isFlashGridOptions,
  scoreFlashGrid, type FlashGridChallenge, type FlashGridOptions, type FlashGridResult,
} from "./flash-grid";

export const flashGrid: GameDefinition<FlashGridChallenge, number[], FlashGridResult, FlashGridOptions> = {
  id: "flash-grid",
  name: "Flash Grid",
  instructions: "Remember the glowing squares, then pick them from memory.",
  defaultRoundCount: 5,
  defaultDurationSeconds: 23,
  limits: { minRounds: 1, maxRounds: 10, minDurationSeconds: 6, maxDurationSeconds: 75 },
  defaultOptions: defaultFlashGridOptions,
  validateOptions: isFlashGridOptions,
  generate(seed, options = defaultFlashGridOptions, gameRoundIndex = 0) {
    const round = options.rounds[gameRoundIndex];
    if (!round) throw new RangeError("Flash Grid round is not configured.");
    return {
      ...generateFlashGridForSize(seed, round.size),
      studySeconds: round.studySeconds,
      recallSeconds: round.recallSeconds,
      durationSeconds: round.studySeconds + round.recallSeconds,
    };
  },
  validateAnswer: isFlashGridAnswer,
  score: scoreFlashGrid,
};
