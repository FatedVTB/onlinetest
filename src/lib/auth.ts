// ── Account registry ───────────────────────────────────────────────────────
// Account credentials sync to Supabase so login works on any device.
// Game state per user also syncs to Supabase.
//
// Keys used:
//   "nma-accounts"          — registry of {username: {passwordHash, createdAt}}
//   "nma-session"           — currently logged-in username  { username: string }
//   "nma-state-{username}"  — per-user game state
//   "shadow-slave-state-v1" — legacy (pre-accounts) save; migrated on first register

import { syncKeyFromSupabase, pushKeyToSupabase } from "./supabase";

const ACCOUNTS_KEY   = "nma-accounts";
const SESSION_KEY    = "nma-session";
export const LEGACY_STATE_KEY = "shadow-slave-state-v1";

type AccountRecord = {
  passwordHash: string; // SHA-256 hex
  createdAt: number;
};

type AccountStore = Record<string, AccountRecord>; // key = lowercased username

// ── Storage helpers ────────────────────────────────────────────────────────

function loadAccounts(): AccountStore {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? (JSON.parse(raw) as AccountStore) : {};
  } catch { return {}; }
}

function saveAccounts(store: AccountStore): void {
  try { localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(store)); } catch {}
}

// ── Password hashing ───────────────────────────────────────────────────────

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password);
  const buf  = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

// ── Session (synchronous reads so the store module can use them at load time) ──

export function getCurrentUser(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as { username: string }).username : null;
  } catch { return null; }
}

function setCurrentUser(username: string): void {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ username })); } catch {}
}

export function logout(): void {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
  window.location.replace("/");
}

// ── Per-user state storage key ─────────────────────────────────────────────
// Used by store.ts at module load time to determine which localStorage key
// to read/write game state from.

export function getUserStateKey(): string {
  const user = getCurrentUser();
  // "__guest__" maps to the legacy key for backward-compatibility
  if (!user || user === "__guest__") return LEGACY_STATE_KEY;
  return `nma-state-${user}`;
}

// ── Account list ───────────────────────────────────────────────────────────

export function listAccounts(): string[] {
  return Object.keys(loadAccounts());
}

export function hasLegacyData(): boolean {
  try {
    const raw = localStorage.getItem(LEGACY_STATE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    // Only count it as legacy data if there's a real profile (not a blank default)
    return !!parsed?.profile;
  } catch { return false; }
}

// ── Register ───────────────────────────────────────────────────────────────

export async function register(
  username: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const key = username.trim().toLowerCase();

  if (key.length < 3)  return { success: false, error: "Username must be at least 3 characters." };
  if (key.length > 20) return { success: false, error: "Username cannot exceed 20 characters." };
  if (!/^[a-z0-9_-]+$/.test(key))
    return { success: false, error: "Only letters, numbers, _ and - are allowed." };
  if (password.length < 6)
    return { success: false, error: "Password must be at least 6 characters." };

  // Pull the latest account registry from Supabase before checking for conflicts —
  // this catches usernames registered on other devices that haven't synced yet locally.
  await syncKeyFromSupabase(ACCOUNTS_KEY);

  const accounts = loadAccounts();
  if (accounts[key]) return { success: false, error: "That username is already taken." };

  const passwordHash = await hashPassword(password);
  accounts[key] = { passwordHash, createdAt: Date.now() };
  saveAccounts(accounts);
  // Push updated account registry to Supabase immediately so other devices see the new account
  pushKeyToSupabase(ACCOUNTS_KEY);

  // Migrate legacy save to the new account key — only for the very first account so
  // that existing players don't lose progress when the account system is introduced.
  const existingCount = Object.keys(accounts).filter(u => u !== key).length;
  if (existingCount === 0) {
    try {
      const legacy = localStorage.getItem(LEGACY_STATE_KEY);
      if (legacy) {
        localStorage.setItem(`nma-state-${key}`, legacy);
        localStorage.removeItem(LEGACY_STATE_KEY);
      }
    } catch {}
  }

  // Push game state to Supabase so it's available when logging in on another device
  const stateKey = `nma-state-${key}`;
  if (localStorage.getItem(stateKey)) pushKeyToSupabase(stateKey);

  setCurrentUser(key);
  return { success: true };
}

// ── Login ──────────────────────────────────────────────────────────────────

export async function login(
  username: string,
  password: string,
): Promise<{ success: boolean; error?: string }> {
  const key = username.trim().toLowerCase();
  let accounts = loadAccounts();

  // If the account isn't in local storage, pull the latest registry from Supabase.
  // This is the cross-device login path: the account was created on another device.
  if (!accounts[key]) {
    await syncKeyFromSupabase(ACCOUNTS_KEY);
    accounts = loadAccounts();
  }

  const account = accounts[key];
  if (!account) return { success: false, error: "No account found with that username." };

  const hash = await hashPassword(password);
  if (hash !== account.passwordHash)
    return { success: false, error: "Incorrect password." };

  // Pull this user's game state from Supabase BEFORE setting the session.
  // store.ts reads localStorage at module-init time, so the state must be in
  // localStorage before the page reloads after login.
  await syncKeyFromSupabase(`nma-state-${key}`);

  setCurrentUser(key);
  return { success: true };
}

// ── Delete account ─────────────────────────────────────────────────────────
// Wipes the player's game state, removes them from the account registry, and
// clears the session. The username becomes available for registration again.

export function deleteAccount(): void {
  const user = getCurrentUser();
  if (!user || user === "__guest__") {
    // Guest: just clear the legacy state and session.
    try { localStorage.removeItem(LEGACY_STATE_KEY); } catch {}
    try { localStorage.removeItem(SESSION_KEY); } catch {}
    window.location.replace("/");
    return;
  }

  // 1. Wipe game progress
  try { localStorage.removeItem(`nma-state-${user}`); } catch {}
  // Also wipe expedition draft
  try { localStorage.removeItem(`nma-expedition-draft-${user}`); } catch {}

  // 2. Remove account record so the username is free again
  const accounts = loadAccounts();
  delete accounts[user];
  saveAccounts(accounts);

  // 3. Wipe all social data for this user so they vanish from leaderboards,
  //    friend lists, cohorts, and pending requests immediately.
  try {
    const PP_KEY  = "nma-public-profiles";
    const FR_KEY  = "nma-friend-requests";
    const FS_KEY  = "nma-friendships";
    const SC_KEY  = "nma-social-cohorts";
    const CI_KEY  = "nma-cohort-invites";

    // Remove public profile
    const profiles = JSON.parse(localStorage.getItem(PP_KEY) ?? "{}");
    delete profiles[user];
    localStorage.setItem(PP_KEY, JSON.stringify(profiles));

    // Remove all friend requests involving this user
    const requests = (JSON.parse(localStorage.getItem(FR_KEY) ?? "[]") as Array<{from:string;to:string}>)
      .filter(r => r.from !== user && r.to !== user);
    localStorage.setItem(FR_KEY, JSON.stringify(requests));

    // Remove all friendships involving this user
    const friendships = (JSON.parse(localStorage.getItem(FS_KEY) ?? "[]") as Array<{users:string[]}>)
      .filter(f => !f.users.includes(user));
    localStorage.setItem(FS_KEY, JSON.stringify(friendships));

    // Remove from any cohort (kick or disband if leader)
    const cohorts = JSON.parse(localStorage.getItem(SC_KEY) ?? "{}") as Record<string, {leader:string;members:string[];code:string}>;
    for (const code of Object.keys(cohorts)) {
      if (cohorts[code].leader === user) {
        // Leader deleted → dissolve the cohort entirely
        delete cohorts[code];
      } else {
        cohorts[code].members = cohorts[code].members.filter((m: string) => m !== user);
      }
    }
    localStorage.setItem(SC_KEY, JSON.stringify(cohorts));

    // Remove all cohort invites involving this user
    const invites = (JSON.parse(localStorage.getItem(CI_KEY) ?? "[]") as Array<{from:string;to:string}>)
      .filter(i => i.from !== user && i.to !== user);
    localStorage.setItem(CI_KEY, JSON.stringify(invites));
  } catch {}

  // 4. Clear session
  try { localStorage.removeItem(SESSION_KEY); } catch {}

  window.location.replace("/");
}

// ── Guest session ──────────────────────────────────────────────────────────
// Lets players skip account creation and use the legacy localStorage key.

export function continueAsGuest(): void {
  setCurrentUser("__guest__");
  window.location.replace("/");
}
