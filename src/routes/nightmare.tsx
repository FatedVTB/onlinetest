import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useGame, type PendingNightmareEntry } from "@/lib/store";
import {
  MUSCLE_GROUPS, EXERCISES, BODYWEIGHT_EXERCISES, UNILATERAL_EXERCISES, judgeFirstNightmare, computeRank, TRUE_NAMES,
  computeBonuses, calcNMPenalty, strongestMuscleFromBaselines, ASPECT_RANK_MULT,
  type SetLog, type MuscleGroup, type TrueName, type Rank, type Aspect,
} from "@/lib/game";
import { getMemoryEffect, rollFirstNightmareMemoryDrop, rollNightmareMemoryDrops, RANK_COLOR } from "@/lib/memories";
import type { Memory } from "@/lib/memories";
import { getCurrentUser } from "@/lib/auth";
import {
  getActiveCohortNightmareSession, getCohortNightmareSession,
  joinCohortNightmarePresence, leaveCohortNightmarePresence,
  requestCohortNightmarePause, cancelCohortNightmarePause,
  submitCohortNightmareSets, deleteCohortNightmareSession,
  type CohortNightmareSession,
} from "@/lib/social";

export const Route = createFileRoute("/nightmare")({
  component: Nightmare,
  head: () => ({ meta: [{ title: "Nightmare — Shadow Slave" }] }),
});

type Entry = { exercise: string; weight: string; reps: string; addWeight: boolean; extraWeight: string };

function Nightmare() {
  const navigate = useNavigate();
  const { state, completeFirstNightmare, attemptNightmare, addMemories, savePendingNightmare, clearPendingNightmare } = useGame();
  const currentUser = getCurrentUser();

  // ── Cohort nightmare session ───────────────────────────────────────────────
  const [cohortSessionId] = useState<string | null>(
    () => currentUser ? (getActiveCohortNightmareSession(currentUser)?.id ?? null) : null
  );
  const [cohortSession, setCohortSession] = useState<CohortNightmareSession | null>(
    () => cohortSessionId ? getCohortNightmareSession(cohortSessionId) : null
  );
  const [pauseRequested, setPauseRequested]   = useState(false);
  const [setsSubmitted, setSetsSubmitted]     = useState(false);
  const hasJudgedCohort = useRef(false);
  // Always-current judge reference for polling callback
  const judgeRef = useRef<() => void>(() => {});
  useEffect(() => { judgeRef.current = judge; });

  // Mark as present and poll every 3 s
  useEffect(() => {
    if (!cohortSessionId || !currentUser) return;
    joinCohortNightmarePresence(cohortSessionId, currentUser);
    setCohortSession(getCohortNightmareSession(cohortSessionId));

    const id = setInterval(() => {
      const s = getCohortNightmareSession(cohortSessionId);
      setCohortSession(s);
      if (!s) return;
      // All agreed to pause → leave the nightmare
      if (s.status === "paused") {
        clearInterval(id);
        navigate({ to: "/dreamrealm" });
        return;
      }
      // All submitted → run judge locally (each member judges independently with same data)
      if (
        s.acceptedMembers.length > 0 &&
        s.acceptedMembers.every(m => s.finishRequests.includes(m)) &&
        !hasJudgedCohort.current
      ) {
        hasJudgedCohort.current = true;
        clearInterval(id);
        judgeRef.current();
      }
    }, 3_000);

    return () => {
      clearInterval(id);
      if (currentUser && cohortSessionId) leaveCohortNightmarePresence(cohortSessionId, currentUser);
    };
  }, [cohortSessionId, currentUser]);

  // Cohort bonuses
  const cohortExtraMembers  = cohortSession ? cohortSession.acceptedMembers.length - 1 : 0;
  const cohortThresholdReduction = cohortExtraMembers * 0.03; // -3 pct pts per extra member
  const cohortMemoryBonus        = cohortExtraMembers * 10;   // +10% memory drops per extra member

  const isFirst = !state.firstNightmareSets;
  const baseSets = state.lastNightmareSets ?? state.firstNightmareSets ?? [];
  const nightmareNumber = state.nightmaresPassed + 1;

  // Restore a paused nightmare if one exists for this nightmare number
  const pending = state.pendingNightmare?.nightmareNumber === nightmareNumber
    ? state.pendingNightmare : null;

  const [entries, setEntries] = useState<Record<MuscleGroup, Entry>>(() =>
    Object.fromEntries(MUSCLE_GROUPS.map(m => {
      const prior = baseSets.find(s => s.muscle === m);
      const saved = pending?.entries[m];
      return [m, {
        exercise: saved?.exercise ?? prior?.exercise ?? EXERCISES[m][0],
        weight:   saved ? String(saved.weight) : "",
        reps:     saved ? String(saved.reps)   : "",
        addWeight: false,
        extraWeight: "",
      }];
    })) as Record<MuscleGroup, Entry>
  );
  // In cohort mode the threshold comes from the session (rolled by initiator).
  // For solo or first nightmare it's rolled locally.
  const [nmThreshold] = useState(() => {
    if (cohortSession) return Math.max(0.05, cohortSession.nmThreshold - cohortThresholdReduction);
    return pending?.nmThreshold ?? 0.10 + Math.random() * 0.20;
  });

  // Muscles locked from a previous session — displayed read-only
  const [lockedMuscles] = useState<Set<MuscleGroup>>(
    () => new Set(Object.keys(pending?.entries ?? {}) as MuscleGroup[])
  );
  const [nightmareDrops, setNightmareDrops] = useState<Memory[]>([]);
  const [rankUpInfo, setRankUpInfo] = useState<{ newRank: Rank } | null>(null);
  const [firstResult, setFirstResult] = useState<ReturnType<typeof judgeFirstNightmare> | null>(null);
  const [challengeResult, setChallengeResult] = useState<{
    passed: boolean;
    avgImprovement: number;
    penalty: number;
    trueName?: TrueName;
  } | null>(null);

  const bodyWeight = state.profile?.weight ?? 70;
  const allDone = MUSCLE_GROUPS.every(m => {
    const isBW = BODYWEIGHT_EXERCISES.has(entries[m].exercise);
    return isBW ? !!entries[m].reps : (!!entries[m].weight && !!entries[m].reps);
  });

  // Compute bonus context for subsequent NM penalty calc
  const equippedMemories = state.memories.filter(m => state.equippedMemoryIds.includes(m.id));
  const memoryEffects = equippedMemories.map(getMemoryEffect);
  const strongest = strongestMuscleFromBaselines(state.baselines, state.firstNightmareSets);
  const ctx = computeBonuses(state.flaw ?? null, state.trueName ?? null, memoryEffects, strongest);

  function pause() {
    // Save all muscles that have valid values entered this session
    const saved: Partial<Record<MuscleGroup, PendingNightmareEntry>> = { ...(pending?.entries ?? {}) };
    MUSCLE_GROUPS.forEach(m => {
      if (lockedMuscles.has(m)) return; // already saved from a prior session
      const isBW = BODYWEIGHT_EXERCISES.has(entries[m].exercise);
      const w = isBW ? bodyWeight + Number(entries[m].extraWeight || 0) : Number(entries[m].weight);
      const r = Number(entries[m].reps);
      if (r > 0 && (isBW ? true : w > 0)) {
        saved[m] = { exercise: entries[m].exercise, weight: w, reps: r };
      }
    });
    savePendingNightmare({ nightmareNumber, nmThreshold, entries: saved });

    if (cohortSessionId && currentUser) {
      // Cohort pause: request pause and wait for all to agree (polling will navigate away when status = "paused")
      requestCohortNightmarePause(cohortSessionId, currentUser);
      setPauseRequested(true);
      // Don't navigate yet — polling will detect "paused" status and navigate
      return;
    }
    navigate({ to: "/dreamrealm" });
  }

  function update(m: MuscleGroup, patch: Partial<Entry>) {
    setEntries(prev => {
      const next = { ...prev[m], ...patch };
      if ("exercise" in patch) {
        next.weight = "";
        next.extraWeight = "";
        next.addWeight = false;
      }
      return { ...prev, [m]: next };
    });
  }

  function judge() {
    const sets: SetLog[] = MUSCLE_GROUPS.map(m => {
      const isBW = BODYWEIGHT_EXERCISES.has(entries[m].exercise);
      return {
        muscle: m,
        exercise: entries[m].exercise,
        weight: isBW ? bodyWeight + Number(entries[m].extraWeight || 0) : Number(entries[m].weight),
        reps: Number(entries[m].reps),
      };
    });

    if (isFirst) {
      const r = judgeFirstNightmare(sets, state.profile?.name);
      const firstDrop = rollFirstNightmareMemoryDrop();
      const drops = firstDrop ? [firstDrop] : [];
      setNightmareDrops(drops);
      setFirstResult(r);
      completeFirstNightmare(sets, r.aspect, r.flaw, r.trueName);
      clearPendingNightmare();
      addMemories(drops);
      return;
    }

    // ── COHORT: submit sets and wait for everyone, or run combined judge ──────
    if (cohortSessionId && currentUser) {
      // First call: submit this user's sets to the session
      if (!setsSubmitted) {
        submitCohortNightmareSets(cohortSessionId, currentUser, sets);
        setSetsSubmitted(true);
        // Polling will detect when all finishRequests are in and call judge() again via judgeRef
        return;
      }

      // Second call (from polling): all members submitted — do combined judge
      const freshSession = getCohortNightmareSession(cohortSessionId);
      if (!freshSession) return;

      // Combined bilateral volume for each muscle across all members
      const combinedCurrentVol:  Record<string, number> = {};
      const combinedBaselineVol: Record<string, number> = {};

      for (const member of freshSession.acceptedMembers) {
        const memberSets     = freshSession.memberSubmittedSets[member] ?? [];
        const memberBaseline = freshSession.memberLastNightmareSets[member] ?? [];
        for (const muscle of MUSCLE_GROUPS) {
          const cur   = memberSets.find(s => s.muscle === muscle);
          const prior = memberBaseline.find(s => s.muscle === muscle);
          if (cur) {
            const w = UNILATERAL_EXERCISES.has(cur.exercise) ? cur.weight * 2 : cur.weight;
            combinedCurrentVol[muscle] = (combinedCurrentVol[muscle] ?? 0) + w * cur.reps;
          }
          if (prior && prior.weight * prior.reps > 0) {
            const pw = UNILATERAL_EXERCISES.has(prior.exercise) ? prior.weight * 2 : prior.weight;
            combinedBaselineVol[muscle] = (combinedBaselineVol[muscle] ?? 0) + pw * prior.reps;
          }
        }
      }

      const improvements = MUSCLE_GROUPS.map(m => {
        const base = combinedBaselineVol[m];
        const curr = combinedCurrentVol[m];
        if (!base || base === 0) return 0;
        return (curr - base) / base;
      });
      const avg    = improvements.reduce((a, b) => a + b, 0) / improvements.length;
      const passed = avg >= nmThreshold;

      // Clean up session (idempotent)
      deleteCohortNightmareSession(cohortSessionId);

      let newTrueName: TrueName | undefined;
      if (passed && !state.trueName && Math.random() < 0.30) {
        newTrueName = TRUE_NAMES[Math.floor(Math.random() * TRUE_NAMES.length)];
      }
      const penalty = passed ? 0 : calcNMPenalty(state.totalShards, ctx);

      // Cohort memory bonus: +10% per extra member on both nightmare channels
      const d = ctx.memoryDoubleCount;
      function nmChannelCohort(basePct: number): number {
        return Math.min(80, (basePct + ctx.memoryDropChancePct + cohortMemoryBonus) * (d >= 1 ? 2 : 1) + Math.max(0, d - 1) * 10);
      }
      const nmNormalChance = nmChannelCohort(50);
      const nmEliteChance  = nmChannelCohort(10);
      const drops = passed ? rollNightmareMemoryDrops(ctx.memoryRankBoost, nmNormalChance, nmEliteChance) : [];
      setNightmareDrops(drops);

      if (passed) clearPendingNightmare();
      if (passed) {
        const oldRank = computeRank(state.nightmaresPassed, state.workouts.length);
        const newRank = computeRank(state.nightmaresPassed + 1, state.workouts.length);
        if (newRank !== oldRank) setRankUpInfo({ newRank });
      }

      const record = passed
        ? { nm: nightmareNumber, requiredPct: nmThreshold * 100, achievedPct: avg * 100 }
        : undefined;
      attemptNightmare(passed, penalty, record, passed ? sets : undefined, newTrueName);
      addMemories(drops);
      setChallengeResult({ passed, avgImprovement: avg, penalty, trueName: newTrueName });
      return;
    }

    // ── SOLO judge ────────────────────────────────────────────────────────────
    const improvements = sets.map(s => {
      const prior = baseSets.find(b => b.muscle === s.muscle);
      if (!prior || prior.weight * prior.reps === 0) return 0;
      const priorW   = UNILATERAL_EXERCISES.has(prior.exercise) ? prior.weight * 2 : prior.weight;
      const currentW = UNILATERAL_EXERCISES.has(s.exercise) ? s.weight * 2 : s.weight;
      const firstVol   = priorW * prior.reps;
      const currentVol = currentW * s.reps;
      return (currentVol - firstVol) / firstVol;
    });
    const avg = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    const passed = avg >= nmThreshold;

    let newTrueName: TrueName | undefined;
    if (passed && !state.trueName && Math.random() < 0.30) {
      newTrueName = TRUE_NAMES[Math.floor(Math.random() * TRUE_NAMES.length)];
    }

    const penalty = passed ? 0 : calcNMPenalty(state.totalShards, ctx);

    // Per-channel nightmare drop chances
    const d = ctx.memoryDoubleCount;
    function nmChannel(basePct: number): number {
      return Math.min(80, (basePct + ctx.memoryDropChancePct) * (d >= 1 ? 2 : 1) + Math.max(0, d - 1) * 10);
    }
    const nmNormalChance = nmChannel(50);
    const nmEliteChance  = nmChannel(10);
    const drops = passed ? rollNightmareMemoryDrops(ctx.memoryRankBoost, nmNormalChance, nmEliteChance) : [];
    setNightmareDrops(drops);

    if (passed) clearPendingNightmare();
    if (passed) {
      const oldRank = computeRank(state.nightmaresPassed, state.workouts.length);
      const newRank = computeRank(state.nightmaresPassed + 1, state.workouts.length);
      if (newRank !== oldRank) setRankUpInfo({ newRank });
    }

    const record = passed
      ? { nm: nightmareNumber, requiredPct: nmThreshold * 100, achievedPct: avg * 100 }
      : undefined;
    attemptNightmare(passed, penalty, record, passed ? sets : undefined, newTrueName);
    addMemories(drops);
    setChallengeResult({ passed, avgImprovement: avg, penalty, trueName: newTrueName });
  }

  // ── Cohort: waiting for all members to arrive ─────────────────────────────
  if (cohortSession && cohortSession.status !== "active" && cohortSession.status !== "finished") {
    const allPresent = cohortSession.acceptedMembers.every(m => cohortSession.presentMembers.includes(m));
    const waiting    = cohortSession.acceptedMembers.filter(m => !cohortSession.presentMembers.includes(m));
    return (
      <div className="min-h-screen px-5 py-8 max-w-md mx-auto flex flex-col items-center justify-center text-center">
        <p className="text-4xl mb-5">⏳</p>
        <p className="font-display text-sm text-destructive tracking-[0.15em] mb-2">
          {cohortSession.status === "paused" ? "NIGHTMARE PAUSED" : "WAITING FOR COHORT"}
        </p>
        <p className="text-[11px] text-muted-foreground mb-4">
          {cohortSession.status === "paused"
            ? "The nightmare is paused. All members must return to resume."
            : `Waiting for ${waiting.join(", ")} to enter the nightmare.`}
        </p>
        <div className="w-full bg-surface-2 border-rune p-3 mb-6 space-y-1.5 text-left">
          {cohortSession.acceptedMembers.map(m => (
            <div key={m} className="flex items-center justify-between">
              <p className="text-[11px] text-foreground/80">{m}{m === currentUser ? " (you)" : ""}</p>
              <span className={`text-[10px] ${cohortSession.presentMembers.includes(m) ? "text-accent" : "text-muted-foreground"}`}>
                {cohortSession.presentMembers.includes(m) ? "● Ready" : "○ Not yet"}
              </span>
            </div>
          ))}
          {cohortSession.pendingMembers.length > 0 && (
            <p className="text-[9px] text-muted-foreground/50 pt-1">{cohortSession.pendingMembers.join(", ")} invited but haven't joined yet</p>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">Polling every 3 seconds…</p>
      </div>
    );
  }

  // ── Cohort: sets submitted, waiting for others ────────────────────────────
  if (cohortSession && setsSubmitted) {
    const waiting = cohortSession.acceptedMembers.filter(m => !cohortSession.finishRequests.includes(m));
    return (
      <div className="min-h-screen px-5 py-8 max-w-md mx-auto flex flex-col items-center justify-center text-center">
        <p className="text-4xl mb-5">⚔</p>
        <p className="font-display text-sm text-gold tracking-[0.15em] mb-2">SETS SUBMITTED</p>
        <p className="text-[11px] text-muted-foreground mb-4">
          Waiting for {waiting.join(", ")} to finish their sets.
        </p>
        <div className="w-full bg-surface-2 border-rune p-3 mb-4 space-y-1.5 text-left">
          {cohortSession.acceptedMembers.map(m => (
            <div key={m} className="flex items-center justify-between">
              <p className="text-[11px] text-foreground/80">{m}{m === currentUser ? " (you)" : ""}</p>
              <span className={`text-[10px] ${cohortSession.finishRequests.includes(m) ? "text-gold" : "text-muted-foreground"}`}>
                {cohortSession.finishRequests.includes(m) ? "✓ Submitted" : "○ In progress"}
              </span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">Judgment will run automatically once all submit.</p>
      </div>
    );
  }

  // ── Cohort: pause requested, waiting for others ───────────────────────────
  if (cohortSession && pauseRequested) {
    const waiting = cohortSession.acceptedMembers.filter(m => !cohortSession.pauseRequests.includes(m));
    return (
      <div className="min-h-screen px-5 py-8 max-w-md mx-auto flex flex-col items-center justify-center text-center">
        <p className="text-4xl mb-5">⏸</p>
        <p className="font-display text-sm text-muted-foreground tracking-[0.15em] mb-2">PAUSE REQUESTED</p>
        <p className="text-[11px] text-muted-foreground mb-4">
          Waiting for {waiting.join(", ")} to also agree to pause.
        </p>
        <button
          onClick={() => {
            if (cohortSessionId && currentUser) {
              cancelCohortNightmarePause(cohortSessionId, currentUser);
              setPauseRequested(false);
            }
          }}
          className="border border-rune px-6 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Cancel Pause Request
        </button>
      </div>
    );
  }

  if (rankUpInfo) {
    return (
      <RankUpScreen
        newRank={rankUpInfo.newRank}
        aspect={state.aspect}
        drops={nightmareDrops}
        onContinue={() => setRankUpInfo(null)}
      />
    );
  }

  if (firstResult) {
    const newRank = computeRank(1, state.workouts.length);
    return (
      <div className="min-h-screen px-6 py-10 max-w-md mx-auto">
        <p className="text-xs uppercase tracking-[0.4em] text-accent mb-3 text-center">Judgment</p>
        <h1 className="font-display text-3xl text-glow text-center mb-8">The Spell Has Spoken</h1>

        {firstResult.trueName && (
          <div className="bg-ember rounded-2xl p-5 mb-5 text-center shadow-ember">
            <p className="text-xs uppercase tracking-widest text-shadow">True Name Granted</p>
            <p className="font-display text-2xl text-shadow mt-1">{firstResult.trueName.name}</p>
            <p className="text-xs text-shadow/80 mt-2">{firstResult.trueName.description}</p>
          </div>
        )}

        <div className="bg-card border-rune rounded-2xl p-5 mb-4 shadow-card">
          <p className="text-xs uppercase tracking-widest text-accent">Aspect · {firstResult.aspect.rank}</p>
          <p className="font-display text-xl text-glow mt-1">{firstResult.aspect.name}</p>
          <p className="text-sm text-muted-foreground mt-2">{firstResult.aspect.description}</p>
          <p className="text-[10px] text-accent mt-2 tracking-wide">Triggered by: {firstResult.aspect.exercise}</p>
        </div>

        <div className="rounded-2xl p-5 border border-destructive/40 bg-card mb-8 shadow-card">
          <p className="text-xs uppercase tracking-widest text-destructive">Flaw</p>
          <p className="font-display text-xl mt-1">{firstResult.flaw.name}</p>
          <p className="text-sm text-muted-foreground mt-2">{firstResult.flaw.description}</p>
        </div>

        <div className="bg-surface-2 border-rune rounded-2xl p-4 mb-6 text-center">
          <p className="text-[10px] text-muted-foreground tracking-wider mb-1">Rank Attained</p>
          <p className="font-display text-gold tracking-widest">{newRank.toUpperCase()}</p>
        </div>

        <MemoryDrops drops={nightmareDrops} />

        <button
          onClick={() => navigate({ to: "/" })}
          className="w-full bg-spell text-primary-foreground font-display tracking-widest py-4 rounded-2xl shadow-spell"
        >
          Enter the Dream Realm
        </button>
      </div>
    );
  }

  if (challengeResult) {
    const newRank = computeRank(state.nightmaresPassed, state.workouts.length);
    const pct = (challengeResult.avgImprovement * 100).toFixed(1);
    return (
      <div className="min-h-screen px-6 py-10 max-w-md mx-auto text-center">
        <p className="text-xs uppercase tracking-[0.4em] text-accent mb-3">
          {challengeResult.passed ? "Triumph" : "Defeat"}
        </p>
        <h1 className={`font-display text-3xl mb-6 ${challengeResult.passed ? "text-gold" : "text-destructive"}`}>
          {challengeResult.passed ? "Nightmare Slain" : "The Nightmare Endures"}
        </h1>

        <div className="bg-surface-2 border-rune p-5 mb-4">
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Avg Volume Improvement</p>
          <p className="font-display text-3xl text-gold">{pct}%</p>
        </div>

        {challengeResult.passed ? (
          <>
            <div className="bg-surface-2 border-l-2 border-l-gold p-4 mb-4 text-left">
              <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Rank Ascended</p>
              <p className="font-display text-xl mt-1">{newRank}</p>
            </div>
            {challengeResult.trueName && (
              <div className="bg-ember rounded-2xl p-4 mb-4 text-center">
                <p className="text-xs uppercase tracking-widest text-shadow">True Name Revealed</p>
                <p className="font-display text-xl text-shadow mt-1">{challengeResult.trueName.name}</p>
                <p className="text-xs text-shadow/80 mt-1">{challengeResult.trueName.description}</p>
              </div>
            )}
          </>
        ) : (
          <div className="bg-surface-2 border-l-2 border-l-destructive p-4 mb-6 text-left">
            <p className="text-[10px] uppercase tracking-[0.2em] text-destructive">Soul Shards Lost</p>
            <p className="font-display text-xl mt-1">−{challengeResult.penalty.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground mt-1">Train harder and challenge the Nightmare again.</p>
          </div>
        )}

        <MemoryDrops drops={nightmareDrops} />

        <button
          onClick={() => navigate({ to: "/" })}
          className="w-full bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-3.5"
        >
          RETURN
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-5 py-8 max-w-md mx-auto pb-32">
      <Link to="/" className="text-xs text-muted-foreground uppercase tracking-widest">← Retreat</Link>
      <p className="text-xs uppercase tracking-[0.4em] text-accent mt-4 text-center">
        {isFirst ? "First Nightmare" : `${nightmareNumber}${ordinal(nightmareNumber)} Nightmare`}
      </p>
      <h1 className="font-display text-2xl text-glow text-center mt-1 mb-2">One Set, Each Muscle</h1>
      <p className="text-center text-xs text-muted-foreground mb-6">
        {isFirst
          ? "Choose an exercise per group. Lift heavy or chase reps — the Spell judges all."
          : "Beat your first-nightmare volume (weight × reps) by an unknown threshold to ascend. Fail and lose 15–45% of your shards."}
      </p>

      {/* Cohort status panel */}
      {cohortSession && (
        <div className="bg-surface-2 border border-destructive/40 px-3.5 py-2.5 mb-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.15em] text-destructive">
              ☠ {cohortSession.cohortName} — NM{cohortSession.nightmareNumber}
            </p>
            <p className="text-[9px] text-muted-foreground">
              {cohortSession.acceptedMembers.length} member{cohortSession.acceptedMembers.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5">
            <p className="text-[10px] text-foreground/70">−{(cohortThresholdReduction * 100).toFixed(0)}% threshold</p>
            <p className="text-[10px] text-foreground/70">+{cohortMemoryBonus}% memory drops</p>
            <p className="text-[10px] text-foreground/70">Combined Kgs</p>
          </div>
          <div className="space-y-1 pt-0.5">
            {cohortSession.acceptedMembers.map(m => (
              <div key={m} className="flex items-center justify-between">
                <p className="text-[10px] text-foreground/60">{m}{m === currentUser ? " (you)" : ""}</p>
                <span className={`text-[9px] ${cohortSession.presentMembers.includes(m) ? "text-accent" : "text-muted-foreground"}`}>
                  {cohortSession.presentMembers.includes(m) ? "● Active" : "○ Away"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resume banner */}
      {pending && (
        <div className="bg-surface-2 border-l-2 border-l-accent px-3.5 py-2.5 mb-3 flex items-center justify-between">
          <p className="text-[11px] text-accent tracking-wider">
            Resuming — {Object.keys(pending.entries).length}/{MUSCLE_GROUPS.length} muscles saved
          </p>
          <p className="text-[10px] text-muted-foreground">Fill remaining to submit</p>
        </div>
      )}

      <div className="space-y-3">
        {MUSCLE_GROUPS.map(m => {
          const prior = baseSets.find(s => s.muscle === m);
          const priorIsUni = prior ? UNILATERAL_EXERCISES.has(prior.exercise) : false;
          const priorBilateralW = prior ? (priorIsUni ? prior.weight * 2 : prior.weight) : 0;
          const firstVol = prior ? priorBilateralW * prior.reps : null;
          const isBW = BODYWEIGHT_EXERCISES.has(entries[m].exercise);
          const isUni = UNILATERAL_EXERCISES.has(entries[m].exercise);
          const effectiveW = isBW
            ? bodyWeight + Number(entries[m].extraWeight || 0)
            : Number(entries[m].weight);
          const isLocked = lockedMuscles.has(m);

          // Locked (saved from a previous session) — read-only display
          if (isLocked) {
            return (
              <div key={m} className="bg-card border-rune rounded-2xl p-4 shadow-card opacity-75">
                <div className="flex items-center justify-between">
                  <span className="font-display text-lg text-glow">{m}</span>
                  <span className="text-[10px] text-accent tracking-[0.15em]">✓ SAVED</span>
                </div>
                <p className="text-sm mt-2 text-foreground/80">{entries[m].exercise}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {entries[m].weight}kg × {entries[m].reps} reps
                  {firstVol !== null && (() => {
                    const bilateralW = isUni ? effectiveW * 2 : effectiveW;
                    const currentVol = bilateralW * Number(entries[m].reps);
                    const imp = ((currentVol - firstVol) / firstVol * 100).toFixed(1);
                    return <span className="ml-2 text-muted-foreground/60">· {imp}% vs last NM</span>;
                  })()}
                </p>
              </div>
            );
          }

          return (
            <div key={m} className="bg-card border-rune rounded-2xl p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-lg text-glow">{m}</span>
                {prior && firstVol !== null && (
                  <span className="text-[10px] text-muted-foreground tracking-wider">
                    Last NM: {prior.weight}kg×{prior.reps}{priorIsUni ? " (uni)" : ""} ({firstVol} bil.vol)
                  </span>
                )}
              </div>
              <select
                value={entries[m].exercise}
                onChange={e => update(m, { exercise: e.target.value })}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm mb-2"
              >
                {EXERCISES[m].map(ex => (
                  <option key={ex} value={ex}>{ex}{UNILATERAL_EXERCISES.has(ex) ? " (single)" : ""}</option>
                ))}
              </select>
              {isBW ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer select-none whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={entries[m].addWeight}
                        onChange={e => update(m, { addWeight: e.target.checked, extraWeight: "" })}
                        className="accent-gold"
                      />
                      Add weight
                    </label>
                    {entries[m].addWeight ? (
                      <input
                        type="number"
                        placeholder="+kg"
                        value={entries[m].extraWeight}
                        onChange={e => update(m, { extraWeight: e.target.value })}
                        className="flex-1 bg-input border border-border rounded-lg px-3 py-2 text-sm"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">{bodyWeight}kg bodyweight</span>
                    )}
                  </div>
                  <input
                    type="number"
                    placeholder="Reps"
                    value={entries[m].reps}
                    onChange={e => update(m, { reps: e.target.value })}
                    className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Weight (kg)"
                    value={entries[m].weight}
                    onChange={e => update(m, { weight: e.target.value })}
                    className="bg-input border border-border rounded-lg px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Reps"
                    value={entries[m].reps}
                    onChange={e => update(m, { reps: e.target.value })}
                    className="bg-input border border-border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              )}
              {(() => {
                const bonusKg = ctx.bonusWeightByMuscle[m] ?? 0;
                return (
                  <>
                    {bonusKg > 0 && entries[m].reps && (
                      <p className="mt-1.5 text-[10px] text-purple-bright">
                        +{bonusKg}kg/rep × {entries[m].reps} = +{bonusKg * Number(entries[m].reps)} bonus shards
                      </p>
                    )}
                    {prior && entries[m].reps && (isBW || entries[m].weight) && firstVol !== null && (
                      <div className="mt-1 text-[10px] text-muted-foreground">
                        {(() => {
                          const bilateralW = isUni ? effectiveW * 2 : effectiveW;
                          const currentVol = bilateralW * Number(entries[m].reps);
                          const imp = ((currentVol - firstVol) / firstVol * 100).toFixed(1);
                          return <span>{imp}% vs last NM{isUni ? " (bilateral equiv)" : ""}</span>;
                        })()}
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          );
        })}
      </div>

      {cohortSession ? (
        // Cohort pause: request pause from all members
        <button
          onClick={pause}
          className="w-full border border-rune text-muted-foreground font-display tracking-[0.15em] text-sm py-3.5 rounded-2xl mt-4"
        >
          REQUEST PAUSE (ALL MUST AGREE)
        </button>
      ) : (
        <button
          onClick={pause}
          className="w-full border border-rune text-muted-foreground font-display tracking-[0.15em] text-sm py-3.5 rounded-2xl mt-4"
        >
          PAUSE & SAVE PROGRESS
        </button>
      )}

      <button
        onClick={judge}
        disabled={!allDone}
        className="w-full bg-spell text-primary-foreground font-display tracking-widest py-4 rounded-2xl shadow-spell mt-3 disabled:opacity-40 disabled:cursor-not-allowed pulse-nightmare"
      >
        {isFirst ? "Submit to the Spell" : cohortSession ? "SUBMIT SETS & WAIT FOR COHORT" : "Challenge the Nightmare"}
      </button>

      {cohortSession && (
        <p className="text-center text-[10px] text-muted-foreground mt-2">
          Judgment runs when all {cohortSession.acceptedMembers.length} members submit · Combined Kgs pooled
        </p>
      )}
    </div>
  );
}

const RANK_UP_DATA: Record<string, { headline: string; sub: string }> = {
  Awakened:    { headline: "You have Awakened.",                          sub: "The shadow stirs within you. You are no longer merely a dreamer." },
  Ascended:    { headline: "You have Ascended.",                          sub: "You have surpassed the first veil. The nightmare bends to your will." },
  Transcended: { headline: "You have Transcended.",                       sub: "Beyond flesh. Beyond fear. Mortal limits are beneath you now." },
  Supreme:     { headline: "You have attained Supremacy.",                sub: "Supremacy is earned in shadow and iron. None stand above you." },
  Sacred:      { headline: "You have reached Apotheosis. You are Sacred.", sub: "You have crossed the threshold between mortal and myth." },
  Divine:      { headline: "You have become Divine.",                     sub: "There are no more veils to pierce. You stand at the apex of all things." },
};

const RANK_SECONDARY_LABEL: Record<string, string> = {
  Awakened:    "Aspect forged from your nightmare trial.",
  Ascended:    "+5% shards on all exercises in your aspect's muscle group.",
  Transcended: "+8% same muscle group · +3% related muscle groups.",
  Supreme:     "+12% same muscle group · +5% related muscle groups.",
  Sacred:      "+15% same muscle group · +8% related muscle groups.",
  Divine:      "+20% same group · +12% related · +2% all exercises.",
};

function RankUpScreen({
  newRank, aspect, drops, onContinue,
}: {
  newRank: Rank; aspect: Aspect | null; drops: Memory[]; onContinue: () => void;
}) {
  const data = RANK_UP_DATA[newRank] ?? { headline: `You are ${newRank}.`, sub: "" };
  const mult = aspect ? ASPECT_RANK_MULT[aspect.rank] : null;

  return (
    <div className="min-h-screen px-6 py-12 max-w-md mx-auto flex flex-col items-center text-center">
      <p className="text-[10px] uppercase tracking-[0.5em] text-accent mb-6">Rank Attained</p>

      <h1 className="font-display text-3xl text-gold text-glow-strong mb-3 leading-snug">
        {data.headline}
      </h1>
      <p className="text-sm text-muted-foreground mb-10 leading-relaxed max-w-xs">
        {data.sub}
      </p>

      {/* Benefits */}
      <div className="w-full space-y-3 mb-10">
        {/* Aspect upgrade */}
        {aspect && (
          <div className="bg-card border-rune rounded-2xl p-4 text-left shadow-card">
            <p className="text-[10px] uppercase tracking-widest text-accent mb-1">Aspect Evolved · {aspect.rank}</p>
            <p className="font-display text-base text-glow">{aspect.name}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{aspect.description}</p>
            {mult !== null && (
              <p className="text-[10px] text-accent mt-2 tracking-wide">Power multiplier ×{mult.toFixed(2)}</p>
            )}
          </div>
        )}

        {/* Secondary bonus label */}
        <div className="bg-surface-2 border-rune rounded-xl p-3.5 text-left">
          <p className="text-[10px] uppercase tracking-widest text-purple-bright mb-1">Aspect Secondary Bonus</p>
          <p className="text-[12px] text-foreground">{RANK_SECONDARY_LABEL[newRank] ?? "—"}</p>
        </div>

        {/* Memory drops — shown below if any were earned */}

        {/* True Name */}
        <div className="bg-surface-2 border-rune rounded-xl p-3.5 text-left">
          <p className="text-[10px] uppercase tracking-widest text-purple-bright mb-1">True Name</p>
          <p className="text-[12px] text-foreground">30% chance to receive a new True Name on each nightmare victory</p>
        </div>
      </div>

      {/* Memory drops earned this nightmare */}
      {drops.length > 0 && (
        <div className="w-full mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent mb-2">Memories Obtained</p>
          <div className="space-y-2">
            {drops.map(m => (
              <div key={m.id} className="bg-card border-rune rounded-xl p-3 flex justify-between items-center shadow-card">
                <div>
                  <p className={`font-display text-sm ${RANK_COLOR[m.rank]}`}>{m.name}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{m.attribute}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-4 rounded-2xl"
      >
        CONTINUE
      </button>
    </div>
  );
}

function MemoryDrops({ drops }: { drops: Memory[] }) {
  if (!drops.length) return null;
  return (
    <div className="mb-6">
      <p className="text-[10px] uppercase tracking-[0.3em] text-accent mb-2 text-center">Memories Obtained</p>
      <div className="space-y-2">
        {drops.map(m => (
          <div key={m.id} className="bg-card border-rune rounded-xl p-3 flex justify-between items-center shadow-card">
            <div>
              <p className={`font-display text-sm ${RANK_COLOR[m.rank]}`}>{m.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{m.attribute}</p>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
