export function resolveMotionPreference(savedPaused: string | null, reducedMotion: boolean) {
  if (savedPaused === "false") return { paused: false, motion: "on" as const };
  if (savedPaused === "true") return { paused: true, motion: "off" as const };
  return { paused: reducedMotion, motion: "auto" as const };
}
