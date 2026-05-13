import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/lib/store";
import {
<<<<<<< HEAD
  MUSCLE_GROUPS, EXERCISES, BODYWEIGHT_EXERCISES, judgeFirstNightmare, computeRank, TRUE_NAMES,
=======
  MUSCLE_GROUPS, EXERCISES, judgeFirstNightmare, computeRank, TRUE_NAMES,
>>>>>>> 67891d0b27fe2be929d6ffbd7fd1850ebf28d11a
  computeBonuses, calcNMPenalty, strongestMuscleFromBaselines,
  type SetLog, type MuscleGroup, type TrueName,
} from "@/lib/game";
import { getMemoryEffect } from "@/lib/memories";

export const Route = createFileRoute("/nightmare")({
  component: Nightmare,
  head: () => ({ meta: [{ title: "Nightmare — Shadow Slave" }] }),
});

<<<<<<< HEAD
type Entry = { exercise: string; weight: string; reps: string; addWeight: boolean; extraWeight: string };
=======
type Entry = { exercise: string; weight: string; reps: string };
>>>>>>> 67891d0b27fe2be929d6ffbd7fd1850ebf28d11a

function Nightmare() {
  const navigate = useNavigate();
  const { state, completeFirstNightmare, attemptNightmare } = useGame();
  const isFirst = !state.firstNightmareSets;
  const baseSets = state.firstNightmareSets ?? [];
  const nightmareNumber = state.nightmaresPassed + 1;

  const [entries, setEntries] = useState<Record<MuscleGroup, Entry>>(() =>
    Object.fromEntries(MUSCLE_GROUPS.map(m => {
      const prior = baseSets.find(s => s.muscle === m);
<<<<<<< HEAD
      return [m, { exercise: prior?.exercise ?? EXERCISES[m][0], weight: "", reps: "", addWeight: false, extraWeight: "" }];
=======
      return [m, { exercise: prior?.exercise ?? EXERCISES[m][0], weight: "", reps: "" }];
>>>>>>> 67891d0b27fe2be929d6ffbd7fd1850ebf28d11a
    })) as Record<MuscleGroup, Entry>
  );
  const [firstResult, setFirstResult] = useState<ReturnType<typeof judgeFirstNightmare> | null>(null);
  const [challengeResult, setChallengeResult] = useState<{
    passed: boolean;
    avgImprovement: number;
    penalty: number;
    trueName?: TrueName;
  } | null>(null);

<<<<<<< HEAD
  const bodyWeight = state.profile?.weight ?? 70;
  const allDone = MUSCLE_GROUPS.every(m => {
    const isBW = BODYWEIGHT_EXERCISES.has(entries[m].exercise);
    return isBW ? !!entries[m].reps : (!!entries[m].weight && !!entries[m].reps);
  });
=======
  const allDone = MUSCLE_GROUPS.every(m => entries[m].weight && entries[m].reps);
>>>>>>> 67891d0b27fe2be929d6ffbd7fd1850ebf28d11a

  // Compute bonus context for subsequent NM penalty calc
  const equippedMemories = state.memories.filter(m => state.equippedMemoryIds.includes(m.id));
  const memoryEffects = equippedMemories.map(getMemoryEffect);
  const strongest = strongestMuscleFromBaselines(state.baselines, state.firstNightmareSets);
  const ctx = computeBonuses(state.flaw ?? null, state.trueName ?? null, memoryEffects, strongest);

  function update(m: MuscleGroup, patch: Partial<Entry>) {
<<<<<<< HEAD
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
=======
    setEntries(prev => ({ ...prev, [m]: { ...prev[m], ...patch } }));
  }

  function judge() {
    const sets: SetLog[] = MUSCLE_GROUPS.map(m => ({
      muscle: m,
      exercise: entries[m].exercise,
      weight: Number(entries[m].weight),
      reps: Number(entries[m].reps),
    }));
>>>>>>> 67891d0b27fe2be929d6ffbd7fd1850ebf28d11a

    if (isFirst) {
      const r = judgeFirstNightmare(sets, state.profile?.name);
      setFirstResult(r);
      completeFirstNightmare(sets, r.aspect, r.flaw, r.trueName);
      return;
    }

    // Compare volume (weight × reps) to first nightmare — both weight AND reps matter
    const improvements = sets.map(s => {
      const prior = baseSets.find(b => b.muscle === s.muscle);
      if (!prior || prior.weight * prior.reps === 0) return 0;
      const firstVol   = prior.weight * prior.reps;
      const currentVol = s.weight * s.reps;
      return (currentVol - firstVol) / firstVol;
    });
    const avg = improvements.reduce((a, b) => a + b, 0) / improvements.length;
    const passed = avg >= ctx.nmThreshold;

    let newTrueName: TrueName | undefined;
    if (passed && Math.random() < 0.30) {
      newTrueName = TRUE_NAMES[Math.floor(Math.random() * TRUE_NAMES.length)];
    }

    const penalty = passed ? 0 : calcNMPenalty(state.totalShards, ctx);
    attemptNightmare(passed, penalty, newTrueName);
    setChallengeResult({ passed, avgImprovement: avg, penalty, trueName: newTrueName });
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
    const threshold = (ctx.nmThreshold * 100).toFixed(0);
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
          <p className="text-[11px] text-muted-foreground mt-2">Required: {threshold}%</p>
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

        <button
          onClick={() => navigate({ to: "/" })}
          className="w-full bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-3.5"
        >
          RETURN
        </button>
      </div>
    );
  }

  const thresholdPct = (ctx.nmThreshold * 100).toFixed(0);

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
          : `Beat your first-nightmare volume (weight × reps) by ${thresholdPct}% on average to ascend. Fail and lose 15–45% of your shards.`}
      </p>

      <div className="space-y-3">
        {MUSCLE_GROUPS.map(m => {
          const prior = baseSets.find(s => s.muscle === m);
          const firstVol = prior ? prior.weight * prior.reps : null;
<<<<<<< HEAD
          const isBW = BODYWEIGHT_EXERCISES.has(entries[m].exercise);
          const effectiveW = isBW
            ? bodyWeight + Number(entries[m].extraWeight || 0)
            : Number(entries[m].weight);
=======
>>>>>>> 67891d0b27fe2be929d6ffbd7fd1850ebf28d11a
          return (
            <div key={m} className="bg-card border-rune rounded-2xl p-4 shadow-card">
              <div className="flex items-center justify-between mb-3">
                <span className="font-display text-lg text-glow">{m}</span>
                {prior && firstVol !== null && (
                  <span className="text-[10px] text-muted-foreground tracking-wider">
                    1st NM: {prior.weight}kg×{prior.reps} ({firstVol} vol)
                  </span>
                )}
              </div>
              <select
                value={entries[m].exercise}
                onChange={e => update(m, { exercise: e.target.value })}
                className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm mb-2"
              >
                {EXERCISES[m].map(ex => <option key={ex} value={ex}>{ex}</option>)}
              </select>
<<<<<<< HEAD
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
              {prior && entries[m].reps && (isBW || entries[m].weight) && firstVol !== null && (
                <div className="mt-2 text-[10px] text-muted-foreground">
                  {(() => {
                    const currentVol = effectiveW * Number(entries[m].reps);
=======
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
              {prior && entries[m].weight && entries[m].reps && firstVol !== null && (
                <div className="mt-2 text-[10px] text-muted-foreground">
                  {(() => {
                    const currentVol = Number(entries[m].weight) * Number(entries[m].reps);
>>>>>>> 67891d0b27fe2be929d6ffbd7fd1850ebf28d11a
                    const imp = ((currentVol - firstVol) / firstVol * 100).toFixed(1);
                    const ok = currentVol >= firstVol * (1 + ctx.nmThreshold);
                    return (
                      <span className={ok ? "text-green-400" : "text-yellow-500"}>
                        {imp}% improvement {ok ? "✓" : `(need ${thresholdPct}%)`}
                      </span>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={judge}
        disabled={!allDone}
<<<<<<< HEAD
        className="w-full bg-spell text-primary-foreground font-display tracking-widest py-4 rounded-2xl shadow-spell mt-6 disabled:opacity-40 disabled:cursor-not-allowed pulse-nightmare"
=======
        className="w-full bg-spell text-primary-foreground font-display tracking-widest py-4 rounded-2xl shadow-spell mt-6 disabled:opacity-40 disabled:cursor-not-allowed pulse-spell"
>>>>>>> 67891d0b27fe2be929d6ffbd7fd1850ebf28d11a
      >
        {isFirst ? "Submit to the Spell" : "Challenge the Nightmare"}
      </button>
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
