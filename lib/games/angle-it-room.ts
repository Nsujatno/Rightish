import type { GameDefinition } from "./types";
import {
  ANGLE_IT_MAX_ROUNDS, ANGLE_IT_MAX_SECONDS, ANGLE_IT_MIN_SECONDS, ANGLE_IT_ROUNDS, ANGLE_IT_SECONDS,
  generateAngleItRound, isAngleItAnswer, scoreAngleIt, type AngleItChallenge, type AngleItResult,
} from "./angle-it";

// Random targets have no host-controlled options; reject invented settings.
export function isAngleItOptions(input: unknown): input is Record<string, never> {
  return !!input && typeof input === "object" && !Array.isArray(input) && Object.keys(input).length === 0;
}

export const angleIt: GameDefinition<AngleItChallenge, number, AngleItResult, Record<string, never>> = {
  id: "angle-it",
  name: "Angle It",
  instructions: "Rotate the hand until the shaded angle matches the target degrees.",
  defaultRoundCount: ANGLE_IT_ROUNDS,
  defaultDurationSeconds: ANGLE_IT_SECONDS,
  limits: { minRounds: 1, maxRounds: ANGLE_IT_MAX_ROUNDS,
    minDurationSeconds: ANGLE_IT_MIN_SECONDS, maxDurationSeconds: ANGLE_IT_MAX_SECONDS },
  defaultOptions: {},
  validateOptions: isAngleItOptions,
  generate(seed, _options, gameRoundIndex = 0) { return generateAngleItRound(seed, gameRoundIndex); },
  validateAnswer(_challenge, input): input is number { return isAngleItAnswer(input); },
  score: scoreAngleIt,
};
