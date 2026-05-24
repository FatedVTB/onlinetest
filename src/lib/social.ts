// Local "social" simulation — seeded NPC aspirants for leaderboards & cohorts.
// Also: real-player social system (public profiles, friends, cohorts).
// All data lives in shared localStorage keys readable by any account on this device.

import { RANKS, CORES, type Rank } from "./game";
import type { Aspect, Flaw, TrueName, SetLog } from "./game";
import { pushKeyToSupabase, SHARED_KEYS } from "./supabase";

// ─── Real-player social keys ──────────────────────────────────────────────────
const PUBLIC_PROFILES_KEY = "nma-public-profiles";
const FRIEND_REQUESTS_KEY = "nma-friend-requests";
const FRIENDSHIPS_KEY     = "nma-friendships";
const SOCIAL_COHORTS_KEY  = "nma-social-cohorts";
const COHORT_INVITES_KEY  = "nma-cohort-invites";

// ─── Types ────────────────────────────────────────────────────────────────────

export type PublicProfile = {
  username: string;
  displayName: string;   // in-game character name
  rank: string;
  totalShards: number;
  nightmaresPassed: number;
  workoutsCount: number;
  aspect:    Aspect    | null;
  flaw:      Flaw      | null;
  trueName:  TrueName  | null;
  cohortCode: string   | null;
  updatedAt: number;
};

export type FriendRequest = {
  id: string;
  from: string;   // username
  to: string;     // username
  sentAt: number;
};

export type Friendship = {
  pair:  string;           // "alpha|beta" (sorted)
  users: [string, string];
  since: number;
};

export type SocialCohort = {
  code:        string;
  name:        string;
  description: string;
  leader:      string;   // username
  members:     string[]; // usernames
  createdAt:   number;
};

export type CohortInvite = {
  id:         string;
  cohortCode: string;
  cohortName: string;
  from:       string; // leader username
  to:         string; // invitee username
  sentAt:     number;
};

// ─── Storage helpers ──────────────────────────────────────────────────────────

function loadJSON<T>(key: string, def: T): T {
  try { const r = localStorage.getItem(key); return r ? (JSON.parse(r) as T) : def; }
  catch { return def; }
}
function saveJSON(key: string, val: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  // Mirror shared social data to Supabase so other devices/users see the update
  if (SHARED_KEYS.has(key)) pushKeyToSupabase(key);
}

// ─── Public profiles ──────────────────────────────────────────────────────────

export function updatePublicProfile(p: PublicProfile): void {
  const all = loadJSON<Record<string, PublicProfile>>(PUBLIC_PROFILES_KEY, {});
  all[p.username] = p;
  saveJSON(PUBLIC_PROFILES_KEY, all);
}

export function getAllPublicProfiles(): PublicProfile[] {
  return Object.values(loadJSON<Record<string, PublicProfile>>(PUBLIC_PROFILES_KEY, {}));
}

export function getPublicProfile(username: string): PublicProfile | null {
  return loadJSON<Record<string, PublicProfile>>(PUBLIC_PROFILES_KEY, {})[username] ?? null;
}

export function removePublicProfile(username: string): void {
  const all = loadJSON<Record<string, PublicProfile>>(PUBLIC_PROFILES_KEY, {});
  delete all[username];
  saveJSON(PUBLIC_PROFILES_KEY, all);
}

// ─── Friend requests ──────────────────────────────────────────────────────────

function loadRequests(): FriendRequest[] {
  return loadJSON<FriendRequest[]>(FRIEND_REQUESTS_KEY, []);
}

export function sendFriendRequest(from: string, to: string): { success: boolean; error?: string } {
  if (from === to) return { success: false, error: "You can't add yourself." };
  const reqs = loadRequests();
  if (reqs.some(r => (r.from === from && r.to === to) || (r.from === to && r.to === from)))
    return { success: false, error: "Request already pending." };
  if (areFriends(from, to)) return { success: false, error: "Already friends." };
  reqs.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, from, to, sentAt: Date.now() });
  saveJSON(FRIEND_REQUESTS_KEY, reqs);
  return { success: true };
}

export function acceptFriendRequest(id: string, currentUser: string): void {
  const reqs = loadRequests();
  const req  = reqs.find(r => r.id === id && r.to === currentUser);
  if (!req) return;
  saveJSON(FRIEND_REQUESTS_KEY, reqs.filter(r => r.id !== id));
  const pair = [req.from, req.to].sort().join("|");
  const fs   = loadJSON<Friendship[]>(FRIENDSHIPS_KEY, []);
  if (!fs.some(f => f.pair === pair)) {
    fs.push({ pair, users: [req.from, req.to] as [string, string], since: Date.now() });
    saveJSON(FRIENDSHIPS_KEY, fs);
  }
}

export function declineFriendRequest(id: string, currentUser: string): void {
  saveJSON(FRIEND_REQUESTS_KEY, loadRequests().filter(r => !(r.id === id && r.to === currentUser)));
}

export function cancelFriendRequest(id: string, currentUser: string): void {
  saveJSON(FRIEND_REQUESTS_KEY, loadRequests().filter(r => !(r.id === id && r.from === currentUser)));
}

export function getIncomingRequests(username: string): FriendRequest[] {
  return loadRequests().filter(r => r.to === username);
}

export function getOutgoingRequests(username: string): FriendRequest[] {
  return loadRequests().filter(r => r.from === username);
}

// ─── Friendships ──────────────────────────────────────────────────────────────

export function areFriends(a: string, b: string): boolean {
  const pair = [a, b].sort().join("|");
  return loadJSON<Friendship[]>(FRIENDSHIPS_KEY, []).some(f => f.pair === pair);
}

export function getFriendUsernames(username: string): string[] {
  return loadJSON<Friendship[]>(FRIENDSHIPS_KEY, [])
    .filter(f => f.users.includes(username))
    .map(f => f.users.find(u => u !== username)!)
    .filter(Boolean);
}

export function removeFriendship(a: string, b: string): void {
  const pair = [a, b].sort().join("|");
  saveJSON(FRIENDSHIPS_KEY, loadJSON<Friendship[]>(FRIENDSHIPS_KEY, []).filter(f => f.pair !== pair));
}

// ─── Social cohorts ───────────────────────────────────────────────────────────

function loadSocialCohorts(): Record<string, SocialCohort> {
  return loadJSON<Record<string, SocialCohort>>(SOCIAL_COHORTS_KEY, {});
}

function genCohortCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function createSocialCohort(name: string, description: string, leader: string): SocialCohort {
  const all = loadSocialCohorts();
  // Remove any cohort this user already leads
  for (const [code, c] of Object.entries(all)) {
    if (c.leader === leader) delete all[code];
  }
  let code = genCohortCode();
  while (all[code]) code = genCohortCode();
  const cohort: SocialCohort = { code, name: name.trim(), description: description.trim(), leader, members: [leader], createdAt: Date.now() };
  all[code] = cohort;
  saveJSON(SOCIAL_COHORTS_KEY, all);
  return cohort;
}

export function getSocialCohort(code: string): SocialCohort | null {
  return loadSocialCohorts()[code] ?? null;
}

export function getCohortByMember(username: string): SocialCohort | null {
  return Object.values(loadSocialCohorts()).find(c => c.members.includes(username)) ?? null;
}

export function disbandCohort(code: string, leader: string): void {
  const all = loadSocialCohorts();
  if (all[code]?.leader !== leader) return;
  // Clear cohort invites for this cohort
  saveJSON(COHORT_INVITES_KEY, loadJSON<CohortInvite[]>(COHORT_INVITES_KEY, []).filter(i => i.cohortCode !== code));
  delete all[code];
  saveJSON(SOCIAL_COHORTS_KEY, all);
}

export function leaveSocialCohort(code: string, username: string): void {
  const all = loadSocialCohorts();
  if (!all[code]) return;
  if (all[code].leader === username) { disbandCohort(code, username); return; }
  all[code].members = all[code].members.filter(m => m !== username);
  saveJSON(SOCIAL_COHORTS_KEY, all);
}

// ─── Cohort invites ───────────────────────────────────────────────────────────

function loadCohortInvites(): CohortInvite[] {
  return loadJSON<CohortInvite[]>(COHORT_INVITES_KEY, []);
}

export function sendCohortInvite(cohortCode: string, from: string, to: string): { success: boolean; error?: string } {
  const cohort = getSocialCohort(cohortCode);
  if (!cohort) return { success: false, error: "Cohort not found." };
  if (cohort.members.includes(to)) return { success: false, error: `${to} is already in the cohort.` };
  const invites = loadCohortInvites();
  if (invites.some(i => i.cohortCode === cohortCode && i.to === to))
    return { success: false, error: "Invite already sent." };
  invites.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, cohortCode, cohortName: cohort.name, from, to, sentAt: Date.now() });
  saveJSON(COHORT_INVITES_KEY, invites);
  return { success: true };
}

export function acceptCohortInvite(id: string, currentUser: string): void {
  const invites = loadCohortInvites();
  const invite  = invites.find(i => i.id === id && i.to === currentUser);
  if (!invite) return;
  saveJSON(COHORT_INVITES_KEY, invites.filter(i => i.id !== id));
  const all = loadSocialCohorts();
  if (all[invite.cohortCode] && !all[invite.cohortCode].members.includes(currentUser)) {
    all[invite.cohortCode].members.push(currentUser);
    saveJSON(SOCIAL_COHORTS_KEY, all);
  }
}

export function declineCohortInvite(id: string, currentUser: string): void {
  saveJSON(COHORT_INVITES_KEY, loadCohortInvites().filter(i => !(i.id === id && i.to === currentUser)));
}

export function getCohortInvitesForUser(username: string): CohortInvite[] {
  return loadCohortInvites().filter(i => i.to === username);
}

// ─── Cohort expedition sessions ───────────────────────────────────────────────
// A shared localStorage record so all participants on this device can coordinate.

const COHORT_SESSIONS_KEY = "nma-cohort-sessions";

export type CohortExpeditionSession = {
  id:              string;
  cohortCode:      string;
  cohortName:      string;
  initiator:       string;
  /** Members actively in the expedition (always includes initiator) */
  acceptedMembers: string[];
  /** Invited but haven't responded yet */
  pendingMembers:  string[];
  /** Declined the invite */
  declinedMembers: string[];
  /** Shard count at the moment each member joined */
  memberStartShards: Record<string, number>;
  /** Members who have tapped "Request to End" */
  exitRequests:    string[];
  /** Shards earned THIS expedition per user — updated after every set */
  liveShards:      Record<string, number>;
  createdAt:       number;
};

function loadSessions(): Record<string, CohortExpeditionSession> {
  return loadJSON<Record<string, CohortExpeditionSession>>(COHORT_SESSIONS_KEY, {});
}
function saveSessions(s: Record<string, CohortExpeditionSession>): void {
  saveJSON(COHORT_SESSIONS_KEY, s);
}

export function createCohortExpeditionSession(
  cohortCode:          string,
  cohortName:          string,
  initiator:           string,
  invitedMembers:      string[],
  initiatorStartShards: number,
): CohortExpeditionSession {
  const sessions = loadSessions();
  const now = Date.now();
  // Remove any previous session for this cohort or expired sessions (> 24h)
  for (const [id, s] of Object.entries(sessions)) {
    if (s.cohortCode === cohortCode || now - s.createdAt > 86_400_000) delete sessions[id];
  }
  const id = `${now}-${Math.random().toString(36).slice(2)}`;
  const session: CohortExpeditionSession = {
    id, cohortCode, cohortName, initiator,
    acceptedMembers:   [initiator],
    pendingMembers:    [...invitedMembers],
    declinedMembers:   [],
    memberStartShards: { [initiator]: initiatorStartShards },
    exitRequests:      [],
    liveShards:        { [initiator]: 0 },
    createdAt:         now,
  };
  sessions[id] = session;
  saveSessions(sessions);
  return session;
}

export function getCohortExpeditionSession(id: string): CohortExpeditionSession | null {
  return loadSessions()[id] ?? null;
}

/** Find the active session a user has already joined. */
export function getActiveCohortSessionForUser(username: string): CohortExpeditionSession | null {
  return Object.values(loadSessions()).find(s => s.acceptedMembers.includes(username)) ?? null;
}

/** Find sessions where this user has a pending invite. */
export function getPendingCohortExpeditionInvites(username: string): CohortExpeditionSession[] {
  return Object.values(loadSessions()).filter(s => s.pendingMembers.includes(username));
}

export function acceptCohortExpeditionInvite(id: string, username: string, startShards: number): void {
  const sessions = loadSessions();
  const s = sessions[id];
  if (!s || !s.pendingMembers.includes(username)) return;
  s.pendingMembers = s.pendingMembers.filter(m => m !== username);
  if (!s.acceptedMembers.includes(username)) s.acceptedMembers.push(username);
  s.memberStartShards[username] = startShards;
  s.liveShards = { ...(s.liveShards ?? {}), [username]: 0 };
  saveSessions(sessions);
}

/** Called after every set so other members see real-time shard progress. */
export function updateCohortLiveShards(id: string, username: string, shardsEarned: number): void {
  const sessions = loadSessions();
  const s = sessions[id];
  if (!s || !s.acceptedMembers.includes(username)) return;
  s.liveShards = { ...(s.liveShards ?? {}), [username]: shardsEarned };
  saveSessions(sessions);
}

export function declineCohortExpeditionInvite(id: string, username: string): void {
  const sessions = loadSessions();
  const s = sessions[id];
  if (!s) return;
  s.pendingMembers  = s.pendingMembers.filter(m => m !== username);
  s.declinedMembers = [...s.declinedMembers, username];
  saveSessions(sessions);
}

export function requestCohortExit(id: string, username: string): void {
  const sessions = loadSessions();
  const s = sessions[id];
  if (!s || !s.acceptedMembers.includes(username)) return;
  if (!s.exitRequests.includes(username)) s.exitRequests.push(username);
  saveSessions(sessions);
}

export function cancelCohortExitRequest(id: string, username: string): void {
  const sessions = loadSessions();
  const s = sessions[id];
  if (!s) return;
  s.exitRequests = s.exitRequests.filter(m => m !== username);
  saveSessions(sessions);
}

export function deleteCohortExpeditionSession(id: string): void {
  const sessions = loadSessions();
  delete sessions[id];
  saveSessions(sessions);
}

// ─── Cohort nightmare sessions ────────────────────────────────────────────────

const COHORT_NIGHTMARE_KEY = "nma-cohort-nightmare-sessions";

export type CohortNightmareSession = {
  id:              string;
  cohortCode:      string;
  cohortName:      string;
  initiator:       string;
  nightmareNumber: number;   // which NM (2 = second nightmare, etc.)
  nmThreshold:     number;   // base threshold rolled by initiator
  // Membership
  acceptedMembers: string[];
  pendingMembers:  string[];
  declinedMembers: string[];
  /** Members currently sitting on the /nightmare page */
  presentMembers:  string[];
  /** Last nightmare sets per member — submitted on join, used for combined baseline */
  memberLastNightmareSets: Record<string, SetLog[]>;
  /** Sets submitted this nightmare per member */
  memberSubmittedSets: Record<string, SetLog[]>;
  /** Members who have clicked "Request Pause" */
  pauseRequests:   string[];
  /** Members who have submitted all their sets and are ready to finish */
  finishRequests:  string[];
  status: "waiting" | "active" | "paused" | "finished";
  createdAt:       number;
};

function loadNightmareSessions(): Record<string, CohortNightmareSession> {
  return loadJSON<Record<string, CohortNightmareSession>>(COHORT_NIGHTMARE_KEY, {});
}
function saveNightmareSessions(s: Record<string, CohortNightmareSession>): void {
  saveJSON(COHORT_NIGHTMARE_KEY, s);
}

export function createCohortNightmareSession(
  cohortCode:          string,
  cohortName:          string,
  initiator:           string,
  invitedMembers:      string[],
  nightmareNumber:     number,
  nmThreshold:         number,
  initiatorLastSets:   SetLog[],
): CohortNightmareSession {
  const sessions = loadNightmareSessions();
  const now = Date.now();
  // Remove any stale sessions for this cohort or older than 24h
  for (const [id, s] of Object.entries(sessions)) {
    if (s.cohortCode === cohortCode || now - s.createdAt > 86_400_000) delete sessions[id];
  }
  const id = `${now}-${Math.random().toString(36).slice(2)}`;
  const session: CohortNightmareSession = {
    id, cohortCode, cohortName, initiator,
    nightmareNumber, nmThreshold,
    acceptedMembers:         [initiator],
    pendingMembers:          [...invitedMembers],
    declinedMembers:         [],
    presentMembers:          [],
    memberLastNightmareSets: { [initiator]: initiatorLastSets },
    memberSubmittedSets:     {},
    pauseRequests:           [],
    finishRequests:          [],
    status:                  "waiting",
    createdAt:               now,
  };
  sessions[id] = session;
  saveNightmareSessions(sessions);
  return session;
}

export function getCohortNightmareSession(id: string): CohortNightmareSession | null {
  return loadNightmareSessions()[id] ?? null;
}

export function getActiveCohortNightmareSession(username: string): CohortNightmareSession | null {
  return Object.values(loadNightmareSessions())
    .find(s => s.acceptedMembers.includes(username) && s.status !== "finished") ?? null;
}

export function getPendingCohortNightmareInvites(username: string): CohortNightmareSession[] {
  return Object.values(loadNightmareSessions()).filter(s => s.pendingMembers.includes(username));
}

export function acceptCohortNightmareInvite(id: string, username: string, lastSets: SetLog[]): void {
  const sessions = loadNightmareSessions();
  const s = sessions[id];
  if (!s || !s.pendingMembers.includes(username)) return;
  s.pendingMembers = s.pendingMembers.filter(m => m !== username);
  if (!s.acceptedMembers.includes(username)) s.acceptedMembers.push(username);
  s.memberLastNightmareSets[username] = lastSets;
  saveNightmareSessions(sessions);
}

export function declineCohortNightmareInvite(id: string, username: string): void {
  const sessions = loadNightmareSessions();
  const s = sessions[id];
  if (!s) return;
  s.pendingMembers  = s.pendingMembers.filter(m => m !== username);
  s.declinedMembers = [...s.declinedMembers, username];
  saveNightmareSessions(sessions);
}

/** Mark this member as currently present on the /nightmare page. */
export function joinCohortNightmarePresence(id: string, username: string): void {
  const sessions = loadNightmareSessions();
  const s = sessions[id];
  if (!s || !s.acceptedMembers.includes(username)) return;
  if (!s.presentMembers.includes(username)) s.presentMembers.push(username);
  // Clear any stale pause request when re-entering
  s.pauseRequests = s.pauseRequests.filter(m => m !== username);
  // If all accepted members are now present, mark active
  if (s.acceptedMembers.every(m => s.presentMembers.includes(m))) s.status = "active";
  saveNightmareSessions(sessions);
}

/** Remove from present members (navigating away / pausing). */
export function leaveCohortNightmarePresence(id: string, username: string): void {
  const sessions = loadNightmareSessions();
  const s = sessions[id];
  if (!s) return;
  s.presentMembers = s.presentMembers.filter(m => m !== username);
  saveNightmareSessions(sessions);
}

export function requestCohortNightmarePause(id: string, username: string): void {
  const sessions = loadNightmareSessions();
  const s = sessions[id];
  if (!s || !s.acceptedMembers.includes(username)) return;
  if (!s.pauseRequests.includes(username)) s.pauseRequests.push(username);
  // All agreed → mark paused, clear present
  if (s.acceptedMembers.every(m => s.pauseRequests.includes(m))) {
    s.status         = "paused";
    s.presentMembers = [];
    s.pauseRequests  = [];
  }
  saveNightmareSessions(sessions);
}

export function cancelCohortNightmarePause(id: string, username: string): void {
  const sessions = loadNightmareSessions();
  const s = sessions[id];
  if (!s) return;
  s.pauseRequests = s.pauseRequests.filter(m => m !== username);
  saveNightmareSessions(sessions);
}

/** Submit this member's sets and signal readiness to finish. */
export function submitCohortNightmareSets(id: string, username: string, sets: SetLog[]): void {
  const sessions = loadNightmareSessions();
  const s = sessions[id];
  if (!s || !s.acceptedMembers.includes(username)) return;
  s.memberSubmittedSets[username] = sets;
  if (!s.finishRequests.includes(username)) s.finishRequests.push(username);
  saveNightmareSessions(sessions);
}

export function deleteCohortNightmareSession(id: string): void {
  const sessions = loadNightmareSessions();
  delete sessions[id];
  saveNightmareSessions(sessions);
}

const NAMES = [
  "Sunny", "Cassie", "Nephis", "Effie", "Cain", "Anna", "Brandon", "Jet",
  "Kai", "Lyra", "Vyrhal", "Marn", "Tessa", "Orin", "Pellis", "Quinn",
  "Reyna", "Sigrid", "Theron", "Ulric", "Vex", "Wren", "Xara", "Yuki",
  "Zane", "Mara", "Drask", "Ilya", "Kara", "Niven",
];

export type NPC = { name: string; shards: number; rank: Rank };

function seededRand(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1000) / 1000;
  };
}

// ─── Legacy: used by cohorts.tsx ─────────────────────────────────────────────

export function generateNPCs(seed: number, count: number): NPC[] {
  const rand = seededRand(seed);
  const used = new Set<string>();
  const out: NPC[] = [];
  while (out.length < count) {
    const name = NAMES[Math.floor(rand() * NAMES.length)];
    if (used.has(name)) continue;
    used.add(name);
    const shards = Math.floor(rand() * 18000);
    let filled = 0, remaining = shards;
    const costs = [1000, 2000, 3000, 4000, 5000, 6000, 7000];
    for (const c of costs) { if (remaining >= c) { filled++; remaining -= c; } else break; }
    out.push({ name, shards, rank: RANKS[Math.min(filled + 1, RANKS.length - 1)] });
  }
  return out.sort((a, b) => b.shards - a.shards);
}

// Deterministic seed from invite code
export function codeToSeed(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = ((h << 5) - h + code.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

// ─── Class-based leaderboard helpers ─────────────────────────────────────────

export const CLASS_NAMES = [
  "Beast", "Monster", "Demon", "Devil", "Tyrant", "Terror", "Titan", "Max Titan",
] as const;
export type ClassName = (typeof CLASS_NAMES)[number];

// Cumulative shard ranges for each class (total shards)
const CORE_COSTS = CORES.map(c => c.cost); // [1000, 2000, 3000, 4000, 5000, 6000, 7000]
const TOTAL_TITAN_SHARDS = CORE_COSTS.reduce((a, b) => a + b, 0); // 28000

export const CLASS_SHARD_RANGES: { min: number; max: number }[] = [
  { min: 0,     max: 999   }, // 0: Beast
  { min: 1000,  max: 2999  }, // 1: Monster
  { min: 3000,  max: 5999  }, // 2: Demon
  { min: 6000,  max: 9999  }, // 3: Devil
  { min: 10000, max: 14999 }, // 4: Tyrant
  { min: 15000, max: 20999 }, // 5: Terror
  { min: 21000, max: 28000 }, // 6: Titan (0–7000 class shards; exactly 28000 stays here)
  { min: 28001, max: 40000 }, // 7: Max Titan (7001+/7000)
];

/**
 * Which class leaderboard (0–7) a player belongs to based on their total shards.
 * At exactly 28000 the player is still on the Titan board (7000/7000).
 * At 28001+ they graduate to Max Titan (7001/7000).
 */
export function classIndexForShards(totalShards: number): number {
  let remaining = totalShards;
  for (let i = 0; i < CORE_COSTS.length; i++) {
    if (remaining < CORE_COSTS[i]) return i;
    remaining -= CORE_COSTS[i];
  }
  // remaining === 0 → exactly completed Titan → still Titan board
  return remaining === 0 ? 6 : 7;
}

/**
 * Shards to display on the given class leaderboard.
 * Regular classes: how far through THIS class the player is (0 → classCost-1).
 * Max Titan: 7001, 7002 … (the Titan cap becomes the denominator, exceeded freely).
 */
export function classShards(totalShards: number, classIndex: number): number {
  if (classIndex === 7) return 7000 + (totalShards - TOTAL_TITAN_SHARDS);
  return totalShards - CLASS_SHARD_RANGES[classIndex].min;
}

/** The denominator shown next to class shards (e.g. "/7000"). */
export function classCost(classIndex: number): number {
  if (classIndex === 7) return 7000; // Max Titan keeps the Titan cap as its denominator
  return CORE_COSTS[classIndex];
}

/**
 * Generate NPCs whose total shards fall within the given class range.
 * Seed varies per class so each class has a distinct cast.
 */
export function generateNPCsForClass(seed: number, count: number, classIndex: number): NPC[] {
  const rand = seededRand(seed * (classIndex + 3) + classIndex * 1337 + 99);
  const range = CLASS_SHARD_RANGES[classIndex];
  const used = new Set<string>();
  const out: NPC[] = [];
  let attempts = 0;
  while (out.length < count && attempts < count * 20) {
    attempts++;
    const name = NAMES[Math.floor(rand() * NAMES.length)];
    if (used.has(name)) continue;
    used.add(name);
    const totalShards = range.min + Math.floor(rand() * (range.max - range.min + 1));
    const nmPassed = Math.floor(rand() * 5); // 0–4 nightmares → Sleeper through Transcended
    const rank = RANKS[Math.min(nmPassed, RANKS.length - 1)];
    out.push({ name, shards: totalShards, rank });
  }
  return out.sort((a, b) => b.shards - a.shards);
}
