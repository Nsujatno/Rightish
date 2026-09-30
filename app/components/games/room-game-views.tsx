"use client";

import type { ComponentType, ReactNode } from "react";
import type { GameId } from "@/lib/games/registry";
import { defaultSplitItOptions, isPerfectTarget, isSplitItOptions, splitIt, type SplitItOptions, type SplitItResult } from "@/lib/games/split-it";
import type { SplitItChallenge } from "@/lib/games/split-it/generator";
import { formatSplit } from "@/lib/games/split-it/format";
import type { ScoredResult } from "@/lib/games/types";
import { ShapePreview } from "./split-it/shape";
import { SplitItCountdown } from "./split-it/countdown";
import { SplitItRound } from "./split-it/round";
import { SplitItReveal } from "./split-it/reveal";

export type RoomGameView = {
  prompt: (options: unknown) => string;
  CountdownArt?: ComponentType<{ count: number }>;
  countdownLabel?: string;
  Round: ComponentType<{ challenge: unknown; options: unknown; initialAnswer: unknown;
    onAnswerChange: (value: unknown | null) => void; onConfirm: () => void }>;
  result: (challenge: unknown, value: unknown, options: unknown) => ScoredResult;
  preview: (challenge: unknown, result: ScoredResult) => ReactNode;
  summary: (result: ScoredResult) => string;
  detail: (challenge: unknown, result: ScoredResult, nickname: string, options: unknown) => ReactNode;
  exact: (result: ScoredResult, options: unknown) => boolean;
  exactBadge: (options: unknown) => string;
};

function splitOptions(value: unknown): SplitItOptions {
  return isSplitItOptions(value) ? value : defaultSplitItOptions;
}

const splitItView: RoomGameView = {
  CountdownArt: SplitItCountdown,
  countdownLabel: "WATCH IT TAKE SHAPE",
  prompt(options) {
    const target = splitOptions(options).targetPercent;
    return `Place two anchors. Aim for ${target} / ${100 - target}.`;
  },
  Round: function SplitItRoomRound({ challenge, options, initialAnswer, onAnswerChange, onConfirm }) {
    return <SplitItRound challenge={challenge as SplitItChallenge} targetPercent={splitOptions(options).targetPercent}
      initialAnswer={initialAnswer as SplitItResult["cut"]} onAnswerChange={onAnswerChange} onConfirm={onConfirm} />;
  },
  result(challenge, value, options) {
    return value && typeof value === "object" && "score" in value
      ? value as SplitItResult
      : splitIt.score(challenge as SplitItChallenge, null, splitOptions(options));
  },
  preview(challenge, result) {
    return <ShapePreview challenge={challenge as SplitItChallenge} result={result as SplitItResult} mini />;
  },
  summary(result) {
    const fractions = (result as SplitItResult).fractions;
    return fractions ? `${formatSplit(fractions).join("% / ")}%` : "No cut submitted";
  },
  detail(challenge, result, nickname, options) {
    return <SplitItReveal challenge={challenge as SplitItChallenge} result={result as SplitItResult}
      nickname={nickname} targetPercent={splitOptions(options).targetPercent} />;
  },
  exact(result, options) {
    return isPerfectTarget((result as SplitItResult).fractions, splitOptions(options).targetPercent);
  },
  exactBadge(options) {
    const target = splitOptions(options).targetPercent;
    return `${target} / ${100 - target}`;
  },
};

// A new playable game adds one typed rules entry and one view entry. The room
// engine, server validation, timing, and standings then stay the same.
export const roomGameViews: Record<GameId, RoomGameView> = {
  "split-it": splitItView,
};
