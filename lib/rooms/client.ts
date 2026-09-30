"use client";

import { getBrowserSupabase, getGuestSession } from "@/lib/supabase/browser";
import type { RoomSnapshot } from "./types";

export class RoomRequestError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}

export async function roomRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let session = await getGuestSession();
  for (let attempt = 0; attempt < 2; attempt++) {
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${session.access_token}`);
    if (options.body) headers.set("Content-Type", "application/json");
    let response: Response;
    try {
      const timeout = AbortSignal.timeout(15_000);
      response = await fetch(path, {
        ...options, headers, cache: "no-store",
        signal: options.signal ? AbortSignal.any([options.signal, timeout]) : timeout,
      });
    } catch (error) {
      if (options.signal?.aborted) throw error;
      throw new RoomRequestError(0, "CONNECTION_UNAVAILABLE", "We couldn’t connect. Check your connection and try again.");
    }
    if (response.status === 401 && attempt === 0) {
      const refreshed = await getBrowserSupabase().auth.refreshSession();
      if (refreshed.data.session) { session = refreshed.data.session; continue; }
    }
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new RoomRequestError(response.status, payload?.code ?? "CONNECTION_UNAVAILABLE", payload?.error ?? "Something interrupted the connection. Try again.");
    if (!payload) throw new RoomRequestError(503, "INVALID_RESPONSE", "The room didn’t respond as expected. Try again.");
    return payload as T;
  }
  throw new RoomRequestError(401, "NOT_AUTHENTICATED", "Your player session couldn’t reconnect. Refresh and try again.");
}

export function rememberRoom(snapshot: RoomSnapshot) {
  try {
    localStorage.setItem("rightish:activeRoom", snapshot.room.code);
    const player = snapshot.players.find((item) => item.user_id === snapshot.currentPlayerId);
    if (player) localStorage.setItem("rightish:nickname", player.nickname);
    window.dispatchEvent(new Event("rightish:preferences"));
  } catch { /* The Auth session still recovers the player when revisiting the URL. */ }
}

export function forgetRoom(code?: string) {
  try {
    if (!code || localStorage.getItem("rightish:activeRoom") === code) localStorage.removeItem("rightish:activeRoom");
    window.dispatchEvent(new Event("rightish:preferences"));
  } catch {}
}

export async function enterRoom(nickname: string, code?: string) {
  const { snapshot } = await roomRequest<{ snapshot: RoomSnapshot }>(code ? "/api/rooms/join" : "/api/rooms", {
    method: "POST", body: JSON.stringify({ nickname, ...(code ? { code } : {}) }),
  });
  rememberRoom(snapshot);
  return snapshot;
}

export async function readRoom(code: string, signal?: AbortSignal) {
  const { snapshot } = await roomRequest<{ snapshot: RoomSnapshot }>(`/api/rooms/${encodeURIComponent(code)}`, { signal });
  return snapshot;
}
