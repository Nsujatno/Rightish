import { splitIt } from "./split-it";
import { flashGrid } from "./flash-grid-room";
import { internalClock } from "./internal-clock-room";
import type { MatchSettings } from "./types";

// Add games here as they become playable; host settings use this same catalog.
export const gameRegistry = { "split-it": splitIt, "flash-grid": flashGrid, "internal-clock": internalClock } as const;
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

// Finish every round of one game before moving to the next game in this list.
export function roundSchedule<Id extends string>(ids: readonly Id[], rounds: Partial<Record<Id, number>>): Id[] {
  const unique = [...new Set(ids)];
  const schedule: Id[] = [];
  for (const id of unique) {
    for (let gameRound = 0; gameRound < (rounds[id] ?? 0); gameRound++) schedule.push(id);
  }
  return schedule;
}

export function selectGame(settings: MatchSettings<GameId>, roundIndex: number): GameId {
  // Stored enabledGameIds can reflect checkbox history. Match order follows
  // the catalog so each game's rounds stay together in catalog order.
  const ids = gameCatalog.map((game) => game.id).filter((id) => settings.enabledGameIds.includes(id));
  if (!ids.length) throw new Error("A match needs at least one playable minigame.");
  const rounds = Object.fromEntries(ids.map((id) => [id, settings.gameSettings[id]?.roundCount ?? 0])) as Partial<Record<GameId, number>>;
  const selected = roundSchedule(ids, rounds)[roundIndex];
  if (!selected) throw new Error(`No game configured for round ${roundIndex + 1}.`);
  return selected;
}

export function gameRoundIndex(settings: MatchSettings<GameId>, roundIndex: number): number {
  const id = selectGame(settings, roundIndex);
  let count = 0;
  for (let index = 0; index < roundIndex; index++) if (selectGame(settings, index) === id) count++;
  return count;
}
