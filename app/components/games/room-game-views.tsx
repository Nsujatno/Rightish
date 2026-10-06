"use client";

import type { ComponentType, ReactNode } from "react";
import type { GameId } from "@/lib/games/registry";
import { defaultSplitItOptions, isPerfectTarget, isSplitItOptions, splitIt, type SplitItOptions, type SplitItResult } from "@/lib/games/split-it";
import type { SplitItChallenge } from "@/lib/games/split-it/generator";
import { formatSplit } from "@/lib/games/split-it/format";
import type { ScoredResult } from "@/lib/games/types";
import { ShapePreview } from "./split-it/shape";
import { SplitItCountdown } from "./split-it/countdown";
import { FlashGridCountdown } from "./flash-grid-countdown";
import { SplitItRound } from "./split-it/round";
import { SplitItReveal } from "./split-it/reveal";
import { FlashGridRoomRound, FlashGridRoomReveal } from "./flash-grid-room";
import { scoreFlashGrid, type FlashGridChallenge, type FlashGridResult } from "@/lib/games/flash-grid";
import { FlashGridBoard } from "./solo-flash-grid";
import { internalClock } from "@/lib/games/internal-clock-room";
import { formatClockSeconds, internalClockRoundLimitMs, type InternalClockChallenge, type InternalClockResult } from "@/lib/games/internal-clock";
import { clockVerdict } from "./internal-clock-presentation";
import { InternalClockCountdown, InternalClockRoomPreview, InternalClockRoomReveal, InternalClockRoomRound, InternalClockRoomWaiting } from "./internal-clock-room";
import { scoreAngleIt, type AngleItChallenge, type AngleItResult } from "@/lib/games/angle-it";
import { AngleItCountdown, AngleItRoomPreview, AngleItRoomReveal, AngleItRoomRound, AngleItRoomWaiting } from "./angle-it-room";

export type RoomGameView = {
  prompt: (options: unknown) => string;
  CountdownArt?: ComponentType<{ count: number }>;
  countdownLabel?: string;
  countdownTitle?: string;
  countdownDescription?: (challenge: unknown) => string;
  countdownGoal?: (challenge: unknown) => string;
  Round: ComponentType<{ challenge: unknown; options: unknown; initialAnswer: unknown;
    onAnswerChange: (value: unknown | null) => void; onConfirm: () => void; serverNow: number; startsAt: string; deadline: string }>;
  heading?: (challenge: unknown, serverNow: number, startsAt: string) => { eyebrow: string; title: string; description: string; seconds?: number };
  result: (challenge: unknown, value: unknown, options: unknown) => ScoredResult;
  preview: (challenge: unknown, result: ScoredResult) => ReactNode;
  waitingPreview?: (challenge: unknown) => ReactNode;
  summary: (result: ScoredResult) => string;
  detail: (challenge: unknown, result: ScoredResult, nickname: string, options: unknown) => ReactNode;
  exact: (result: ScoredResult, options: unknown) => boolean;
  exactBadge: (options: unknown) => string;
  exactMessage?: string;
  exactDetail?: string;
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

const flashGridView: RoomGameView = {
  CountdownArt: FlashGridCountdown,
  countdownLabel: "GET YOUR EYES READY",
  prompt: () => "Remember the glowing squares, then pick them from memory.",
  heading(challenge, serverNow, startsAt) {
    const grid = challenge as FlashGridChallenge;
    const studyEnd = Date.parse(startsAt) + (grid.studySeconds ?? 3) * 1000;
    const studying = serverNow < studyEnd;
    return {
      eyebrow: studying ? "TAKE A GOOD LOOK" : "NOW, WHERE WERE THEY?",
      title: studying ? "Remember these." : "Your turn.",
      description: studying ? "The glowing squares are about to flip away." : "Tap every square you remember. Tap again to undo.",
      seconds: Math.max(0, Math.ceil(((studying ? studyEnd : studyEnd + (grid.recallSeconds ?? 20) * 1000) - serverNow) / 1000)),
    };
  },
  Round: function FlashGridRoundView({ challenge, initialAnswer, serverNow, startsAt, onAnswerChange, onConfirm }) {
    return <FlashGridRoomRound challenge={challenge as FlashGridChallenge} initialAnswer={initialAnswer}
      serverNow={serverNow} startsAt={startsAt} onAnswerChange={onAnswerChange} onConfirm={onConfirm} />;
  },
  result(challenge, value) {
    return value && typeof value === "object" && "score" in value ? value as FlashGridResult
      : scoreFlashGrid(challenge as FlashGridChallenge, null);
  },
  preview(challenge, result) {
    return <FlashGridBoard challenge={challenge as FlashGridChallenge} mode="reveal" result={result as FlashGridResult} />;
  },
  waitingPreview(challenge) {
    return <FlashGridBoard challenge={challenge as FlashGridChallenge} mode="waiting" />;
  },
  summary(result) {
    const grid = result as FlashGridResult;
    return `${grid.correct} found · ${grid.missed} missed · ${grid.extra} extra`;
  },
  detail(challenge, result, nickname) {
    return <FlashGridRoomReveal challenge={challenge as FlashGridChallenge} result={result as FlashGridResult} nickname={nickname} />;
  },
  exact(result) {
    const grid = result as FlashGridResult;
    return grid.correct > 0 && grid.missed === 0 && grid.extra === 0;
  },
  exactBadge() { return "GRID GENIUS"; },
  exactMessage: "Grid genius!",
};

const internalClockView: RoomGameView = {
  CountdownArt: InternalClockCountdown,
  countdownLabel: "NO WATCHES. JUST VIBES.",
  countdownTitle: "Ready your inner clock.",
  countdownDescription(challenge) {
    return `Aim for ${(challenge as InternalClockChallenge).targetSeconds} seconds. The hidden clock starts when this countdown ends.`;
  },
  countdownGoal(challenge) {
    return `TARGET · ${(challenge as InternalClockChallenge).targetSeconds} SECONDS`;
  },
  prompt: () => "Stop the hidden clock when the target time feels right.",
  heading() {
    return { eyebrow: "ROUND OF QUESTIONABLE TIMING", title: "Is it time yet?",
      description: "Everyone started together. Stop when the target feels right." };
  },
  Round: function InternalClockRoundView({ challenge, onAnswerChange, onConfirm }) {
    return <InternalClockRoomRound challenge={challenge as InternalClockChallenge}
      onAnswerChange={onAnswerChange} onConfirm={onConfirm} />;
  },
  result(challenge, value) {
    return value && typeof value === "object" && "score" in value ? value as InternalClockResult
      : internalClock.score(challenge as InternalClockChallenge, null);
  },
  preview(challenge, result) {
    return <InternalClockRoomPreview result={result as InternalClockResult} />;
  },
  waitingPreview(challenge) {
    return <InternalClockRoomWaiting challenge={challenge as InternalClockChallenge} />;
  },
  summary(result) {
    const clock = result as InternalClockResult;
    return clock.elapsedMs >= internalClockRoundLimitMs(clock.targetMs / 1000)
      ? "No stop submitted" : clockVerdict(clock);
  },
  detail(challenge, result, nickname) {
    return <InternalClockRoomReveal result={result as InternalClockResult} nickname={nickname} />;
  },
  exact(result) { return (result as InternalClockResult).score >= 980; },
  exactBadge() { return `${formatClockSeconds(100)}s off or less`; },
  exactMessage: "Clock wizard!",
  exactDetail: "Your brain brought its own stopwatch.",
};

const angleItView: RoomGameView = {
  CountdownArt: AngleItCountdown,
  countdownLabel: "READY YOUR INNER PROTRACTOR",
  countdownTitle: "Give it a little turn.",
  countdownDescription: () => "Match the target degrees when the countdown ends. Everyone gets the same angle.",
  countdownGoal(challenge) { return `TARGET · ${(challenge as AngleItChallenge).targetDegrees}°`; },
  prompt: () => "Drag the hand until the peach angle feels like the target.",
  Round: function AngleItRoundView({ challenge, initialAnswer, onAnswerChange, onConfirm, serverNow, deadline }) {
    return <AngleItRoomRound challenge={challenge as AngleItChallenge} initialAnswer={initialAnswer}
      onAnswerChange={onAnswerChange} onConfirm={onConfirm} serverNow={serverNow} deadline={deadline} />;
  },
  result(challenge, value) {
    return value && typeof value === "object" && "score" in value ? value as AngleItResult
      : scoreAngleIt(challenge as AngleItChallenge, null);
  },
  preview(_challenge, result) { return <AngleItRoomPreview result={result as AngleItResult} />; },
  waitingPreview(challenge) { return <AngleItRoomWaiting challenge={challenge as AngleItChallenge} />; },
  summary(result) {
    const angle = result as AngleItResult;
    return angle.guessDegrees === null ? "No angle submitted" : `${angle.guessDegrees}° · ${Math.abs(angle.differenceDegrees!)}° off`;
  },
  detail(_challenge, result, nickname) { return <AngleItRoomReveal result={result as AngleItResult} nickname={nickname} />; },
  exact(result) {
    const difference = (result as AngleItResult).differenceDegrees;
    return difference !== null && Math.abs(difference) <= 0.5;
  },
  exactBadge: () => "0.5° off or less",
  exactMessage: "Angle ace!",
  exactDetail: "Your inner protractor deserves a little bow.",
};

// A new playable game adds one typed rules entry and one view entry. The room
// engine, server validation, timing, and standings then stay the same.
export const roomGameViews: Record<GameId, RoomGameView> = {
  "split-it": splitItView,
  "flash-grid": flashGridView,
  "internal-clock": internalClockView,
  "angle-it": angleItView,
};
