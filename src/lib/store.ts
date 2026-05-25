import { useEffect, useState, useCallback } from "react";
import {
  type Aspect, type Flaw, type SetLog, type TrueName, type MuscleGroup,
  migrateAspect, migrateFlaw, migrateTrueName, upgradeAspect,
} from "./game";
import type { Memory, MemoryType } from "./memories";
import { getUserStateKey, LEGACY_STATE_KEY, getCurrentUser } from "./auth";
import { updatePublicProfile, getCohortByMember } from "./social";
import { computeRank } from "./game";

// Max equipped per category (Infinity = no limit)
const EQUIP_LIMITS: Record<MemoryType, number> = {
  Weapon: 3,
  Armour: 3,
  Charm:  3,
  Tool:   Infinity,
};

export type Profile = {
  name: string;
  height: number;
  weight: number;
  trainingType: string;
  yearsTraining: number;
  constitution: string;
};

export type Workout = {
  id: string;
  date: number;
  day: string;
  sets: SetLog[];
  shardsEarned: number;
  drops?: Memory[];
};

export type Cohort = {
  code: string;
  name: string;
  joinedAt: number;
};

export type NightmareRecord = { nm: number; requiredPct: number; achievedPct: number };

export type PendingNightmareEntry = { exercise: string; weight: number; reps: number };
export type PendingNightmare = {
  nightmareNumber: number;
  nmThreshold: number;
  entries: Partial<Record<MuscleGroup, PendingNightmareEntry>>;
};

export type Platform = "mobile" | "desktop";

export type GameState = {
  profile: Profile | null;
  firstNightmareSets: SetLog[] | null;
  lastNightmareSets: SetLog[] | null;
  nightmareHistory: NightmareRecord[];
  aspect: Aspect | null;
  flaw: Flaw | null;
  trueName?: TrueName;
  totalShards: number;
  workouts: Workout[];
  baselines: Record<string, number>;    // best weight per exercise
  repBaselines: Record<string, number>; // best reps at current baseline weight
  memories: Memory[];
  equippedMemoryIds: string[];
  cohort: Cohort | null;
  nightmaresPassed: number;
  pendingNightmare: PendingNightmare | null;
  platform: Platform | null;            // null = not yet chosen
  tutorialSeen: boolean;               // true once the guide has been viewed or skipped
  customDays: string[];                // user-created expedition day names
  nightmarePostponed: boolean;         // true when user chose to explore before first nightmare
};

// Per-user state key — determined once at module load from the active session.
// Login / logout both call window.location.reload() so this is always correct.
const KEY = getUserStateKey();

const DEFAULT: GameState = {
  profile: null,
  firstNightmareSets: null,
  lastNightmareSets: null,
  nightmareHistory: [],
  aspect: null,
  flaw: null,
  totalShards: 0,
  workouts: [],
  baselines: {},
  repBaselines: {},
  memories: [],
  equippedMemoryIds: [],
  cohort: null,
  nightmaresPassed: 0,
  pendingNightmare: null,
  platform: null,
  tutorialSeen: false,
  customDays: [],
  nightmarePostponed: false,
};

function renameExercise(name: string): string {
  if (name === "Plank (kg)") return "Plank";
  return name;
}

const OLD_MEMORY_RANKS = new Set(["Lesser", "Common", "Greater", "Grand", "Legendary"]);

function migrateState(raw: Partial<GameState>): GameState {
  const s: GameState = { ...DEFAULT, ...raw };
  s.equippedMemoryIds = s.equippedMemoryIds ?? [];
  s.repBaselines  = s.repBaselines  ?? {};
  s.tutorialSeen        = s.tutorialSeen        ?? false;
  s.customDays          = s.customDays          ?? [];
  s.nightmarePostponed  = s.nightmarePostponed  ?? false;
  s.nightmareHistory = s.nightmareHistory ?? [];
  s.lastNightmareSets = s.lastNightmareSets ?? null;
  // Strip memories from before the rank/tier rewrite
  if (s.memories) {
    const validIds = new Set(s.memories.filter(m => !OLD_MEMORY_RANKS.has(m.rank) && (m as any).tier !== undefined).map(m => m.id));
    s.memories = s.memories.filter(m => validIds.has(m.id));
    s.equippedMemoryIds = s.equippedMemoryIds.filter(id => validIds.has(id));
  }
  if (s.aspect) {
    s.aspect = migrateAspect(s.aspect);
    // Retroactively apply nightmare ability unlocks for existing saves
    const currentCount = s.aspect.abilities?.length ?? 1;
    const expectedCount = Math.min(s.nightmaresPassed, 6); // max 7 abilities (NM1–NM7)
    if (currentCount < expectedCount) {
      for (let nm = currentCount + 1; nm <= expectedCount; nm++) {
        s.aspect = upgradeAspect(s.aspect, nm);
      }
    }
  }
  if (s.flaw)      s.flaw     = migrateFlaw(s.flaw);
  if (s.trueName)  s.trueName = migrateTrueName(s.trueName);
  // Rename renamed exercises in persisted data
  if (s.baselines) {
    const fixed: Record<string, number> = {};
    for (const [k, v] of Object.entries(s.baselines)) fixed[renameExercise(k)] = v;
    s.baselines = fixed;
  }
  if (s.firstNightmareSets) {
    s.firstNightmareSets = s.firstNightmareSets.map(sl => ({ ...sl, exercise: renameExercise(sl.exercise) }));
  }
  if (s.workouts) {
    s.workouts = s.workouts.map(w => ({ ...w, sets: w.sets.map(sl => ({ ...sl, exercise: renameExercise(sl.exercise) })) }));
  }
  if (s.aspect?.exercise) s.aspect.exercise = renameExercise(s.aspect.exercise);

  // Backfill repBaselines from workout history for any exercise that has a
  // weight baseline but no rep baseline (covers old saves and partial data).
  if (s.workouts.length > 0) {
    for (const [ex, baselineWeight] of Object.entries(s.baselines)) {
      if (s.repBaselines[ex] === undefined) {
        let best = 0;
        for (const w of s.workouts) {
          for (const set of w.sets) {
            if (set.exercise === ex && set.weight === baselineWeight) {
              best = Math.max(best, set.reps);
            }
          }
        }
        if (best > 0) s.repBaselines[ex] = best;
      }
    }
  }

  return s;
}

let listeners: Array<() => void> = [];
let state: GameState = (() => {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return migrateState(JSON.parse(raw));

    // Fallback: if the per-user key has no data but the legacy key does, migrate it now.
    // This covers the case where the initial register() migration was skipped (e.g. the
    // profile check failed on old data, or the user re-registered after a partial migration).
    if (KEY !== LEGACY_STATE_KEY) {
      const legacyRaw = localStorage.getItem(LEGACY_STATE_KEY);
      if (legacyRaw) {
        try {
          localStorage.setItem(KEY, legacyRaw);
          localStorage.removeItem(LEGACY_STATE_KEY);
        } catch {}
        return migrateState(JSON.parse(legacyRaw));
      }
    }

    return DEFAULT;
  } catch { return DEFAULT; }
})();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  // Publish a public profile snapshot so other accounts on this device can see
  // this player's real stats on the leaderboard, friends list, and cohort view.
  if (typeof window !== "undefined" && state.profile) {
    const user = getCurrentUser();
    if (user && user !== "__guest__") {
      try {
        updatePublicProfile({
          username:         user,
          displayName:      state.profile.name,
          rank:             computeRank(state.nightmaresPassed, state.workouts.length),
          totalShards:      state.totalShards,
          nightmaresPassed: state.nightmaresPassed,
          workoutsCount:    state.workouts.length,
          aspect:           state.aspect,
          flaw:             state.flaw,
          trueName:         state.trueName ?? null,
          cohortCode:       getCohortByMember(user)?.code ?? null,
          updatedAt:        Date.now(),
        });
      } catch {}
    }
  }
  listeners.forEach(l => l());
}

export function useGame() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick(t => t + 1);
    listeners.push(l);
    return () => { listeners = listeners.filter(x => x !== l); };
  }, []);

  const setProfile = useCallback((p: Profile) => {
    state = { ...state, profile: p }; persist();
  }, []);

  const completeFirstNightmare = useCallback(
    (sets: SetLog[], aspect: Aspect, flaw: Flaw, trueName?: TrueName) => {
      const baselines: Record<string, number> = { ...state.baselines };
      sets.forEach(s => { baselines[s.exercise] = s.weight; });
      state = {
        ...state,
        firstNightmareSets: sets, lastNightmareSets: sets, aspect, flaw, trueName, baselines,
        nightmaresPassed: 1,
        nightmareHistory: [...state.nightmareHistory, { nm: 1, requiredPct: 0, achievedPct: 100 }],
      };
      persist();
    }, []);

  const attemptNightmare = useCallback(
    (passed: boolean, shardPenalty: number, record?: NightmareRecord, newSets?: SetLog[], newTrueName?: TrueName) => {
      if (passed) {
        const newNm = state.nightmaresPassed + 1;
        state = {
          ...state,
          nightmaresPassed: newNm,
          aspect: state.aspect ? upgradeAspect(state.aspect, newNm) : state.aspect,
          ...(newTrueName ? { trueName: newTrueName } : {}),
          ...(newSets ? { lastNightmareSets: newSets } : {}),
          ...(record ? { nightmareHistory: [...state.nightmareHistory, record] } : {}),
        };
      } else {
        state = { ...state, totalShards: Math.max(0, state.totalShards - shardPenalty) };
      }
      persist();
    }, []);

  const logWorkout = useCallback((w: Workout) => {
    const baselines = { ...state.baselines };
    const repBaselines = { ...state.repBaselines };
    w.sets.forEach(s => {
      const curWeight = baselines[s.exercise];
      const curReps   = repBaselines[s.exercise];
      if (curWeight === undefined) {
        // Brand-new exercise — always seed the baseline so it can be tracked going forward.
        baselines[s.exercise]    = s.weight;
        repBaselines[s.exercise] = s.reps;
      } else if (s.weight > curWeight) {
        // Weight PR — only commit the new weight as the baseline if 8+ reps were performed.
        // A sub-8-rep PR is recognised in-session (shards, memory rolls) but the bar stays
        // at the old weight so the player must prove the lift properly before it "counts".
        if (s.reps >= 8) {
          baselines[s.exercise]    = s.weight;
          repBaselines[s.exercise] = s.reps;
        }
      } else if (s.weight >= curWeight) {
        if (curReps === undefined) {
          // No rep baseline yet (old save or first set at this weight) — seed it
          // so the *next* workout can detect a rep PR via comparison.
          repBaselines[s.exercise] = s.reps;
        } else if (s.reps >= curReps + 2) {
          // Rep PR — update rep baseline only
          repBaselines[s.exercise] = s.reps;
        }
      }
    });
    state = {
      ...state,
      workouts: [w, ...state.workouts],
      totalShards: state.totalShards + w.shardsEarned,
      baselines,
      repBaselines,
      memories: [...(w.drops ?? []), ...state.memories],
    };
    persist();
  }, []);

  const equipMemory = useCallback((id: string) => {
    if (state.equippedMemoryIds.includes(id)) return;
    // Enforce per-category equip limit
    const mem = state.memories.find(m => m.id === id);
    if (mem) {
      const limit = EQUIP_LIMITS[mem.type as MemoryType];
      if (isFinite(limit)) {
        const slotsFilled = state.memories.filter(
          m => state.equippedMemoryIds.includes(m.id) && m.type === mem.type
        ).length;
        if (slotsFilled >= limit) return;
      }
    }
    state = { ...state, equippedMemoryIds: [...state.equippedMemoryIds, id] };
    persist();
  }, []);

  const unequipMemory = useCallback((id: string) => {
    state = { ...state, equippedMemoryIds: state.equippedMemoryIds.filter(x => x !== id) };
    persist();
  }, []);

  const addMemories = useCallback((mems: Memory[]) => {
    if (!mems.length) return;
    state = { ...state, memories: [...mems, ...state.memories] };
    persist();
  }, []);

  const savePendingNightmare = useCallback((p: PendingNightmare) => {
    state = { ...state, pendingNightmare: p }; persist();
  }, []);

  const clearPendingNightmare = useCallback(() => {
    state = { ...state, pendingNightmare: null }; persist();
  }, []);

  const setPlatform    = useCallback((p: Platform) => {
    state = { ...state, platform: p }; persist();
  }, []);

  const setTutorialSeen = useCallback(() => {
    state = { ...state, tutorialSeen: true }; persist();
  }, []);

  const setNightmarePostponed = useCallback((v: boolean) => {
    state = { ...state, nightmarePostponed: v }; persist();
  }, []);

  const addCustomDay = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed || state.customDays.includes(trimmed)) return;
    state = { ...state, customDays: [...state.customDays, trimmed] };
    persist();
  }, []);

  const removeCustomDay = useCallback((name: string) => {
    state = { ...state, customDays: state.customDays.filter(d => d !== name) };
    persist();
  }, []);

  const joinCohort  = useCallback((c: Cohort) => { state = { ...state, cohort: c }; persist(); }, []);
  const leaveCohort = useCallback(() => { state = { ...state, cohort: null }; persist(); }, []);
  const reset       = useCallback(() => { state = DEFAULT; persist(); }, []);
  const devOverride = useCallback((patches: Partial<GameState>) => {
    state = { ...state, ...patches };
    persist();
  }, []);

  return {
    state,
    setProfile,
    completeFirstNightmare,
    logWorkout,
    joinCohort,
    leaveCohort,
    reset,
    attemptNightmare,
    equipMemory,
    unequipMemory,
    addMemories,
    savePendingNightmare,
    clearPendingNightmare,
    setPlatform,
    setTutorialSeen,
    addCustomDay,
    removeCustomDay,
    setNightmarePostponed,
    devOverride,
  };
}
