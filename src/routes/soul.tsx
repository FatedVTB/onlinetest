import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import type { CSSProperties } from "react";
import { useGame } from "@/lib/store";
import { currentCoreInfo, currentMultiplier, computeRank } from "@/lib/game";
import { BottomNav } from "@/components/BottomNav";
import { getMemoryEffect } from "@/lib/memories";
import type { Memory, MemoryType, MemoryRank } from "@/lib/memories";

export const Route = createFileRoute("/soul")({
  component: SoulPage,
  head: () => ({ meta: [{ title: "Soul Record — Shadow Slave" }] }),
});

// ── Constants ──────────────────────────────────────────────────────────────

const TYPE_ICON: Record<MemoryType, string> = {
  Weapon: "⚔", Armour: "🛡", Charm: "✧", Tool: "⛓",
};

const EQUIP_LIMITS: Record<MemoryType, number> = {
  Weapon: 3, Armour: 3, Charm: 3, Tool: Infinity,
};

const RANK_GLOW: Record<MemoryRank, string> = {
  Awakened:    "rgba(138,134,128,0.5)",
  Ascended:    "rgba(232,228,217,0.5)",
  Transcended: "rgba(166,125,212,0.7)",
  Supreme:     "rgba(201,168,76,0.85)",
  Sacred:      "rgba(220,100,50,0.85)",
  Divine:      "rgba(255,200,80,1.0)",
};

const RANK_BORDER: Record<MemoryRank, string> = {
  Awakened:    "rgba(138,134,128,0.4)",
  Ascended:    "rgba(232,228,217,0.4)",
  Transcended: "rgba(166,125,212,0.55)",
  Supreme:     "rgba(201,168,76,0.7)",
  Sacred:      "rgba(220,100,50,0.7)",
  Divine:      "rgba(255,200,80,0.9)",
};

// ── Desktop memory-orb positions ───────────────────────────────────────────
// Safe zones: left margin (x 2–31 %) and right margin (x 69–98 %).
// The centre column (≈33–67 % x) is kept clear for the soul text.
// y is capped at 85 % so no orb can ever overlap the fixed bottom nav bar.
// 59 positions total — enough that wrapping only occurs at very high counts.
const DESKTOP_FLOAT_POS: Array<{ x: number; y: number }> = [
  // ── Outermost left column (x ≈ 4) ──
  { x: 4,  y: 6  }, { x: 4,  y: 18 }, { x: 4,  y: 30 }, { x: 4,  y: 42 },
  { x: 4,  y: 54 }, { x: 4,  y: 66 }, { x: 4,  y: 78 },
  // ── Inner-left column (x ≈ 10) ──
  { x: 10, y: 12 }, { x: 10, y: 24 }, { x: 10, y: 36 }, { x: 10, y: 48 },
  { x: 10, y: 60 }, { x: 10, y: 72 }, { x: 10, y: 83 },
  // ── Mid-left column (x ≈ 17) ──
  { x: 17, y: 5  }, { x: 17, y: 17 }, { x: 17, y: 29 }, { x: 17, y: 41 },
  { x: 17, y: 53 }, { x: 17, y: 65 }, { x: 17, y: 77 },
  // ── Near-left column (x ≈ 24) ──
  { x: 24, y: 9  }, { x: 24, y: 21 }, { x: 24, y: 33 }, { x: 24, y: 45 },
  { x: 24, y: 57 }, { x: 24, y: 69 }, { x: 24, y: 81 },
  // ── Near-right column (x ≈ 76) ──
  { x: 76, y: 9  }, { x: 76, y: 21 }, { x: 76, y: 33 }, { x: 76, y: 45 },
  { x: 76, y: 57 }, { x: 76, y: 69 }, { x: 76, y: 81 },
  // ── Mid-right column (x ≈ 83) ──
  { x: 83, y: 5  }, { x: 83, y: 17 }, { x: 83, y: 29 }, { x: 83, y: 41 },
  { x: 83, y: 53 }, { x: 83, y: 65 }, { x: 83, y: 77 },
  // ── Inner-right column (x ≈ 90) ──
  { x: 90, y: 12 }, { x: 90, y: 24 }, { x: 90, y: 36 }, { x: 90, y: 48 },
  { x: 90, y: 60 }, { x: 90, y: 72 }, { x: 90, y: 83 },
  // ── Outermost right column (x ≈ 96) ──
  { x: 96, y: 6  }, { x: 96, y: 18 }, { x: 96, y: 30 }, { x: 96, y: 42 },
  { x: 96, y: 54 }, { x: 96, y: 66 }, { x: 96, y: 78 },
  // ── Top strip (above the soul text, centre x is fine here) ──
  { x: 37, y: 3  }, { x: 50, y: 5  }, { x: 63, y: 3  },
];

// ── Mobile memory-orb positions ────────────────────────────────────────────
// On a narrow phone the text column spans ~8–92 % of the viewport width, so
// orbs live in the extreme left/right strips (x ≤ 8 % or x ≥ 92 %) and the
// top strip (y ≤ 5 %).  y is hard-capped at 85 % — nothing enters the bottom
// nav zone.  38 positions means memories stay visible up to much higher counts
// before cycling.
const MOBILE_FLOAT_POS: Array<{ x: number; y: number }> = [
  // ── Far-left strip (x ≈ 3) ──
  { x: 3, y: 8  }, { x: 3, y: 18 }, { x: 3, y: 28 }, { x: 3, y: 38 },
  { x: 3, y: 48 }, { x: 3, y: 58 }, { x: 3, y: 68 }, { x: 3, y: 78 },
  { x: 3, y: 85 },
  // ── Inner-left strip (x ≈ 7) ──
  { x: 7, y: 13 }, { x: 7, y: 23 }, { x: 7, y: 33 }, { x: 7, y: 43 },
  { x: 7, y: 53 }, { x: 7, y: 63 }, { x: 7, y: 73 }, { x: 7, y: 83 },
  // ── Far-right strip (x ≈ 97) ──
  { x: 97, y: 8  }, { x: 97, y: 18 }, { x: 97, y: 28 }, { x: 97, y: 38 },
  { x: 97, y: 48 }, { x: 97, y: 58 }, { x: 97, y: 68 }, { x: 97, y: 78 },
  { x: 97, y: 85 },
  // ── Inner-right strip (x ≈ 93) ──
  { x: 93, y: 13 }, { x: 93, y: 23 }, { x: 93, y: 33 }, { x: 93, y: 43 },
  { x: 93, y: 53 }, { x: 93, y: 63 }, { x: 93, y: 73 }, { x: 93, y: 83 },
  // ── Top strip (centre x is safe this high up) ──
  { x: 20, y: 3 }, { x: 40, y: 4 }, { x: 60, y: 3 }, { x: 80, y: 4 },
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

function InfoLine({ field, value, last = false, small = false }: {
  field: string; value: string; last?: boolean; small?: boolean;
}) {
  return (
    <p className={`${small ? "text-[13px]" : "text-[15px]"} leading-relaxed tracking-wide`}>
      <span className="text-muted-foreground">{field}:</span>{" "}
      <span className="text-foreground/85">[{value}]</span>
      {!last && <span className="text-muted-foreground/40">,</span>}
    </p>
  );
}

function SoulEntry({
  myId, label, lines, activeId, onHover, onLeave, onTap,
  color = "gold", small = false,
}: {
  myId: string;
  label: string;
  lines: Array<[string, string]>;
  activeId: string | null;
  onHover: () => void;
  onLeave: () => void;
  onTap:   () => void;
  color?:  "gold" | "purple" | "red";
  small?:  boolean;
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
        className={`font-display ${small ? "text-lg" : "text-xl"} tracking-[0.3em] transition-all duration-200`}
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
            <InfoLine
              key={i}
              field={field}
              value={value}
              last={i === lines.length - 1}
              small={small}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

function SoulPage() {
  const { state, equipMemory, unequipMemory } = useGame();

  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const [pinnedLabel,  setPinnedLabel]  = useState<string | null>(null);
  const activeLabel = pinnedLabel ?? hoveredLabel;

  const [hoveredMemory, setHoveredMemory] = useState<Memory | null>(null);
  const [pinnedMemory,  setPinnedMemory]  = useState<Memory | null>(null);

  if (!state.profile) {
    return (
      <div className="min-h-screen pb-24 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Begin your journey first.</p>
        <BottomNav />
      </div>
    );
  }

  const isMobile = state.platform === "mobile";

  const core     = currentCoreInfo(state.totalShards);
  const coreName = core.name.replace(" (Max)", "");
  const mult     = currentMultiplier(state.totalShards);
  const rank     = computeRank(state.nightmaresPassed, state.workouts.length);

  const floaters = state.memories;

  // On mobile, use edge-only positions so orbs never overlap the text column
  const floatPos = isMobile ? MOBILE_FLOAT_POS : DESKTOP_FLOAT_POS;

  // Orb visual sizes: smaller on mobile so they don't crowd the edges
  const orbSize    = isMobile ? 24 : 30;
  const orbFont    = isMobile ? 10 : 12;
  const popupWidth = isMobile ? 148 : 175;

  function lh(id: string) {
    return {
      onHover: () => setHoveredLabel(id),
      onLeave: () => setHoveredLabel(null),
      onTap:   () => setPinnedLabel(prev => prev === id ? null : id),
    };
  }

  return (
    <>
      {/* Extra-dark tint */}
      <div
        aria-hidden
        className="fixed inset-0 pointer-events-none"
        style={{ background: "rgba(3,3,5,0.55)", zIndex: 2 }}
      />

      <ConstellationBg />

      {/* Floating memory orbs */}
      {floaters.map((mem, i) => {
        // Cycle through the safe position pool. When count exceeds pool size the
        // positions repeat — orbs share a slot but stay inside the safe zones
        // (margins + top strip, never the bottom nav or centre text).
        const pos = floatPos[i % floatPos.length];
        const isActive = pinnedMemory?.id === mem.id || hoveredMemory?.id === mem.id;

        const showBelow   = pos.y < 75;
        const isLeftEdge  = pos.x < 35;
        const isRightEdge = pos.x > 65;

        const popupStyle: CSSProperties = {
          position: "absolute",
          [showBelow ? "top" : "bottom"]: `calc(100% + ${isMobile ? 5 : 7}px)`,
          ...(isRightEdge
            ? { right: 0 }
            : isLeftEdge
            ? { left: 0 }
            : { left: "50%", transform: "translateX(-50%)" }),
          width: `${popupWidth}px`,
          zIndex: 6,
          pointerEvents: "auto",
          padding: "5px 7px",
          background: "rgba(3,3,5,0.92)",
          border: "1px solid rgba(201,168,76,0.15)",
        };

        return (
          <div
            key={mem.id}
            className="fixed float-slow cursor-pointer select-none"
            style={{
              left: `${pos.x}%`,
              top:  `${pos.y}%`,
              transform: "translate(-50%,-50%)",
              zIndex: isActive ? 50 : 5,
              width:  `${orbSize}px`,
              height: `${orbSize}px`,
              borderRadius: "50%",
              border: `1px solid ${RANK_BORDER[mem.rank]}`,
              background: "rgba(6,6,8,0.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: `${orbFont}px`,
              boxShadow: `0 0 ${isMobile ? 7 : 10}px ${RANK_GLOW[mem.rank]}`,
              animationDelay: `${-(i * 0.65)}s`,
            }}
            onMouseEnter={() => setHoveredMemory(mem)}
            onMouseLeave={() => setHoveredMemory(null)}
            onClick={() => setPinnedMemory(prev => prev?.id === mem.id ? null : mem)}
          >
            {TYPE_ICON[mem.type]}

            {state.equippedMemoryIds.includes(mem.id) && (
              <span style={{
                position: "absolute",
                bottom: `${isMobile ? -6 : -7}px`,
                left: "50%",
                transform: "translateX(-50%)",
                fontSize: "11px",
                color: "rgba(201,168,76,0.9)",
                lineHeight: 1,
                pointerEvents: "none",
              }}>✦</span>
            )}

            {isActive && (
              <div style={popupStyle} onClick={e => e.stopPropagation()}>
                <InfoLine field="Memory" value={mem.name} small={isMobile} />
                <InfoLine field="Rank"   value={mem.rank} small={isMobile} />
                <InfoLine field="Tier"   value={`Tier ${mem.tier}`} small={isMobile} />
                <InfoLine field="Type"   value={mem.type} small={isMobile} />
                <InfoLine field="Effect" value={mem.attribute} small={isMobile} />
                <InfoLine field="Flavor" value={mem.flavor} last small={isMobile} />
                {Object.keys(getMemoryEffect(mem)).length > 0 && (() => {
                  const equipped  = state.equippedMemoryIds.includes(mem.id);
                  const limit     = EQUIP_LIMITS[mem.type];
                  const typeFull  = !equipped && isFinite(limit) && state.memories.filter(
                    m => state.equippedMemoryIds.includes(m.id) && m.type === mem.type
                  ).length >= limit;
                  return (
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        if (!typeFull) equipped ? unequipMemory(mem.id) : equipMemory(mem.id);
                      }}
                      style={{
                        marginTop: "6px",
                        width: "100%",
                        padding: "4px 0",
                        fontSize: "9px",
                        letterSpacing: "0.15em",
                        fontFamily: "inherit",
                        background: equipped
                          ? "rgba(201,168,76,0.15)"
                          : typeFull
                            ? "rgba(255,255,255,0.02)"
                            : "rgba(255,255,255,0.04)",
                        border: `1px solid ${
                          equipped   ? "rgba(201,168,76,0.6)"
                          : typeFull ? "rgba(255,255,255,0.06)"
                          :            "rgba(255,255,255,0.12)"
                        }`,
                        color: equipped
                          ? "rgba(201,168,76,1)"
                          : typeFull
                            ? "rgba(200,200,200,0.3)"
                            : "rgba(200,200,200,0.7)",
                        cursor: typeFull ? "not-allowed" : "pointer",
                      }}
                    >
                      {equipped ? "✓ EQUIPPED" : typeFull ? `SLOT FULL ${limit}/${limit}` : "EQUIP"}
                    </button>
                  );
                })()}
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
        <div
          className={`flex flex-col items-center px-6 pb-4 max-w-xs mx-auto ${
            isMobile ? "gap-5 pt-[36vh]" : "gap-7 pt-[44vh]"
          }`}
        >

          {/* Aspirant name */}
          <p
            className={`font-display text-gold tracking-[0.22em] text-glow-strong ${
              isMobile ? "text-xl" : "text-2xl"
            }`}
          >
            {state.profile.name.toUpperCase()}
          </p>

          <SoulEntry
            myId="rank" label="Rank" activeId={activeLabel} small={isMobile} {...lh("rank")}
            lines={[
              ["Rank",        rank],
              ["Nightmares",  String(state.nightmaresPassed)],
              ["Expeditions", String(state.workouts.length)],
            ]}
          />

          <SoulEntry
            myId="class" label="Class" activeId={activeLabel} color="purple" small={isMobile} {...lh("class")}
            lines={[
              ["Core",        coreName],
              ["Soul Shards", state.totalShards.toLocaleString()],
              ["Multiplier",  `×${mult.toFixed(2)}`],
            ]}
          />

          {state.aspect && (
            <SoulEntry
              myId="aspect" label="Aspect" activeId={activeLabel} small={isMobile} {...lh("aspect")}
              lines={[
                ["Aspect",  state.aspect.name],
                ["Rank",    state.aspect.rank],
                ["Trigger", state.aspect.exercise],
                ...(state.aspect.abilities ?? []).map(
                  (ab, i) => [`Ability ${i + 1}`, ab.description] as [string, string]
                ),
              ]}
            />
          )}

          {state.flaw && (
            <SoulEntry
              myId="flaw" label="Flaw" activeId={activeLabel} color="red" small={isMobile} {...lh("flaw")}
              lines={[
                ["Flaw",        state.flaw.name],
                ["Description", state.flaw.description],
              ]}
            />
          )}

          {state.trueName && (
            <SoulEntry
              myId="truename" label="True Name" activeId={activeLabel} color="purple" small={isMobile} {...lh("truename")}
              lines={[
                ["True Name",   state.trueName.name],
                ["Description", state.trueName.description],
              ]}
            />
          )}

          {state.memories.length > 0 && (
            <p
              className="text-[9px] uppercase tracking-[0.22em] text-center"
              style={{ color: "rgba(201,168,76,0.28)" }}
            >
              {state.memories.length} {state.memories.length === 1 ? "Memory" : "Memories"}
              {isMobile ? " · tap orbs on the edges" : " · tap orbs to inspect"}
            </p>
          )}

          {/* Spacer so last entry clears the bottom nav */}
          <div className="h-4" />

        </div>
      </div>

      <BottomNav />
    </>
  );
}
