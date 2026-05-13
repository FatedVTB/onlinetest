<<<<<<< HEAD
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useGame } from "@/lib/store";
import { currentCoreInfo, currentMultiplier, computeRank } from "@/lib/game";
import { BottomNav } from "@/components/BottomNav";
import type { Memory, MemoryType, MemoryRank } from "@/lib/memories";
=======
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useGame } from "@/lib/store";
import { currentCoreInfo, computeRank, CORES, NIGHTMARE_UNLOCK_AT } from "@/lib/game";
import { BottomNav } from "@/components/BottomNav";
import { RANK_COLOR, type MemoryType } from "@/lib/memories";
import { useState } from "react";
>>>>>>> 67891d0b27fe2be929d6ffbd7fd1850ebf28d11a

export const Route = createFileRoute("/soul")({
  component: SoulPage,
  head: () => ({ meta: [{ title: "Soul Record — Shadow Slave" }] }),
});

<<<<<<< HEAD
// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_ICON: Record<MemoryType, string> = {
  Weapon: "⚔", Armour: "🛡", Charm: "✧", Tool: "⛓",
};

const RANK_TIER: Record<MemoryRank, string> = {
  Lesser: "I", Common: "II", Greater: "III", Grand: "IV", Legendary: "V",
};

const RANK_GLOW: Record<MemoryRank, string> = {
  Lesser:    "rgba(138,134,128,0.5)",
  Common:    "rgba(232,228,217,0.5)",
  Greater:   "rgba(166,125,212,0.7)",
  Grand:     "rgba(201,168,76,0.85)",
  Legendary: "rgba(255,200,80,1.0)",
};

const RANK_BORDER: Record<MemoryRank, string> = {
  Lesser:    "rgba(138,134,128,0.4)",
  Common:    "rgba(232,228,217,0.4)",
  Greater:   "rgba(166,125,212,0.55)",
  Grand:     "rgba(201,168,76,0.7)",
  Legendary: "rgba(255,200,80,0.9)",
};

// Positions for floating memory orbs (viewport %).
// The centre text column occupies roughly x 33–67 % between y 8–88 %.
// Orbs are placed in the four outer bands plus the top/bottom strip so they
// never block the label words; the text column itself stays clear.
const FLOAT_POS: Array<{ x: number; y: number }> = [
  // ── Far-left strip (x 3–9 %)
  { x: 4,  y: 8  }, { x: 7,  y: 21 }, { x: 4,  y: 35 }, { x: 8,  y: 49 },
  { x: 5,  y: 63 }, { x: 7,  y: 76 }, { x: 4,  y: 89 },
  // ── Far-right strip (x 91–96 %)
  { x: 94, y: 12 }, { x: 92, y: 26 }, { x: 95, y: 40 }, { x: 93, y: 54 },
  { x: 94, y: 68 }, { x: 92, y: 82 }, { x: 95, y: 93 },
  // ── Mid-left band (x 16–30 %)
  { x: 18, y: 5  }, { x: 26, y: 17 }, { x: 21, y: 31 }, { x: 29, y: 45 },
  { x: 17, y: 59 }, { x: 24, y: 72 }, { x: 20, y: 85 },
  // ── Mid-right band (x 70–84 %)
  { x: 76, y: 7  }, { x: 82, y: 20 }, { x: 72, y: 34 }, { x: 80, y: 48 },
  { x: 74, y: 62 }, { x: 83, y: 75 }, { x: 70, y: 88 },
  // ── Top strip (y 2–7 %, any x including centre)
  { x: 38, y: 3  }, { x: 50, y: 6  }, { x: 62, y: 4  },
  // ── Bottom strip (y 90–97 %, any x including centre)
  { x: 36, y: 91 }, { x: 50, y: 94 }, { x: 64, y: 96 },
  // ── Extra left-side fill
  { x: 11, y: 14 }, { x: 13, y: 43 }, { x: 10, y: 70 },
  // ── Extra right-side fill
  { x: 87, y: 16 }, { x: 89, y: 57 }, { x: 86, y: 79 },
];

const STAR_PTS: Array<{ x: number; y: number }> = [
  { x: 10, y: 7  }, { x: 28, y: 4  }, { x: 50, y: 8  }, { x: 72, y: 5  }, { x: 90, y: 10 },
  { x: 95, y: 28 }, { x: 88, y: 46 }, { x: 93, y: 64 }, { x: 84, y: 80 }, { x: 68, y: 90 },
  { x: 50, y: 94 }, { x: 32, y: 88 }, { x: 16, y: 92 }, { x: 6,  y: 76 }, { x: 4,  y: 58 },
  { x: 8,  y: 38 }, { x: 12, y: 20 }, { x: 35, y: 16 }, { x: 60, y: 18 }, { x: 78, y: 22 },
];

const STAR_LINES: [number, number][] = [
  [0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],
  [9,10],[10,11],[11,12],[12,13],[13,14],[14,15],[15,16],[16,17],[17,18],[18,19],[19,5],
  [0,15],[1,17],[2,18],[3,19],[16,0],[11,9],[14,12],[6,8],
];

// ── Sub-components ─────────────────────────────────────────────────────────

function ConstellationBg() {
  return (
    <svg
      aria-hidden
      className="fixed pointer-events-none"
      style={{ inset: 0, width: "100%", height: "100%", zIndex: 1 }}
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
    >
      {STAR_LINES.map(([a, b], i) => (
        <line
          key={i}
          x1={STAR_PTS[a].x} y1={STAR_PTS[a].y}
          x2={STAR_PTS[b].x} y2={STAR_PTS[b].y}
          stroke="rgba(201,168,76,0.10)"
          strokeWidth="0.18"
        />
      ))}
      {STAR_PTS.map((pt, i) => (
        <circle key={i} cx={pt.x} cy={pt.y} r="0.4" fill="rgba(201,168,76,0.55)" />
      ))}
    </svg>
  );
}

// Single "Field: [Value]," line — no box, just text
function InfoLine({ field, value, last = false }: { field: string; value: string; last?: boolean }) {
  return (
    <p className="text-[15px] leading-relaxed tracking-wide">
      <span className="text-muted-foreground">{field}:</span>{" "}
      <span className="text-foreground/85">[{value}]</span>
      {!last && <span className="text-muted-foreground/40">,</span>}
    </p>
  );
}

// Hoverable label word that expands to info lines below it on hover / tap
function SoulEntry({
  myId, label, lines, activeId, onHover, onLeave, onTap, color = "gold",
}: {
  myId: string;
  label: string;
  lines: Array<[string, string]>;
  activeId: string | null;
  onHover: () => void;
  onLeave: () => void;
  onTap:   () => void;
  color?: "gold" | "purple" | "red";
}) {
  const isOpen = activeId === myId;
  const accent =
    color === "gold"   ? "#C9A84C" :
    color === "purple" ? "#A67DD4" :
                         "#C0392B";

  return (
    <div
      className="text-center w-full cursor-pointer select-none"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      onClick={onTap}
    >
      <p
        className="font-display text-xl tracking-[0.3em] transition-all duration-200"
        style={{
          color: accent,
          opacity: isOpen ? 1 : 0.55,
          textShadow: isOpen ? `0 0 18px ${accent}66` : "none",
        }}
      >
        {label.toUpperCase()}
      </p>

      {isOpen && (
        <div className="mt-2 inline-block text-left">
          {lines.map(([field, value], i) => (
            <InfoLine key={i} field={field} value={value} last={i === lines.length - 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

function SoulPage() {
  const navigate = useNavigate();
  const { state, reset } = useGame();

  // Which soul-label is expanded (hover on desktop, tap on mobile)
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [pinnedLabel,  setPinnedLabel]  = useState<string | null>(null);
  const activeLabel = pinnedLabel ?? hoveredLabel;

  // Which memory orb is showing its popup
  const [hoveredMemory, setHoveredMemory] = useState<Memory | null>(null);
  const [pinnedMemory,  setPinnedMemory]  = useState<Memory | null>(null);

  if (!state.profile) {
    return (
      <div className="min-h-screen pb-24 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Begin your journey first.</p>
=======
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
>>>>>>> 67891d0b27fe2be929d6ffbd7fd1850ebf28d11a
        <BottomNav />
      </div>
    );
  }

<<<<<<< HEAD
  const core     = currentCoreInfo(state.totalShards);
  const coreName = core.name.replace(" (Max)", "");
  const mult     = currentMultiplier(state.totalShards);
  const rank     = computeRank(state.nightmaresPassed, state.workouts.length);
  // Show all memories; if count exceeds the position pool, cycle with a small
  // offset so duplicate-slot orbs don't sit exactly on top of each other.
  const floaters = state.memories;

  // Build handlers for a given label id
  function lh(id: string) {
    return {
      onHover: () => setHoveredLabel(id),
      onLeave: () => setHoveredLabel(null),
      onTap:   () => setPinnedLabel(prev => prev === id ? null : id),
    };
  }

  return (
    <>
      {/* Extra-dark tint — semi-transparent so z:0 orbs bleed through */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ background: "rgba(3,3,5,0.55)", zIndex: 2 }}
      />

      <ConstellationBg />

      {/* Floating memory orbs */}
      {floaters.map((mem, i) => {
        // Cycle through the position pool; each extra lap nudges by a few % so
        // orbs in the same slot don't sit exactly on top of one another.
        const base  = FLOAT_POS[i % FLOAT_POS.length];
        const lap   = Math.floor(i / FLOAT_POS.length);
        const pos   = { x: base.x + lap * 3, y: base.y + lap * 4 };
        const isActive = pinnedMemory?.id === mem.id || hoveredMemory?.id === mem.id;

        // Popup position: below orb unless near screen bottom; h-aligned to band
        const showBelow   = pos.y < 75;
        const isLeftEdge  = pos.x < 35;
        const isRightEdge = pos.x > 65;

        const popupStyle: CSSProperties = {
          position: "absolute",
          [showBelow ? "top" : "bottom"]: "calc(100% + 7px)",
          ...(isRightEdge
            ? { right: 0 }
            : isLeftEdge
            ? { left: 0 }
            : { left: "50%", transform: "translateX(-50%)" }),
          width: "160px",
          zIndex: 6,
          pointerEvents: "none",
          padding: "5px 7px",
          background: "rgba(3,3,5,0.85)",
        };

        return (
          <div
            key={mem.id}
            className="fixed float-slow cursor-pointer select-none"
            style={{
              left: `${pos.x}%`,
              top:  `${pos.y}%`,
              transform: "translate(-50%,-50%)",
              zIndex: 5,
              width: "30px",
              height: "30px",
              borderRadius: "50%",
              border: `1px solid ${RANK_BORDER[mem.rank]}`,
              background: "rgba(6,6,8,0.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "12px",
              boxShadow: `0 0 10px ${RANK_GLOW[mem.rank]}`,
              animationDelay: `${-(i * 0.65)}s`,
            }}
            onMouseEnter={() => setHoveredMemory(mem)}
            onMouseLeave={() => setHoveredMemory(null)}
            onClick={() => setPinnedMemory(prev => prev?.id === mem.id ? null : mem)}
          >
            {TYPE_ICON[mem.type]}

            {/* Popup: appears below / above the orb, no box */}
            {isActive && (
              <div style={popupStyle}>
                <InfoLine field="Memory" value={mem.name} />
                <InfoLine field="Type"   value={mem.type} />
                <InfoLine field="Tier"   value={RANK_TIER[mem.rank]} />
                <InfoLine field="Effect" value={mem.attribute} />
                <InfoLine field="Flavor" value={mem.flavor} last />
              </div>
            )}
          </div>
        );
      })}

      {/* Scrollable label column */}
      <div
        className="relative min-h-screen pb-28 overflow-y-auto"
        style={{ zIndex: 4 }}
      >
        <div className="flex flex-col items-center gap-7 px-6 pt-14 pb-4 max-w-xs mx-auto">

          {/* Aspirant name */}
          <p className="font-display text-2xl text-gold tracking-[0.22em] text-glow-strong">
            {state.profile.name.toUpperCase()}
          </p>

          {/* Rank */}
          <SoulEntry
            myId="rank" label="Rank" activeId={activeLabel} {...lh("rank")}
            lines={[
              ["Rank",               rank],
              ["Nightmares",         String(state.nightmaresPassed)],
              ["Expeditions",        String(state.workouts.length)],
            ]}
          />

          {/* Class */}
          <SoulEntry
            myId="class" label="Class" activeId={activeLabel} color="purple" {...lh("class")}
            lines={[
              ["Core",             coreName],
              ["Soul Shards",      state.totalShards.toLocaleString()],
              ["Multiplier",       `×${mult.toFixed(2)}`],
            ]}
          />

          {/* Aspect */}
          {state.aspect && (
            <SoulEntry
              myId="aspect" label="Aspect" activeId={activeLabel} {...lh("aspect")}
              lines={[
                ["Aspect",             state.aspect.name],
                ["Aspect Rank",        state.aspect.rank],
                ["Aspect Description", state.aspect.description],
                ["Triggered By",       state.aspect.exercise],
              ]}
            />
          )}

          {/* Flaw */}
          {state.flaw && (
            <SoulEntry
              myId="flaw" label="Flaw" activeId={activeLabel} color="red" {...lh("flaw")}
              lines={[
                ["Flaw",        state.flaw.name],
                ["Description", state.flaw.description],
              ]}
            />
          )}

          {/* True Name */}
          {state.trueName && (
            <SoulEntry
              myId="truename" label="True Name" activeId={activeLabel} color="purple" {...lh("truename")}
              lines={[
                ["True Name",   state.trueName.name],
                ["Description", state.trueName.description],
              ]}
            />
          )}

          {/* Memory hint */}
          {state.memories.length > 0 && (
            <p
              className="text-[9px] uppercase tracking-[0.22em] text-center"
              style={{ color: "rgba(201,168,76,0.28)" }}
            >
              {state.memories.length} {state.memories.length === 1 ? "Memory" : "Memories"} · tap orbs to inspect
            </p>
          )}

          {/* Erase progress */}
          <div className="w-full text-center mb-4">
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer opacity-25 hover:opacity-55 transition-opacity select-none">
                Settings
              </summary>
              <button
                onClick={() => { reset(); navigate({ to: "/" }); }}
                className="mt-3 text-destructive underline text-xs"
              >
                Erase all progress
              </button>
            </details>
          </div>

        </div>
      </div>

      <BottomNav />
    </>
  );
}
=======
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
>>>>>>> 67891d0b27fe2be929d6ffbd7fd1850ebf28d11a
