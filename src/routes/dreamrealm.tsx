import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useGame, type Workout } from "@/lib/store";
import {
  MUSCLE_GROUPS, EXERCISES, calcShards, currentMultiplier, currentCoreInfo,
  computeBonuses, strongestMuscleFromBaselines,
  type SetLog, type MuscleGroup,
} from "@/lib/game";
import { rollPRMemoryDrop, rollGuaranteedMemoryDrop, getMemoryEffect, RANK_COLOR, type Memory } from "@/lib/memories";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/dreamrealm")({
  component: DreamRealm,
  head: () => ({ meta: [{ title: "Expedition — Shadow Slave" }] }),
});

const DAYS = ["Pull", "Push", "Legs", "Upper", "Lower", "Arms", "Full Body"];

function DreamRealm() {
  const navigate = useNavigate();
  const { state, logWorkout } = useGame();
  const mult = currentMultiplier(state.totalShards);
  const core = currentCoreInfo(state.totalShards);

  // Build bonus context from equipped memories + aspect/flaw/trueName
  const equippedMemories = state.memories.filter(m => state.equippedMemoryIds.includes(m.id));
  const memoryEffects = equippedMemories.map(getMemoryEffect);
  const strongest = strongestMuscleFromBaselines(state.baselines, state.firstNightmareSets);
  const ctx = computeBonuses(state.flaw ?? null, state.trueName ?? null, memoryEffects, strongest);

  const [day, setDay] = useState(DAYS[0]);
  const [muscle, setMuscle] = useState<MuscleGroup>("Back");
  const [exercise, setExercise] = useState(EXERCISES["Back"][0]);
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [sets, setSets] = useState<Array<SetLog & { shards: number; isPR: boolean }>>([]);
  const [pendingDrops, setPendingDrops] = useState<Memory[]>([]);
  const [drops, setDrops] = useState<Memory[] | null>(null);

  function addSet() {
    const w = Number(weight), r = Number(reps);
    if (!w || !r) return;
    const set: SetLog = { exercise, muscle, weight: w, reps: r };
    const baseline = state.baselines[exercise] ?? w;
    const isPR = w > baseline;
    const shards = calcShards(set, baseline, mult, ctx, state.aspect, isPR);

    // 15% chance to drop a memory on each PR set
    if (isPR) {
      const drop = rollPRMemoryDrop(ctx.memoryRankBoost);
      if (drop) setPendingDrops(prev => [...prev, drop]);
    }

    setSets(prev => [...prev, { ...set, shards, isPR }]);
    setWeight(""); setReps("");
    setShowAdd(false);
  }

  function finish() {
    if (sets.length === 0) return;
    const total = sets.reduce((s, x) => s + x.shards, 0);

    // Guaranteed memory from Shadowbreaker true name
    const allDrops = [...pendingDrops];
    if (ctx.guaranteedMemory) {
      allDrops.push(rollGuaranteedMemoryDrop(ctx.memoryRankBoost));
    }

    const w: Workout = {
      id: crypto.randomUUID(),
      date: Date.now(),
      day,
      sets: sets.map(({ shards: _s, isPR: _p, ...s }) => s),
      shardsEarned: total,
      drops: allDrops,
    };
    logWorkout(w);
    if (allDrops.length > 0) setDrops(allDrops);
    else navigate({ to: "/" });
  }

  // Group sets by exercise
  const grouped = sets.reduce<Record<string, { sets: typeof sets; muscle: MuscleGroup; total: number }>>((acc, s) => {
    if (!acc[s.exercise]) acc[s.exercise] = { sets: [], muscle: s.muscle, total: 0 };
    acc[s.exercise].sets.push(s);
    acc[s.exercise].total += s.shards;
    return acc;
  }, {});

  const totalShards = sets.reduce((s, x) => s + x.shards, 0);
  const prCount = sets.filter(s => s.isPR).length;

  // Active bonus summary for display
  const bonusSummary: string[] = [];
  if (ctx.allPct)    bonusSummary.push(`+${ctx.allPct}% all`);
  if (ctx.prPct)     bonusSummary.push(`+${ctx.prPct}% PRs`);
  if (ctx.flatPerSet) bonusSummary.push(`+${ctx.flatPerSet}/set`);
  if (state.aspect?.bonusKind === "pct") bonusSummary.push(`+${state.aspect.bonusValue}% ${state.aspect.exercise}`);
  if (state.aspect?.bonusKind === "perRep") bonusSummary.push(`+${state.aspect.bonusValue}/rep ${state.aspect.exercise}`);

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto">
      <header className="px-5 pt-6 pb-3">
        <h1 className="font-display text-lg text-gold tracking-[0.2em]">EXPEDITION</h1>
        <p className="text-xs text-muted-foreground tracking-wider mt-1">Log your dream realm conquest</p>
      </header>

      <div className="px-4 space-y-4">
        {/* Shards earned */}
        <div
          className="border-rune p-4 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg, rgba(123,94,167,0.15), rgba(201,168,76,0.06))" }}
        >
          <div>
            <p className="font-display text-2xl text-gold">+{totalShards} ✦</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Shards earned · {prCount} PR{prCount === 1 ? "" : "s"}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-purple-bright">×{mult.toFixed(2)} multiplier</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{core.name} Core active</p>
          </div>
        </div>

        {/* Active bonuses */}
        {bonusSummary.length > 0 && (
          <div className="bg-surface-2 border-rune px-3.5 py-2.5 flex flex-wrap gap-1.5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground w-full mb-1">Active Bonuses</p>
            {bonusSummary.map((b, i) => (
              <span key={i} className="px-2 py-0.5 bg-gold/10 border border-gold/30 text-gold text-[10px] rounded">
                {b}
              </span>
            ))}
          </div>
        )}

        {/* Day pills */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {DAYS.map(d => (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap border ${
                day === d ? "bg-gold/15 border-gold text-gold" : "bg-surface-2 border-rune text-muted-foreground"
              }`}
            >
              {d}
            </button>
          ))}
        </div>

        {/* Logged sets */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-2">Logged Sets</p>
          {Object.entries(grouped).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No sets yet. Add an exercise below.
            </p>
          )}
          {Object.entries(grouped).map(([ex, info]) => (
            <div key={ex} className="bg-surface-2 border-rune mb-2.5">
              <div className="px-3.5 py-2.5 flex justify-between items-center">
                <div>
                  <p className="text-sm">{ex}</p>
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mt-0.5">{info.muscle}</p>
                </div>
                <p className="text-xs text-gold">✦ {info.total}</p>
              </div>
              <div className="px-3.5 pb-3 flex gap-2 flex-wrap">
                {info.sets.map((s, i) => (
                  <div
                    key={i}
                    className={`px-2.5 py-1 text-[11px] ${
                      s.isPR
                        ? "border border-gold text-gold bg-gold/5"
                        : "bg-surface-3 text-muted-foreground"
                    }`}
                  >
                    {s.weight}kg × {s.reps}{s.isPR && " ✦ PR"}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {showAdd ? (
            <div className="bg-surface-2 border-rune p-3.5 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={muscle}
                  onChange={e => {
                    const m = e.target.value as MuscleGroup;
                    setMuscle(m);
                    setExercise(EXERCISES[m][0]);
                  }}
                  className="bg-surface-3 border-rune px-3 py-2 text-sm"
                >
                  {MUSCLE_GROUPS.map(m => <option key={m}>{m}</option>)}
                </select>
                <select
                  value={exercise}
                  onChange={e => setExercise(e.target.value)}
                  className="bg-surface-3 border-rune px-3 py-2 text-sm"
                >
                  {EXERCISES[muscle].map(ex => <option key={ex}>{ex}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="Weight (kg)"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className="bg-surface-3 border-rune px-3 py-2 text-sm"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Reps"
                  value={reps}
                  onChange={e => setReps(e.target.value)}
                  className="bg-surface-3 border-rune px-3 py-2 text-sm"
                />
              </div>
              {weight && reps && (
                <div className="text-[10px] text-muted-foreground px-1">
                  {(() => {
                    const baseline = state.baselines[exercise] ?? Number(weight);
                    const isPR = Number(weight) > baseline;
                    const preview = calcShards(
                      { exercise, muscle, weight: Number(weight), reps: Number(reps) },
                      baseline, mult, ctx, state.aspect, isPR
                    );
                    return <span>Preview: <span className="text-gold">+{preview} ✦</span>{isPR ? " · PR!" : ""}</span>;
                  })()}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 text-xs text-muted-foreground border border-rune"
                >
                  Cancel
                </button>
                <button
                  onClick={addSet}
                  className="flex-1 bg-gradient-to-br from-gold-dim to-gold text-background font-display py-2 text-xs tracking-[0.15em]"
                >
                  SLAY
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-3.5 text-sm text-gold border border-dashed border-gold/40"
            >
              + Add Exercise
            </button>
          )}
        </div>

        {sets.length > 0 && (
          <button
            onClick={finish}
            className="w-full bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-3.5"
          >
            RETURN FROM THE REALM
          </button>
        )}
      </div>

      {drops && (
        <div className="fixed inset-0 bg-background/85 backdrop-blur-sm flex items-center justify-center px-5 z-50">
          <div className="bg-surface-2 border-rune p-5 max-w-sm w-full">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold text-center">Memories Recovered</p>
            <h2 className="font-display text-lg text-center text-gold tracking-[0.15em] mt-1 mb-4">FROM THE SLAIN</h2>
            <div className="space-y-2.5 mb-5">
              {drops.map(d => (
                <div key={d.id} className="border-rune p-3 bg-surface-3">
                  <div className="flex items-baseline justify-between">
                    <p className={`font-display text-sm ${RANK_COLOR[d.rank]}`}>{d.name}</p>
                    <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{d.type}</span>
                  </div>
                  <p className="text-xs text-purple-bright mt-1">{d.attribute}</p>
                  <p className="text-[11px] text-muted-foreground italic mt-1">"{d.flavor}"</p>
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate({ to: "/" })}
              className="w-full bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-3"
            >
              CLAIM & RETURN
            </button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
