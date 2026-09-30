import { splitIt } from "./split-it";
import type { MatchSettings } from "./types";

// Add games here as they become playable; host settings use this same catalog.
export const gameRegistry = { "split-it": splitIt } as const;
export type GameId = keyof typeof gameRegistry;
export const gameCatalog = Object.values(gameRegistry).map(({ id, name, instructions, defaultRoundCount, defaultDurationSeconds, limits }) => ({
  id: id as GameId, name, instructions, defaultRoundCount, defaultDurationSeconds, limits,
}));

export const defaultMatchSettings: MatchSettings<GameId> = {
  enabledGameIds: ["split-it"],
  gameSettings: { "split-it": {
    roundCount: splitIt.defaultRoundCount,
    durationSeconds: splitIt.defaultDurationSeconds,
    options: splitIt.defaultOptions,
  } },
};

export function matchRoundCount(settings: MatchSettings<GameId>): number {
  return settings.enabledGameIds.reduce((total, id) => total + (settings.gameSettings[id]?.roundCount ?? 0), 0);
}

// Each game contributes its own configured number of rounds, interleaved in host selection order.
export function roundSchedule<Id extends string>(ids: readonly Id[], rounds: Partial<Record<Id, number>>): Id[] {
  const unique = [...new Set(ids)];
  const schedule: Id[] = [];
  const maxRounds = Math.max(0, ...unique.map((id) => rounds[id] ?? 0));
  for (let gameRound = 0; gameRound < maxRounds; gameRound++) {
    for (const id of unique) if (gameRound < (rounds[id] ?? 0)) schedule.push(id);
  }
  return schedule;
}

export function selectGame(settings: MatchSettings<GameId>, roundIndex: number): GameId {
  const ids = settings.enabledGameIds.filter((id) => Object.hasOwn(gameRegistry, id));
  if (!ids.length) throw new Error("A match needs at least one playable minigame.");
  const rounds = Object.fromEntries(ids.map((id) => [id, settings.gameSettings[id]?.roundCount ?? 0])) as Partial<Record<GameId, number>>;
  const selected = roundSchedule(ids, rounds)[roundIndex];
  if (!selected) throw new Error(`No game configured for round ${roundIndex + 1}.`);
  return selected;
}
