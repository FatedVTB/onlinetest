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
  "nma-blacklisted-accounts",        // usernames blocked from logging in (admin-deleted accounts)
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

/**
 * Push a localStorage key to Supabase.
 *
 * For plain-object (dictionary) values — which includes nma-accounts and
 * nma-public-profiles — we do a safe merge push:
 *   1. Fetch the current Supabase value
 *   2. Merge: Supabase value as the base, local value on top
 *      (local changes win, but entries that only exist in Supabase are kept)
 *   3. Write the merged result back to localStorage AND push to Supabase
 *
 * This prevents the "last writer erases everyone else" race condition where
 * a user's local copy only has their own entry and they overwrite the
 * complete Supabase dict when they save.
 *
 * For arrays and primitives the merge is not safe to automate, so we push
 * the local value as-is (same as before).
 */
export async function pushKeyToSupabase(key: string): Promise<void> {
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return;
    const localValue = JSON.parse(raw);

    let valueToPush = localValue;

    // Safe-merge for plain objects (nma-accounts, nma-public-profiles, etc.)
    if (localValue !== null && typeof localValue === "object" && !Array.isArray(localValue)) {
      try {
        const res = await fetch(
          `${SUPABASE_URL}/rest/v1/ss_shared_data?select=key,value&key=eq.${encodeURIComponent(key)}`,
          { headers: headers() }
        );
        if (res.ok) {
          const rows = (await res.json()) as { key: string; value: unknown }[];
          if (
            rows.length > 0 &&
            rows[0].value !== null &&
            typeof rows[0].value === "object" &&
            !Array.isArray(rows[0].value)
          ) {
            // Supabase is the base (has everyone's entries); local overrides only our own entry
            valueToPush = {
              ...(rows[0].value as Record<string, unknown>),
              ...localValue,
            };
            // Update localStorage with the merged result so local is always complete
            try { localStorage.setItem(key, JSON.stringify(valueToPush)); } catch {}
          }
        }
      } catch { /* network error — fall back to pushing local value as-is */ }
    }

    fetch(`${SUPABASE_URL}/rest/v1/ss_shared_data`, {
      method:  "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates" }),
      body:    JSON.stringify({ key, value: valueToPush, updated_at: Date.now() }),
    }).catch(() => {});
  } catch {}
}

/**
 * Remove a single entry from a dict-type row in Supabase.
 * Used for account/profile deletion — the regular merge-push cannot remove keys.
 * Fetches the current dict, deletes the entry, and writes the result back.
 */
export async function removeFromSupabaseDict(dictKey: string, entryKey: string): Promise<void> {
  if (typeof localStorage === "undefined") return;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/ss_shared_data?select=key,value&key=eq.${encodeURIComponent(dictKey)}`,
      { headers: headers() }
    );
    if (!res.ok) return;
    const rows = (await res.json()) as { key: string; value: unknown }[];

    const dict: Record<string, unknown> =
      rows.length > 0 && rows[0].value && typeof rows[0].value === "object" && !Array.isArray(rows[0].value)
        ? { ...(rows[0].value as Record<string, unknown>) }
        : {};

    delete dict[entryKey];

    // Push the cleaned dict (bypasses the merge — this IS the authoritative version)
    await fetch(`${SUPABASE_URL}/rest/v1/ss_shared_data`, {
      method:  "POST",
      headers: headers({ Prefer: "resolution=merge-duplicates" }),
      body:    JSON.stringify({ key: dictKey, value: dict, updated_at: Date.now() }),
    });

    // Mirror to localStorage so local is immediately consistent
    try { localStorage.setItem(dictKey, JSON.stringify(dict)); } catch {}
  } catch {}
}

/**
 * Delete an entire row from Supabase and remove it from localStorage.
 * Used for per-user game-state rows (nma-state-{username}).
 */
export async function deleteSupabaseKey(key: string): Promise<void> {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/ss_shared_data?key=eq.${encodeURIComponent(key)}`,
      { method: "DELETE", headers: headers({ Prefer: "return=minimal" }) }
    );
    try { localStorage.removeItem(key); } catch {}
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

/** Read the local blacklist (synced from Supabase). */
export function getBlacklistedAccounts(): string[] {
  try {
    const raw = localStorage.getItem("nma-blacklisted-accounts");
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}
