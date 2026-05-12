import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useGame } from "@/lib/store";
import { currentCoreInfo, computeRank, CORES, NIGHTMARE_UNLOCK_AT } from "@/lib/game";
import { BottomNav } from "@/components/BottomNav";
import { RANK_COLOR, type MemoryType } from "@/lib/memories";
import { useState } from "react";

export const Route = createFileRoute("/soul")({
  component: SoulPage,
  head: () => ({ meta: [{ title: "Soul Record — Shadow Slave" }] }),
});

const TYPES: Array<MemoryType | "All"> = ["All", "Weapon", "Armour", "Charm", "Tool"];
const TYPE_ICON: Record<MemoryType, string> = {
  Weapon: "🗡️", Armour: "🛡️", Charm: "🪬", Tool: "⛓️",
};

function SoulPage() {
  const navigate = useNavigate();
  const { state, reset } = useGame();
  const [filter, setFilter] = useState<MemoryType | "All">("All");

  if (!state.profile) {
    return (
      <div className="min-h-screen pb-24 max-w-md mx-auto px-5 pt-10">
        <p className="text-center text-muted-foreground text-sm">Begin your journey first.</p>
        <BottomNav />
      </div>
    );
  }

  const core = currentCoreInfo(state.totalShards);
  const rank = computeRank(state.nightmaresPassed, state.workouts.length);
  const initial = state.profile.name[0]?.toUpperCase() ?? "A";
  const list = state.memories.filter(m => filter === "All" || m.type === filter);
  const equippedCount = state.equippedMemoryIds.length;

  // Build nightmare history rows
  const nmHistory = Array.from({ length: state.nightmaresPassed }, (_, i) => i + 1);

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto">
      <header className="px-5 pt-6 pb-3">
        <h1 className="font-display text-lg text-gold tracking-[0.2em]">SOUL RECORD</h1>
        <p className="text-xs text-muted-foreground tracking-wider mt-1">Your nightmare history</p>
      </header>

      <div className="px-4 space-y-4">
        {/* Profile */}
        <div className="text-center pt-3 pb-2">
          <div
            className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center font-display text-xl text-background"
            style={{ background: "linear-gradient(135deg, #7B5EA7, #8A6A28)" }}
          >
            {initial}
          </div>
          <p className="font-display text-gold tracking-[0.15em]">{state.profile.name}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {rank} · {core.name} Core · {state.totalShards.toLocaleString()} shards
          </p>
        </div>

        {/* True Name */}
        {state.trueName && (
          <div
            className="border-purple-rune p-4 text-center"
            style={{ background: "linear-gradient(135deg, rgba(123,94,167,0.18), rgba(201,168,76,0.06))" }}
          >
            <p className="text-[10px] tracking-[0.2em] text-purple-bright uppercase mb-2">
              True Name · Granted by the Nightmare
            </p>
            <p className="font-display text-xl tracking-[0.3em]">{state.trueName.name.toUpperCase()}</p>
            <p className="text-[11px] text-muted-foreground mt-2">{state.trueName.description}</p>
          </div>
        )}

        {/* Aspect & Flaw summary */}
        {state.aspect && (
          <div className="space-y-2">
            <div className="bg-surface-2 border-l-2 border-l-gold p-3">
              <p className="text-[10px] tracking-[0.15em] text-gold uppercase mb-1">Aspect · {state.aspect.name} · {state.aspect.rank}</p>
              <p className="text-xs text-muted-foreground">{state.aspect.description}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Triggered by {state.aspect.exercise}</p>
            </div>
            {state.flaw && (
              <div className="bg-surface-2 border-l-2 border-l-destructive p-3">
                <p className="text-[10px] tracking-[0.15em] text-destructive uppercase mb-1">Flaw · {state.flaw.name}</p>
                <p className="text-xs text-muted-foreground">{state.flaw.description}</p>
              </div>
            )}
          </div>
        )}

        {/* Sect */}
        <Link to="/cohorts" className="block bg-surface-2 border-rune p-3.5">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Sect</p>
              <p className="font-display text-sm mt-1 text-gold">
                {state.cohort ? state.cohort.name : "Join or forge a Sect"}
              </p>
              {state.cohort && (
                <p className="text-[11px] text-muted-foreground mt-0.5 tracking-[0.2em]">{state.cohort.code}</p>
              )}
            </div>
            <span className="text-gold text-lg">→</span>
          </div>
        </Link>

        {/* Memories */}
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase">Memories</p>
            <Link to="/memories" className="text-[11px] text-gold">
              {state.memories.length} held · {equippedCount} equipped →
            </Link>
          </div>
          <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
            {TYPES.map(t => (
              <button
                key={t}
                onClick={() => setFilter(t)}
                className={`px-3 py-1 text-[11px] border whitespace-nowrap ${
                  filter === t ? "bg-gold/15 border-gold text-gold" : "bg-surface-2 border-rune text-muted-foreground"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <div className="bg-surface-2 border-rune p-5 text-center text-xs text-muted-foreground">
              The vault is empty. Slay creatures in the Dream Realm.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {list.slice(0, 6).map(m => {
                const equipped = state.equippedMemoryIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    className={`bg-surface-2 border p-3 ${equipped ? "border-gold/50" : "border-rune"}`}
                  >
                    <div className="text-lg mb-1.5">{TYPE_ICON[m.type]}</div>
                    <p className={`font-display text-xs mb-1 ${RANK_COLOR[m.rank]}`}>{m.name}</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">{m.attribute}</p>
                    {equipped && <p className="text-[9px] text-gold mt-1">✓ equipped</p>}
                  </div>
                );
              })}
            </div>
          )}
          {list.length > 6 && (
            <Link to="/memories" className="block text-center text-[11px] text-gold mt-2">
              View all {list.length} memories →
            </Link>
          )}
        </div>

        {/* Nightmare History */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-2">Nightmare History</p>
          {nmHistory.map(n => (
            <div key={n} className="bg-surface-2 border-rune p-3.5 mb-2">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-display text-sm text-gold">{n}{ordinal(n)} Nightmare</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">PASSED</p>
                </div>
                <p className="text-[10px] text-right" style={{ color: "#27AE60" }}>Cleared</p>
              </div>
            </div>
          ))}

          {/* Upcoming locked nightmares */}
          {CORES.slice(state.nightmaresPassed, state.nightmaresPassed + 2).map((_, i) => {
            const nmNum = state.nightmaresPassed + i + 1;
            const needed = NIGHTMARE_UNLOCK_AT[nmNum] ?? 9999;
            const unlocked = state.workouts.length >= needed;
            if (unlocked) return null;
            return (
              <div key={nmNum} className="bg-surface-2 border-danger-rune p-3.5 mb-2 opacity-60">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-display text-sm text-muted-foreground">{nmNum}{ordinal(nmNum)} Nightmare</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Unlocks at {needed} expeditions ({state.workouts.length}/{needed})
                    </p>
                  </div>
                  <p className="text-[10px] text-right" style={{ color: "#C0392B" }}>Locked</p>
                </div>
              </div>
            );
          })}
        </div>

        <details className="pt-2 text-center text-xs text-muted-foreground">
          <summary className="cursor-pointer">Settings</summary>
          <button
            onClick={() => { reset(); navigate({ to: "/" }); }}
            className="mt-3 text-destructive underline"
          >
            Erase all progress
          </button>
        </details>
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
