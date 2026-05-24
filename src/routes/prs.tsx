import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft } from "lucide-react";
import { useGame } from "@/lib/store";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/game";

export const Route = createFileRoute("/prs")({
  component: PRPage,
  head: () => ({ meta: [{ title: "Personal Records — Shadow Slave" }] }),
});

// ── Data derivation ────────────────────────────────────────────────────────

type ConfirmedPR = {
  exercise: string;
  muscle: MuscleGroup;
  weight: number;
  reps: number;
  date: number | null; // null = set during First Nightmare (not in workout log)
};

type SessionPR = {
  exercise: string;
  muscle: MuscleGroup;
  weight: number;       // attempted weight
  reps: number;         // reps achieved (< 8)
  date: number;
  confirmedWeight: number; // current baseline (what they need to beat with 8+ reps)
};

function deriveConfirmedPRs(
  workouts: ReturnType<typeof useGame>["state"]["workouts"],
  baselines: Record<string, number>,
  firstNightmareSets: ReturnType<typeof useGame>["state"]["firstNightmareSets"],
): ConfirmedPR[] {
  // workouts are stored newest-first
  const result: ConfirmedPR[] = [];

  for (const [exercise, weight] of Object.entries(baselines)) {
    // Find the most recent workout where this exercise was logged at the baseline weight.
    // Prefer a set with 8+ reps (confirmed under the new rule), fall back to any reps
    // so old saves (which allowed sub-8 PRs) still show something.
    let found: ConfirmedPR | null = null;

    for (const workout of workouts) {
      const matched =
        workout.sets.find(s => s.exercise === exercise && s.weight >= weight && s.reps >= 8) ??
        workout.sets.find(s => s.exercise === exercise && s.weight >= weight);

      if (matched) {
        found = {
          exercise,
          muscle: matched.muscle,
          weight,
          reps: matched.reps,
          date: workout.date,
        };
        break;
      }
    }

    if (!found) {
      // Baseline was established during the First Nightmare — not in the workout log.
      const nmSet = firstNightmareSets?.find(s => s.exercise === exercise);
      if (nmSet) {
        found = {
          exercise,
          muscle: nmSet.muscle,
          weight,
          reps: nmSet.reps,
          date: null,
        };
      }
    }

    if (found) result.push(found);
  }

  // Sort: most recent first (nulls = nightmare = oldest, go last)
  return result.sort((a, b) => {
    if (a.date === null && b.date === null) return 0;
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    return b.date - a.date;
  });
}

function deriveSessionPRs(
  workouts: ReturnType<typeof useGame>["state"]["workouts"],
  baselines: Record<string, number>,
): SessionPR[] {
  // Find the most recent per-exercise set that exceeded the current baseline with < 8 reps.
  // If a later workout already confirmed that weight (≥ 8 reps), we skip the old attempt.
  const seenExercises = new Set<string>();
  const result: SessionPR[] = [];

  for (const workout of workouts) {
    for (const set of workout.sets) {
      if (seenExercises.has(set.exercise)) continue;

      const baseline = baselines[set.exercise];
      if (baseline === undefined) continue;

      // Only show if the weight is still above the current baseline (meaning it was NEVER
      // confirmed — if they later did 8+ reps at this weight, the baseline would have
      // advanced and set.weight would no longer be above it).
      if (set.weight > baseline && set.reps < 8) {
        seenExercises.add(set.exercise);
        result.push({
          exercise: set.exercise,
          muscle: set.muscle,
          weight: set.weight,
          reps: set.reps,
          date: workout.date,
          confirmedWeight: baseline,
        });
      }
    }
  }

  return result.sort((a, b) => b.date - a.date);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Main component ─────────────────────────────────────────────────────────

function PRPage() {
  const navigate = useNavigate();
  const { state } = useGame();

  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | "All">("All");

  const confirmedPRs = deriveConfirmedPRs(
    state.workouts,
    state.baselines,
    state.firstNightmareSets,
  );

  const sessionPRs = deriveSessionPRs(state.workouts, state.baselines);

  const filteredConfirmed = muscleFilter === "All"
    ? confirmedPRs
    : confirmedPRs.filter(p => p.muscle === muscleFilter);

  const filteredSession = muscleFilter === "All"
    ? sessionPRs
    : sessionPRs.filter(p => p.muscle === muscleFilter);

  const hasAny = confirmedPRs.length > 0 || sessionPRs.length > 0;

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto">
      {/* Header */}
      <header className="px-5 pt-6 pb-3 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/" })}
          className="text-muted-foreground hover:text-gold transition-colors p-1 -ml-1"
          aria-label="Back"
        >
          <ChevronLeft size={20} strokeWidth={1.5} />
        </button>
        <div>
          <h1 className="font-display text-lg text-gold tracking-[0.2em]">PERSONAL RECORDS</h1>
          <p className="text-xs text-muted-foreground tracking-wider mt-0.5">Your best lifts across all expeditions</p>
        </div>
      </header>

      {/* Muscle-group filter pills */}
      {hasAny && (
        <div
          className="flex gap-2 overflow-x-auto pb-1 px-5 mb-4"
          style={{ scrollbarWidth: "none" }}
        >
          {(["All", ...MUSCLE_GROUPS] as const).map(m => (
            <button
              key={m}
              onClick={() => setMuscleFilter(m as MuscleGroup | "All")}
              className={`px-3 py-1 text-[10px] tracking-[0.15em] uppercase whitespace-nowrap border transition-all flex-shrink-0 ${
                muscleFilter === m
                  ? "bg-gold/15 border-gold text-gold"
                  : "bg-surface-2 border-rune text-muted-foreground"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      <div className="px-4 space-y-6">

        {/* ── No data at all ─────────────────────────────────────────────── */}
        {!hasAny && (
          <div className="text-center py-16">
            <p className="text-3xl mb-4">⚔</p>
            <p className="font-display text-gold tracking-widest mb-2">No Records Yet</p>
            <p className="text-sm text-muted-foreground">
              Complete your First Nightmare to set baselines, then log expeditions to build your record.
            </p>
          </div>
        )}

        {/* ── Confirmed PRs ──────────────────────────────────────────────── */}
        {filteredConfirmed.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
              ✦ Confirmed Records
            </p>
            <div className="space-y-2">
              {filteredConfirmed.map(pr => (
                <div
                  key={pr.exercise}
                  className="bg-surface-2 border-l-2 border-l-gold p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm text-gold tracking-wide truncate">{pr.exercise}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider">{pr.muscle}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display text-lg text-gold text-glow">{pr.weight}kg</p>
                    <p className="text-[11px] text-muted-foreground">{pr.reps} rep{pr.reps === 1 ? "" : "s"}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">
                      {pr.date !== null ? fmtDate(pr.date) : "First Nightmare"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Session PRs (Unconfirmed) ───────────────────────────────────── */}
        {filteredSession.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">
              ◈ Unconfirmed — Needs 8+ Reps
            </p>
            <p className="text-[10px] text-muted-foreground/50 mb-3 leading-relaxed">
              You hit these weights but didn't reach 8 reps — your baseline hasn't moved yet.
              Come back and confirm them.
            </p>
            <div className="space-y-2">
              {filteredSession.map(pr => (
                <div
                  key={pr.exercise}
                  className="bg-surface-2 border-l-2 border-l-accent/60 p-4 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm text-foreground/80 tracking-wide truncate">{pr.exercise}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 tracking-wider">{pr.muscle}</p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="px-1.5 py-0.5 text-[9px] uppercase tracking-wider border border-accent/40 text-accent/80 bg-accent/5">
                        {pr.reps}/8 reps
                      </span>
                      <span className="text-[10px] text-muted-foreground/50">
                        confirmed at {pr.confirmedWeight}kg
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-display text-lg text-accent/80">{pr.weight}kg</p>
                    <p className="text-[11px] text-muted-foreground">{pr.reps} rep{pr.reps === 1 ? "" : "s"}</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5">{fmtDate(pr.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Filter produced no results but data exists */}
        {hasAny && filteredConfirmed.length === 0 && filteredSession.length === 0 && (
          <div className="text-center py-10">
            <p className="text-muted-foreground text-sm">
              No {muscleFilter} records yet — log an expedition to set some.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
