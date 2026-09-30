import { seededRandom } from "./random";
import { splitIt } from "./split-it";
import type { MatchSettings } from "./types";

// Add games here as they become playable; host settings use this same catalog.
export const gameRegistry = { "split-it": splitIt } as const;
export type GameId = keyof typeof gameRegistry;
export const gameCatalog = Object.values(gameRegistry).map(({ id, name, instructions, defaultDurationSeconds }) => ({
  id: id as GameId, name, instructions, defaultDurationSeconds,
}));

export const defaultMatchSettings: MatchSettings<GameId> = {
  enabledGameIds: ["split-it"],
  roundCount: 5,
  durationSeconds: 20,
};

export function selectGame(enabledGameIds: readonly GameId[], seed: string): GameId {
  const ids = [...new Set(enabledGameIds)].filter((id) => Object.hasOwn(gameRegistry, id)).sort();
  if (!ids.length) throw new Error("A match needs at least one playable minigame.");
  return ids[Math.floor(seededRandom(`game:${seed}`)() * ids.length)];
}
