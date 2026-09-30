export function resolveMotionPreference(savedPaused: string | null) {
  const paused = savedPaused === "true";
  return { paused, motion: paused ? "off" as const : "on" as const };
}
