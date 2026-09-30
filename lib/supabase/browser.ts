"use client";

import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | undefined;
let guestRequest: Promise<Session> | null = null;

export function getBrowserSupabase() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured yet. Restart the dev server after adding .env.local.");
  client = createClient(url, key);
  return client;
}

async function loadGuestSession(): Promise<Session> {
  const supabase = getBrowserSupabase();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error("Your guest session couldn’t reconnect. Refresh the page and try again.");
  if (data.session) return data.session;

  const { data: guest, error: guestError } = await supabase.auth.signInAnonymously();
  if (guestError || !guest.session) {
    if (guestError?.code === "anonymous_provider_disabled") {
      throw new Error("Guest sign-in is not enabled yet. Enable anonymous sign-ins in Supabase.");
    }
    throw new Error("We couldn’t get your player connected. Give it another try in a moment.");
  }
  return guest.session;
}

// Share a pending sign-in so simultaneous clicks cannot create two identities.
export function getGuestSession() {
  if (!guestRequest) guestRequest = loadGuestSession().finally(() => { guestRequest = null; });
  return guestRequest;
}
