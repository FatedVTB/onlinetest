/**
 * Supabase sync layer — makes social data shared across devices.
 * Uses plain fetch() against the Supabase REST API — no npm package required.
 *
 * How it works:
 *   1. Every social write calls pushKeyToSupabase() which fire-and-forgets the
 *      updated data to the cloud. The UI is never blocked.
 *   2. syncFromSupabase() pulls the latest data from Supabase into localStorage,
 *      then fires 'ss-data-synced' so components know to re-read their data.
 *   3. initialPushAllToSupabase() uploads existing localStorage data on first load
 *      so users who were using the app before Supabase was added aren't invisible.
 *   4. Without env vars the app works exactly as before — localStorage only.
 */

import { useState, useEffect } from "react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

const configured = !!(SUPABASE_URL && SUPABASE_KEY);

/** Headers used for every Supabase REST request. */
function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_KEY!,
    Authorization: `Bearer ${SUPABASE_KEY!}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/**
 * The localStorage keys whose contents must be shared across all users/devices.
 * Personal game state (progress, workouts, memories) is intentionally excluded.
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

/** Internal event fired after every successful sync that changed something. */
const SYNC_EVENT = "ss-data-synced";

/**
 * Pull the latest shared data from Supabase into localStorage,
 * then notify all listening components to re-render.
 */
export async function syncFromSupabase(): Promise<void> {
  if (!configured || typeof localStorage === "undefined") return;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ss_shared_data?select=key,value`,
      { headers: headers() }
    );
    if (!res.ok) return;
    const data = (await res.json()) as { key: string; value: unknown }[];

    let changed = false;
    for (const row of data) {
      if (SHARED_KEYS.has(row.key)) {
        const incoming = JSON.stringify(row.value);
        const current  = localStorage.getItem(row.key);
        if (incoming !== current) {
          try { localStorage.setItem(row.key, incoming); } catch {}
          changed = true;
        }
      }
    }

    if (changed && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(SYNC_EVENT));
    }
  } catch {
    // Network error — silently fall back to cached localStorage data
  }
}

/**
 * Push ALL shared localStorage keys to Supabase at once.
 * Called on app mount so existing data becomes visible to other devices immediately.
 */
export function initialPushAllToSupabase(): void {
  if (!configured || typeof localStorage === "undefined") return;
  for (const key of SHARED_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) pushKeyToSupabase(key);
  }
}

/**
 * Push one localStorage key's current value to Supabase.
 * Fire-and-forget — does not block the UI.
 */
export function pushKeyToSupabase(key: string): void {
  if (!configured || typeof localStorage === "undefined") return;
  try {
    const raw   = localStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : null;
    fetch(`${SUPABASE_URL}/rest/v1/ss_shared_data`, {
      method:  "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates" }),
      body:    JSON.stringify({ key, value, updated_at: Date.now() }),
    }).catch(() => {}); // fire and forget
  } catch {}
}

/**
 * React hook — re-renders the calling component whenever a sync brings in new data.
 * Add one call at the top of any component that shows social data.
 *
 * Usage:  useSyncRefresh();
 */
export function useSyncRefresh(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick(n => n + 1);
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);
}
