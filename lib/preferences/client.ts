"use client";

import { useSyncExternalStore } from "react";
import { resolveMotionPreference } from "./motion";

const memory = new Map<string, string>();

export function readSetting(key: string) {
  try { return localStorage.getItem(`rightish:${key}`); }
  catch { return memory.get(key) ?? null; }
}

export function saveSetting(key: string, value: string) {
  memory.set(key, value);
  try { localStorage.setItem(`rightish:${key}`, value); } catch { /* Keep preferences for this visit when storage is blocked. */ }
  window.dispatchEvent(new Event("rightish:preferences"));
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("rightish:preferences", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("rightish:preferences", callback);
  };
}

export function useSetting(key: string) {
  return useSyncExternalStore(subscribe, () => readSetting(key), () => null);
}

export function useMotionPreference() {
  const savedPaused = useSetting("paused");
  return resolveMotionPreference(savedPaused);
}
