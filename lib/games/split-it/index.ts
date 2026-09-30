import type { GameDefinition } from "../types";
import { generateShape, type SplitItChallenge } from "./generator";
import { bisectAtAngle, cutFractions, isCut, type Cut } from "./geometry";

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

function validateAnswer(challenge: SplitItChallenge, input: unknown): input is Cut {
  if (!isCut(input)) return false;
  const fractions = cutFractions(challenge.points, input);
  return fractions[0] > 0.000001 && fractions[1] > 0.000001;
}

export const splitIt: GameDefinition<SplitItChallenge, Cut, SplitItResult> = {
  id: "split-it",
  name: "Split It",
  instructions: "Place two anchors. Aim for two equal halves.",
  defaultDurationSeconds: 20,
  generate: generateShape,
  validateAnswer,
  score(challenge, answer) {
    if (!validateAnswer(challenge, answer)) return { score: 0, cut: null, fractions: null, perfectCut: null };
    const fractions = cutFractions(challenge.points, answer);
    return {
      score: Math.round(1000 * (1 - Math.abs(fractions[0] - fractions[1]))),
      cut: answer,
      fractions,
      perfectCut: bisectAtAngle(challenge.points, answer),
    };
  },
};
