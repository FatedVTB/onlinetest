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
  "nma-public-profiles",
  "nma-friend-requests",
  "nma-friendships",
  "nma-social-cohorts",
  "nma-cohort-invites",
  "nma-cohort-sessions",
  "nma-cohort-nightmare-sessions",
]);

const SYNC_EVENT = "ss-data-synced";

export async function syncFromSupabase(): Promise<void> {
  if (typeof localStorage === "undefined") return;
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
