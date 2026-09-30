"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { roundSeed } from "@/lib/games/random";
import type { GameDefinition, MatchSettings, ScoredResult } from "@/lib/games/types";

export type SoloRound<Challenge, Result> = { challenge: Challenge; result: Result; roundIndex: number };
type SoloState<Challenge, Result> = {
  phase: "ready" | "playing" | "reveal" | "finished";
  matchSeed: string;
  roundIndex: number;
  challenge: Challenge;
  deadline: number | null;
  rounds: SoloRound<Challenge, Result>[];
};

export function useSoloMatch<Challenge, Answer, Result extends ScoredResult>(
  game: GameDefinition<Challenge, Answer, Result>,
  settings: MatchSettings,
  initialSeed?: string,
) {
  const [state, setState] = useState<SoloState<Challenge, Result>>(() => ({
    phase: "ready", matchSeed: initialSeed ?? "preview", roundIndex: 0,
    challenge: game.generate(roundSeed(initialSeed ?? "preview", 0)), deadline: null, rounds: [],
  }));
  const [now, setNow] = useState(0);
  const active = useRef<{ challenge: Challenge; answer: Answer | null; deadline: number; roundIndex: number } | null>(null);

  const finish = useCallback(() => {
    const round = active.current;
    if (!round) return;
    active.current = null; // One completion even if confirm and the deadline coincide.
    const completed = { challenge: round.challenge, result: game.score(round.challenge, round.answer), roundIndex: round.roundIndex };
    setState((current) => ({ ...current, phase: "reveal", deadline: null, rounds: [...current.rounds, completed] }));
  }, [game]);

  useEffect(() => {
    if (state.phase !== "playing") return;
    const tick = () => {
      const time = Date.now();
      setNow(time);
      if (active.current && time >= active.current.deadline) finish();
    };
    const interval = window.setInterval(tick, 100);
    // Background tabs may throttle intervals, so check the absolute deadline on return.
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [state.phase, state.deadline, finish]);

  function begin(matchSeed: string, roundIndex: number, rounds: SoloRound<Challenge, Result>[]) {
    const challenge = game.generate(roundSeed(matchSeed, roundIndex));
    const time = Date.now();
    const deadline = time + settings.durationSeconds * 1000;
    active.current = { challenge, answer: null, deadline, roundIndex };
    setNow(time);
    setState({ phase: "playing", matchSeed, roundIndex, challenge, deadline, rounds });
  }

  function start(replaySeed?: string) {
    const values = crypto.getRandomValues(new Uint32Array(4));
    begin(replaySeed ?? Array.from(values, (value) => value.toString(36)).join("-"), 0, []);
  }

  function changeAnswer(answer: Answer | null) {
    const round = active.current;
    if (!round) return;
    if (Date.now() >= round.deadline) { finish(); return; }
    if (answer === null || game.validateAnswer(round.challenge, answer)) round.answer = answer;
  }

  function confirm() {
    const round = active.current;
    if (!round) return;
    if (Date.now() >= round.deadline || round.answer !== null) finish();
  }

  function next() {
    if (state.phase !== "reveal") return;
    if (state.roundIndex + 1 >= settings.roundCount) setState((current) => ({ ...current, phase: "finished" }));
    else begin(state.matchSeed, state.roundIndex + 1, state.rounds);
  }

  return {
    ...state, start, changeAnswer, confirm, next,
    remainingSeconds: state.deadline === null ? settings.durationSeconds : Math.max(0, Math.ceil((state.deadline - now) / 1000)),
    totalScore: state.rounds.reduce((sum, round) => sum + round.result.score, 0),
    latestRound: state.rounds.at(-1),
  };
}
