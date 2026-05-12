import { useEffect, useState, useCallback } from "react";
import {
  type Aspect, type Flaw, type SetLog, type TrueName,
  migrateAspect, migrateFlaw, migrateTrueName,
} from "./game";
import type { Memory } from "./memories";

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

export type GameState = {
  profile: Profile | null;
  firstNightmareSets: SetLog[] | null;
  aspect: Aspect | null;
  flaw: Flaw | null;
  trueName?: TrueName;
  totalShards: number;
  workouts: Workout[];
  baselines: Record<string, number>;
  memories: Memory[];
  equippedMemoryIds: string[];
  cohort: Cohort | null;
  nightmaresPassed: number;
};

const KEY = "shadow-slave-state-v1";

const DEFAULT: GameState = {
  profile: null,
  firstNightmareSets: null,
  aspect: null,
  flaw: null,
  totalShards: 0,
  workouts: [],
  baselines: {},
  memories: [],
  equippedMemoryIds: [],
  cohort: null,
  nightmaresPassed: 0,
};

function migrateState(raw: Partial<GameState>): GameState {
  const s: GameState = { ...DEFAULT, ...raw };
  s.equippedMemoryIds = s.equippedMemoryIds ?? [];
  if (s.aspect)    s.aspect   = migrateAspect(s.aspect);
  if (s.flaw)      s.flaw     = migrateFlaw(s.flaw);
  if (s.trueName)  s.trueName = migrateTrueName(s.trueName);
  return s;
}

let listeners: Array<() => void> = [];
let state: GameState = (() => {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? migrateState(JSON.parse(raw)) : DEFAULT;
  } catch { return DEFAULT; }
})();

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
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
      state = { ...state, firstNightmareSets: sets, aspect, flaw, trueName, baselines, nightmaresPassed: 1 };
      persist();
    }, []);

  const attemptNightmare = useCallback(
    (passed: boolean, shardPenalty: number, newTrueName?: TrueName) => {
      if (passed) {
        state = {
          ...state,
          nightmaresPassed: state.nightmaresPassed + 1,
          ...(newTrueName ? { trueName: newTrueName } : {}),
        };
      } else {
        state = { ...state, totalShards: Math.max(0, state.totalShards - shardPenalty) };
      }
      persist();
    }, []);

  const logWorkout = useCallback((w: Workout) => {
    const baselines = { ...state.baselines };
    w.sets.forEach(s => {
      if (!baselines[s.exercise] || s.weight > baselines[s.exercise]) {
        baselines[s.exercise] = s.weight;
      }
    });
    state = {
      ...state,
      workouts: [w, ...state.workouts],
      totalShards: state.totalShards + w.shardsEarned,
      baselines,
      memories: [...(w.drops ?? []), ...state.memories],
    };
    persist();
  }, []);

  const equipMemory = useCallback((id: string) => {
    if (state.equippedMemoryIds.includes(id)) return;
    state = { ...state, equippedMemoryIds: [...state.equippedMemoryIds, id] };
    persist();
  }, []);

  const unequipMemory = useCallback((id: string) => {
    state = { ...state, equippedMemoryIds: state.equippedMemoryIds.filter(x => x !== id) };
    persist();
  }, []);

  const joinCohort  = useCallback((c: Cohort) => { state = { ...state, cohort: c }; persist(); }, []);
  const leaveCohort = useCallback(() => { state = { ...state, cohort: null }; persist(); }, []);
  const reset       = useCallback(() => { state = DEFAULT; persist(); }, []);

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
  };
}
