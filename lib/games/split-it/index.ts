import type { GameDefinition } from "../types";
import { generateShape, type SplitItChallenge } from "./generator";
import { cutAtFraction, cutFractions, isCut, type Cut } from "./geometry";

export type SplitItOptions = { targetPercent: number };
export const defaultSplitItOptions: SplitItOptions = { targetPercent: 50 };
export const splitItLimits = {
  minRounds: 1, maxRounds: 10,
  minDurationSeconds: 5, maxDurationSeconds: 60,
} as const;

export function isSplitItOptions(input: unknown): input is SplitItOptions {
  return !!input && typeof input === "object" && "targetPercent" in input &&
    typeof input.targetPercent === "number" && Number.isInteger(input.targetPercent) &&
    input.targetPercent >= 50 && input.targetPercent <= 80 && input.targetPercent % 5 === 0;
}

export type SplitItResult = {
  score: number;
  cut: Cut | null;
  fractions: [number, number] | null;
  perfectCut: Cut | null;
};

export function isPerfectSplit(fractions: SplitItResult["fractions"]) {
  // Allow numerical clipping noise, without treating rounded 50.0% or 1,000
  // points as exact: those can also describe a slightly unequal split.
  return fractions !== null && Math.abs(fractions[0] - fractions[1]) <= 1e-9;
}

export function isPerfectTarget(fractions: SplitItResult["fractions"], targetPercent: number) {
  return fractions !== null && Math.abs(Math.min(...fractions) - (100 - targetPercent) / 100) <= 1e-9;
}

function validateAnswer(challenge: SplitItChallenge, input: unknown): input is Cut {
  if (!isCut(input)) return false;
  const fractions = cutFractions(challenge.points, input);
  return fractions[0] > 0.000001 && fractions[1] > 0.000001;
}

export const splitIt: GameDefinition<SplitItChallenge, Cut, SplitItResult, SplitItOptions> = {
  id: "split-it",
  name: "Split It",
  instructions: "Place two anchors. Aim for the target split.",
  defaultRoundCount: 5,
  defaultDurationSeconds: 20,
  limits: splitItLimits,
  defaultOptions: defaultSplitItOptions,
  validateOptions: isSplitItOptions,
  generate: generateShape,
  validateAnswer,
  score(challenge, answer, options = defaultSplitItOptions) {
    if (!validateAnswer(challenge, answer)) return { score: 0, cut: null, fractions: null, perfectCut: null };
    const fractions = cutFractions(challenge.points, answer);
    const smallerTarget = (100 - options.targetPercent) / 100;
    const smallerActual = Math.min(...fractions);
    const closerSide = Math.abs(fractions[0] - smallerTarget) < Math.abs(fractions[0] - (1 - smallerTarget))
      ? smallerTarget : 1 - smallerTarget;
    return {
      score: Math.max(0, Math.round(1000 * (1 - Math.abs(smallerActual - smallerTarget) / smallerTarget))),
      cut: answer,
      fractions,
      perfectCut: cutAtFraction(challenge.points, answer, closerSide),
    };
  },
};
