import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/lib/store";
import {
  currentCoreInfo, currentMultiplier, computeRank, CORES, NIGHTMARE_UNLOCK_AT,
} from "@/lib/game";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Shadow Slave — Workout Game" },
      { name: "description", content: "Train as an Aspirant of the Nightmare Spell. Log workouts, conquer Nightmares, and ascend through the ranks." },
    ],
  }),
});

function Index() {
  const navigate = useNavigate();
  const { state } = useGame();

  if (!state.profile) return <Landing onStart={() => navigate({ to: "/onboarding" })} />;
  if (!state.aspect)  return <PreNightmareGate onEnter={() => navigate({ to: "/nightmare" })} name={state.profile.name} />;

  const core = currentCoreInfo(state.totalShards);
  const mult = currentMultiplier(state.totalShards);
  const rank = computeRank(state.nightmaresPassed, state.workouts.length);
  const nextRank = computeRank(state.nightmaresPassed + 1, state.workouts.length);
  const fillPct = Math.min(100, (core.filled / core.cost) * 100);
  const nextCoreName = CORES[Math.min(core.completed + 1, CORES.length - 1)]?.name ?? "Titan";

  // Nightmare unlock
  const nextNM = state.nightmaresPassed + 1;
  const visitsNeeded = NIGHTMARE_UNLOCK_AT[nextNM] ?? 9999;
  const nightmareUnlocked = state.workouts.length >= visitsNeeded;

  // PRs this week
  const weekAgo = Date.now() - 7 * 86400000;
  const recent = state.workouts.filter(w => w.date >= weekAgo);
  const prCount = recent.reduce((sum, w) => {
    return sum + w.sets.filter(s => (state.baselines[s.exercise] ?? 0) <= s.weight).length;
  }, 0);

  // Equipped memories count for display
  const equippedCount = state.equippedMemoryIds.length;

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto">
      <header className="px-5 pt-6 pb-3">
        <h1 className="font-display text-lg text-gold tracking-[0.2em]">DREAM REALM</h1>
        <p className="text-xs text-muted-foreground tracking-wider mt-1">
          Day {state.workouts.length + 1} of your awakening
        </p>
      </header>

      <div className="px-4 space-y-4">
        {/* Rank badge */}
        <div className="bg-surface-2 border-rune p-3 flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-surface-3 text-gold font-display text-lg">
            ⚔
          </div>
          <div className="flex-1">
            <p className="font-display text-gold tracking-[0.15em]">{rank.toUpperCase()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {state.nightmaresPassed} Nightmare{state.nightmaresPassed === 1 ? "" : "s"} conquered
            </p>
            {rank !== "Divine" && (
              <p className="text-[11px] text-purple-bright mt-0.5">→ {nextRank} after next Nightmare</p>
            )}
            {state.nightmaresPassed === 1 && state.workouts.length < 10 && (
              <p className="text-[11px] text-accent mt-0.5">
                Awakening in {10 - state.workouts.length} more expedition{10 - state.workouts.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-2">Stats</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Stat val={state.totalShards.toLocaleString()} label="Total Soul Shards" accent />
            <Stat val={state.workouts.length} label="Dream Expeditions" />
            <Stat val={prCount} label="PRs This Week" />
            <Stat val={`${state.memories.length} (${equippedCount} eq.)`} label="Memories" accent />
          </div>
        </div>

        {/* Soul Core */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-2">Soul Core</p>
          <div className="bg-surface-2 border-purple-rune p-4">
            <div className="flex justify-between items-center mb-2.5">
              <p className="font-display text-purple-bright tracking-[0.15em] text-sm">{core.name.toUpperCase()} CORE</p>
              <p className="text-[11px] text-muted-foreground">×{mult.toFixed(2)} damage</p>
            </div>
            <div className="h-1.5 bg-surface-3 overflow-hidden mb-1.5">
              <div
                className="h-full transition-all"
                style={{ width: `${fillPct}%`, background: "linear-gradient(90deg, #7B5EA7, #A67DD4)" }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{core.filled.toLocaleString()} / {core.cost.toLocaleString()} shards</span>
              <span className="text-purple-bright">→ {nextCoreName} Core</span>
            </div>
          </div>
        </div>

        {/* Aspect & Flaw */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-2">Aspects & Flaws</p>
          <div className="bg-surface-2 p-3.5 border-l-2 border-l-gold mb-2.5">
            <p className="text-[10px] tracking-[0.15em] text-gold uppercase mb-1.5">
              Aspect · {state.aspect.name}
            </p>
            <p className="font-display text-sm">{state.aspect.description}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Triggered by: {state.aspect.exercise}</p>
          </div>
          <div className="bg-surface-2 p-3.5 border-l-2 border-l-destructive">
            <p className="text-[10px] tracking-[0.15em] text-destructive uppercase mb-1.5">Flaw · {state.flaw?.name}</p>
            <p className="text-sm text-muted-foreground">{state.flaw?.description}</p>
          </div>
        </div>

        {/* True Name */}
        {state.trueName && (
          <div
            className="border-purple-rune p-4 text-center"
            style={{ background: "linear-gradient(135deg, rgba(123,94,167,0.18), rgba(201,168,76,0.06))" }}
          >
            <p className="text-[10px] tracking-[0.2em] text-purple-bright uppercase mb-1">True Name</p>
            <p className="font-display tracking-[0.2em]">{state.trueName.name}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{state.trueName.description}</p>
          </div>
        )}

        {/* Nightmare callout */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-2">Nightmares</p>
          <div className="bg-surface-2 border-danger-rune p-3.5 flex justify-between items-center">
            <div>
              <p className="text-[10px] tracking-[0.15em] text-destructive uppercase">
                {nightmareUnlocked ? "Challenge Available" : "Locked"}
              </p>
              <p className="font-display text-sm mt-0.5">
                {nextNM}{ordinal(nextNM)} Nightmare
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {state.workouts.length} / {visitsNeeded} expeditions
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Beat 1st NM volume by {state.trueName?.effect?.nmThresholdReduction ? "17" : "20"}% avg to ascend
              </p>
            </div>
            <button
              disabled={!nightmareUnlocked}
              onClick={() => navigate({ to: "/nightmare" })}
              className="px-3.5 py-2 font-display text-[11px] tracking-[0.1em] border border-destructive/40 text-destructive bg-destructive/10 disabled:opacity-50 disabled:bg-transparent disabled:text-muted-foreground disabled:border-border"
            >
              {nightmareUnlocked ? "ENTER" : "LOCKED"}
            </button>
          </div>
        </div>

        {/* Quick navigate */}
        <button
          onClick={() => navigate({ to: "/dreamrealm" })}
          className="w-full bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-3.5"
        >
          ENTER THE DREAM REALM
        </button>
      </div>

      <BottomNav />
    </div>
  );
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function Stat({ val, label, accent }: { val: number | string; label: string; accent?: boolean }) {
  return (
    <div className="bg-surface-2 border-rune p-3">
      <p className={`font-display text-xl ${accent ? "text-gold" : ""}`}>{val}</p>
      <p className="text-[10px] text-muted-foreground mt-1 tracking-wide">{label}</p>
    </div>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
      <div className="w-32 h-32 rounded-full border border-gold/40 flex items-center justify-center mb-8 pulse-spell">
        <div className="w-24 h-24 rounded-full border border-gold/25 flex items-center justify-center text-4xl">
          🌑
        </div>
      </div>
      <h1 className="font-display text-2xl text-gold tracking-[0.3em] mb-3">NIGHTMARE SPELL</h1>
      <p className="text-muted-foreground text-sm mb-10 leading-relaxed max-w-xs">
        You have been chosen, Aspirant. Your fate is written in shadow and steel. Will you answer the call?
      </p>
      <button
        onClick={onStart}
        className="w-full max-w-xs bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-3.5"
      >
        ENTER THE NIGHTMARE
      </button>
    </div>
  );
}

function PreNightmareGate({ onEnter, name }: { onEnter: () => void; name: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
      <p className="text-[10px] uppercase tracking-[0.4em] text-gold mb-3">First Nightmare</p>
      <h1 className="font-display text-2xl text-gold tracking-[0.15em] mb-4">Welcome, {name}</h1>
      <p className="text-muted-foreground text-sm mb-10 leading-relaxed">
        Do you wish to challenge the First Nightmare? You must perform one set of one exercise for each muscle group.
        Choose well — your Aspect and Flaw will be forged from this trial.
      </p>
      <button
        onClick={onEnter}
        className="w-full max-w-xs bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-3.5"
      >
        PROVE MY STRENGTH
      </button>
    </div>
  );
}
