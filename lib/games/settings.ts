import { gameRegistry, matchRoundCount, type GameId } from "./registry";
import type { GameDefinition, GameMatchSettings, MatchSettings, ScoredResult } from "./types";

type RuntimeGame = GameDefinition<unknown, unknown, ScoredResult, unknown>;

export function getGame(id: string): RuntimeGame | null {
  return Object.hasOwn(gameRegistry, id)
    ? gameRegistry[id as GameId] as unknown as RuntimeGame
    : null;
}

export function parseMatchSettings(input: unknown): MatchSettings<GameId> | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  // Rooms created before per-game settings keep the old JSON shape in Postgres.
  if (!value.gameSettings && Array.isArray(value.enabledGameIds)) {
    const legacyOptions = value.gameOptions;
    if (!legacyOptions || typeof legacyOptions !== "object" || Array.isArray(legacyOptions)) return null;
    const gameSettings: Record<string, unknown> = {};
    for (const id of value.enabledGameIds) {
      if (typeof id !== "string") return null;
      const game = getGame(id);
      if (!game) return null;
      gameSettings[id] = {
        roundCount: value.roundCount,
        durationSeconds: value.durationSeconds,
        options: (legacyOptions as Record<string, unknown>)[id] ?? game.defaultOptions,
      };
    }
    return parseMatchSettings({ enabledGameIds: value.enabledGameIds, gameSettings });
  }
  if (!Array.isArray(value.enabledGameIds) || value.enabledGameIds.length < 1 ||
    value.enabledGameIds.length > Object.keys(gameRegistry).length ||
    !value.gameSettings || typeof value.gameSettings !== "object" || Array.isArray(value.gameSettings)) return null;

  const ids = value.enabledGameIds;
  if (ids.some((id) => typeof id !== "string" || !getGame(id)) || new Set(ids).size !== ids.length) return null;
  const supplied = value.gameSettings as Record<string, unknown>;
  const gameSettings: Partial<Record<GameId, GameMatchSettings>> = {};
  for (const id of ids as GameId[]) {
    const game = getGame(id)!;
    const config = supplied[id];
    if (!config || typeof config !== "object" || Array.isArray(config)) return null;
    const { roundCount, durationSeconds, options } = config as Record<string, unknown>;
    if (!Number.isInteger(roundCount) || (roundCount as number) < game.limits.minRounds ||
      (roundCount as number) > game.limits.maxRounds ||
      !Number.isInteger(durationSeconds) || (durationSeconds as number) < game.limits.minDurationSeconds ||
      (durationSeconds as number) > game.limits.maxDurationSeconds || !game.validateOptions(options)) return null;
    gameSettings[id] = { roundCount: roundCount as number, durationSeconds: durationSeconds as number, options };
  }
  return {
    enabledGameIds: ids as GameId[],
    gameSettings,
  };
}

export function hasPerGameSettings(input: unknown): boolean {
  return !!input && typeof input === "object" && "gameSettings" in input &&
    !!(input as Record<string, unknown>).gameSettings;
}

// Keep the old fields while deployed SQL functions may still read them. The
// current functions use gameSettings; the old ones only support one game timer.
export function settingsForDatabase(settings: MatchSettings<GameId>) {
  const first = settings.gameSettings[settings.enabledGameIds[0]]!;
  return {
    ...settings,
    roundCount: matchRoundCount(settings),
    durationSeconds: first.durationSeconds,
    gameOptions: Object.fromEntries(settings.enabledGameIds.map((id) => [id, settings.gameSettings[id]!.options])),
  };
}

export function gameSettingsFor(settings: MatchSettings, id: string): GameMatchSettings {
  const game = getGame(id);
  if (!game) throw new Error(`Unknown minigame: ${id}`);
  const config = settings.gameSettings[id];
  if (!config || !game.validateOptions(config.options)) throw new Error(`Invalid settings for ${id}`);
  return config;
}

export function gameOptionsFor(settings: MatchSettings, id: string): unknown {
  return gameSettingsFor(settings, id).options;
}
