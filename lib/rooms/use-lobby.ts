"use client";

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserSupabase, getGuestSession } from "@/lib/supabase/browser";
import { forgetRoom, readRoom, rememberRoom, RoomRequestError } from "./client";
import type { RoomSnapshot } from "./types";

function received(snapshot: RoomSnapshot): RoomSnapshot {
  return { ...snapshot, clientReceivedAt: Date.now() };
}

export function useLobby(code: string) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null);
  const [error, setError] = useState<{ message: string; code: string } | null>(null);
  const [connection, setConnection] = useState<"connecting" | "live" | "reconnecting">("connecting");
  const [onlineIds, setOnlineIds] = useState<string[]>([]);
  const [presenceSynced, setPresenceSynced] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const revision = useRef(0);

  useEffect(() => {
    let alive = true;
    let halted = false;
    let refreshing = false;
    let refreshAgain = false;
    let channel: RealtimeChannel | null = null;
    let poll: ReturnType<typeof setInterval> | undefined;
    const abort = new AbortController();

    function showError(failure: unknown) {
      if (!alive) return;
      const kind = failure instanceof RoomRequestError ? failure.code : "CONNECTION_UNAVAILABLE";
      if (["NOT_A_MEMBER", "ROOM_NOT_FOUND", "ROOM_EXPIRED"].includes(kind)) {
        halted = true;
        setSnapshot(null);
        forgetRoom(code);
        void channel?.unsubscribe();
      }
      setError({ code: kind, message: failure instanceof Error ? failure.message : "The connection was interrupted. Try again." });
    }

    async function refresh() {
      if (!alive || halted) return;
      if (refreshing) { refreshAgain = true; return; }
      refreshing = true;
      try {
        do {
          refreshAgain = false;
          const beforeRequest = revision.current;
          try {
            const next = await readRoom(code, abort.signal);
            if (!alive) return;
            // Do not overwrite a newer ready/leave action with an older GET.
            if (beforeRequest === revision.current) {
              setSnapshot(received(next));
              rememberRoom(next);
              setError(null);
            }
          } catch (failure) { showError(failure); }
        } while (refreshAgain && alive && !halted);
      } finally { refreshing = false; }
    }

    async function connect() {
      try {
        const session = await getGuestSession();
        if (!alive) return;
        const initial = await readRoom(code, abort.signal);
        if (!alive) return;
        setSnapshot(received(initial));
        rememberRoom(initial);
        // Keep snapshots recovering even if the initial socket setup fails.
        poll = setInterval(() => { void refresh(); }, 15_000);
        const supabase = getBrowserSupabase();
        await supabase.realtime.setAuth(session.access_token);
        if (!alive) return;
        channel = supabase.channel(`room:${initial.room.id}`, {
          config: { private: true, presence: { key: session.user.id } },
        });
        channel.on("broadcast", { event: "room-updated" }, () => { void refresh(); });
        channel.on("presence", { event: "sync" }, () => {
          if (!alive || !channel) return;
          setOnlineIds(Object.keys(channel.presenceState()));
          setPresenceSynced(true);
        });
        channel.subscribe((status) => {
          if (!alive || !channel) return;
          if (status === "SUBSCRIBED") {
            setConnection("live");
            void channel.track({ user_id: session.user.id }).then((result) => {
              if (alive && result !== "ok") setConnection("reconnecting");
            }).catch(() => { if (alive) setConnection("reconnecting"); });
            // Catch changes made between the initial GET and subscribing.
            void refresh();
          } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) {
            setConnection("reconnecting");
            setPresenceSynced(false);
            setOnlineIds([]);
          }
        });
      } catch (failure) { showError(failure); }
    }

    const onOnline = () => { void refresh(); };
    const onVisible = () => { if (document.visibilityState === "visible") void refresh(); };
    const onOffline = () => { if (alive) { setConnection("reconnecting"); setPresenceSynced(false); } };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    void connect();
    return () => {
      alive = false;
      abort.abort();
      if (poll) clearInterval(poll);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) void getBrowserSupabase().removeChannel(channel);
    };
  }, [code, attempt]);

  function retry() {
    setSnapshot(null);
    setError(null);
    setConnection("connecting");
    setOnlineIds([]);
    setPresenceSynced(false);
    setAttempt((value) => value + 1);
  }

  function update(next: RoomSnapshot) {
    revision.current += 1;
    setSnapshot(received(next));
    rememberRoom(next);
    setError(null);
  }

  return { snapshot, error, connection, onlineIds, presenceSynced, retry, update };
}
