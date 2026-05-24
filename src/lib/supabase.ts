/**
 * Supabase sync layer — makes social data shared across devices.
 *
 * How it works:
 *   1. Every social write (profiles, friends, cohorts, sessions) calls pushKeyToSupabase().
 *      This fire-and-forgets the updated data to the cloud — the UI is never blocked.
 *   2. The root component calls syncFromSupabase() on mount + every 5 seconds.
 *      This pulls the latest data from Supabase into localStorage, then fires a
 *      'ss-data-synced' event so all visible components know to re-read their data.
 *   3. initialPushAllToSupabase() uploads any existing localStorage data on first load,
 *      so users who were using the app before Supabase was added aren't invisible.
 *   4. The app falls back to localStorage-only mode if env vars are missing —
 *      everything still works, it just won't sync across devices.
 */

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Supabase client — null when env vars aren't configured.
 * The app works fully offline/single-device without it.
 */
export const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * The localStorage keys whose contents must be shared across all users/devices.
 * Personal game state (progress, workouts, etc.) is intentionally excluded —
 * it stays on-device and is never sent to the cloud.
 */
export const SHARED_KEYS = new Set([
  "nma-public-profiles",
  "nma-friend-requests",
  "nma-friendships",
  "nma-social-cohorts",
  "nma-cohort-invites",
  "nma-cohort-sessions",
  "nma-cohort-nightmare-sessions",
]);

/** Internal event name fired after every successful sync. */
const SYNC_EVENT = "ss-data-synced";

/**
 * Pull the latest shared data from Supabase into localStorage,
 * then notify all listening components to re-render.
 *
 * Called on app mount and on a 5-second interval so live session
 * updates (shards, nightmare status, invites) appear in real time.
 */
export async function syncFromSupabase(): Promise<void> {
  if (!supabase || typeof localStorage === "undefined") return;
  try {
    const { data, error } = await supabase
      .from("ss_shared_data")
      .select("key, value");
    if (error || !data) return;

    let changed = false;
    for (const row of data) {
      if (SHARED_KEYS.has(row.key as string)) {
        try {
          const incoming = JSON.stringify(row.value);
          const current  = localStorage.getItem(row.key as string);
          if (incoming !== current) {
            localStorage.setItem(row.key as string, incoming);
            changed = true;
          }
        } catch {}
      }
    }

    // Notify components to re-read localStorage — only when something actually changed
    if (changed && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT));
    }
  } catch {
    // Network error — silently continue with cached localStorage data
  }
}

/**
 * Push ALL shared localStorage keys to Supabase at once.
 *
 * Call this once on app mount so that any data the user had before Supabase
 * was added gets uploaded immediately — otherwise other devices would never
 * see profiles/friends/cohorts that existed before the sync system was wired up.
 */
export function initialPushAllToSupabase(): void {
  if (!supabase || typeof localStorage === "undefined") return;
  for (const key of SHARED_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) pushKeyToSupabase(key);
  }
}

/**
 * Push the current value of a single localStorage key to Supabase.
 *
 * Fire-and-forget: does NOT await, so the UI is never blocked.
 * Called automatically after every social write in social.ts.
 */
export function pushKeyToSupabase(key: string): void {
  if (!supabase || typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : null;
    supabase
      .from("ss_shared_data")
      .upsert({ key, value, updated_at: Date.now() })
      .then(); // intentionally not awaited — fire and forget
  } catch {}
}

/**
 * React hook — causes the calling component to re-render whenever a Supabase
 * sync brings in new data. Add one call at the top of any component that shows
 * social data (profiles, friends, cohorts, session invites, leaderboard).
 *
 * Usage:  useSyncRefresh();   // no arguments, no return value needed
 */
export function useSyncRefresh(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick(n => n + 1);
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);
}
