export const INTERNAL_CLOCK_TARGETS = [3, 4, 5, 6, 8] as const;
export const INTERNAL_CLOCK_GRACE_SECONDS = 5;
export const INTERNAL_CLOCK_MIN_TARGET_SECONDS = 1;
export const INTERNAL_CLOCK_MAX_TARGET_SECONDS = 30;
export const INTERNAL_CLOCK_MAX_ROUNDS = 10;

export type InternalClockRoundOptions = { targetSeconds: number };
export type InternalClockOptions = { rounds: InternalClockRoundOptions[] };
export const defaultInternalClockOptions: InternalClockOptions = {
  rounds: INTERNAL_CLOCK_TARGETS.map((targetSeconds) => ({ targetSeconds })),
};

export function isInternalClockOptions(value: unknown): value is InternalClockOptions {
  if (!value || typeof value !== "object" || Array.isArray(value) || !("rounds" in value) ||
    !Array.isArray(value.rounds) || value.rounds.length < 1 || value.rounds.length > INTERNAL_CLOCK_MAX_ROUNDS) return false;
  return value.rounds.every((round: unknown) => {
    if (!round || typeof round !== "object" || Array.isArray(round) || !("targetSeconds" in round)) return false;
    const target = round.targetSeconds;
    return Number.isInteger(target) && (target as number) >= INTERNAL_CLOCK_MIN_TARGET_SECONDS &&
      (target as number) <= INTERNAL_CLOCK_MAX_TARGET_SECONDS;
  });
}

export function internalClockRoundLimitMs(targetSeconds: number): number {
  if (!Number.isFinite(targetSeconds) || targetSeconds <= 0) throw new RangeError("Invalid Internal Clock target.");
  return (targetSeconds + INTERNAL_CLOCK_GRACE_SECONDS) * 1000;
}

export type InternalClockResult = {
  targetMs: number;
  elapsedMs: number;
  differenceMs: number;
  score: number;
};

export type InternalClockChallenge = {
  seed: string;
  generatorVersion: 1;
  targetSeconds: number;
  durationSeconds: number;
};

export function roomClockElapsedMs(startsAt: string, receivedAtMs: number, targetSeconds: number): number {
  const startMs = Date.parse(startsAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(receivedAtMs)) throw new RangeError("Invalid Internal Clock timestamp.");
  return Math.min(internalClockRoundLimitMs(targetSeconds), Math.max(0, Math.round(receivedAtMs - startMs)));
}

export function scoreInternalClock(targetSeconds: number, elapsedMs: number): InternalClockResult {
  if (!Number.isFinite(targetSeconds) || targetSeconds <= 0 ||
    !Number.isFinite(elapsedMs) || elapsedMs < 0) throw new RangeError("Invalid Internal Clock time.");
  const targetMs = targetSeconds * 1000;
  const differenceMs = elapsedMs - targetMs;
  // Each full second away from the target costs 200 of the 1,000 points.
  return {
    targetMs,
    elapsedMs,
    differenceMs,
    score: Math.max(0, Math.round(1000 - Math.abs(differenceMs) / 5)),
  };
}

export function formatClockSeconds(milliseconds: number): string {
  return (milliseconds / 1000).toFixed(2);
}
