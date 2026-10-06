import type { GameDefinition } from "./types";
import {
  defaultInternalClockOptions, internalClockRoundLimitMs, isInternalClockOptions, scoreInternalClock,
  type InternalClockChallenge, type InternalClockOptions, type InternalClockResult,
} from "./internal-clock";

export const internalClock: GameDefinition<InternalClockChallenge, number, InternalClockResult, InternalClockOptions> = {
  id: "internal-clock",
  name: "Internal Clock",
  instructions: "Stop a hidden clock when the target time feels right.",
  defaultRoundCount: defaultInternalClockOptions.rounds.length,
  // Per-round deadlines come from the challenge and migration 007.
  defaultDurationSeconds: 8,
  limits: { minRounds: 1, maxRounds: 10, minDurationSeconds: 8, maxDurationSeconds: 8 },
  defaultOptions: defaultInternalClockOptions,
  validateOptions: isInternalClockOptions,
  generate(seed, options = defaultInternalClockOptions, gameRoundIndex = 0) {
    const round = options.rounds[gameRoundIndex];
    if (!round) throw new RangeError("Internal Clock round is not configured.");
    return { seed, generatorVersion: 1, targetSeconds: round.targetSeconds,
      durationSeconds: internalClockRoundLimitMs(round.targetSeconds) / 1000 };
  },
  validateAnswer(challenge, input): input is number {
    return Number.isInteger(input) && (input as number) >= 0 &&
      (input as number) <= internalClockRoundLimitMs(challenge.targetSeconds);
  },
  score(challenge, answer) {
    return scoreInternalClock(challenge.targetSeconds,
      answer === null ? internalClockRoundLimitMs(challenge.targetSeconds) : answer);
  },
};
