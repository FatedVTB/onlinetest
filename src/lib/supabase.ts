/**
 * Supabase sync layer — makes social data shared across devices.
 * Uses plain fetch() against the Supabase REST API — no npm package required.
 */

import { useState, useEffect } from "react";

const SUPABASE_URL = "https://houevxigsoowsybsbbpp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhvdWV2eGlnc29vd3N5YnNiYnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1OTgwNDEsImV4cCI6MjA5NTE3NDA0MX0.HJgZaxQ4r7-cmBrOjyQVHr4iew6q3JJx5FB2MBmnRT4";

function headers(extra?: Record<string, string>): Record<string, string> {
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

export const SHARED_KEYS = new Set([
  "nma-accounts",                    // account registry — must sync so login works on any device
  "nma-public-profiles",
  "nma-friend-requests",
  "nma-friendships",
  "nma-social-cohorts",
  "nma-cohort-invites",
  "nma-cohort-sessions",
  "nma-cohort-nightmare-sessions",
]);

const SYNC_EVENT = "ss-data-synced";

export async function syncFromSupabase(extraKeys: string[] = []): Promise<void> {
  if (typeof localStorage === "undefined") return;
  const keysToSync = extraKeys.length > 0
    ? new Set([...SHARED_KEYS, ...extraKeys])
    : SHARED_KEYS;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ss_shared_data?select=key,value`,
      { headers: headers() }
    );
    if (!res.ok) return;
    const data = (await res.json()) as { key: string; value: unknown }[];

    let changed = false;
    for (const row of data) {
      if (keysToSync.has(row.key)) {
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
  } catch {}
}

/**
 * Pull a single key from Supabase into localStorage.
 * Used for targeted syncs — e.g. pulling the current user's game state on login.
 */
export async function syncKeyFromSupabase(key: string): Promise<void> {
  if (typeof localStorage === "undefined") return;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ss_shared_data?select=key,value&key=eq.${encodeURIComponent(key)}`,
      { headers: headers() }
    );
    if (!res.ok) return;
    const data = (await res.json()) as { key: string; value: unknown }[];
    if (data.length > 0 && data[0].value !== null && data[0].value !== undefined) {
      try { localStorage.setItem(key, JSON.stringify(data[0].value)); } catch {}
    }
  } catch {}
}

export function initialPushAllToSupabase(): void {
  if (typeof localStorage === "undefined") return;
  for (const key of SHARED_KEYS) {
    const raw = localStorage.getItem(key);
    if (raw) pushKeyToSupabase(key);
  }
}

export function pushKeyToSupabase(key: string): void {
  if (typeof localStorage === "undefined") return;
  try {
    const raw   = localStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : null;
    fetch(`${SUPABASE_URL}/rest/v1/ss_shared_data`, {
      method:  "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates" }),
      body:    JSON.stringify({ key, value, updated_at: Date.now() }),
    }).catch(() => {});
  } catch {}
}

export function useSyncRefresh(): void {
  const [, setTick] = useState(0);
  useEffect(() => {
    const handler = () => setTick(n => n + 1);
    window.addEventListener(SYNC_EVENT, handler);
    return () => window.removeEventListener(SYNC_EVENT, handler);
  }, []);
}
