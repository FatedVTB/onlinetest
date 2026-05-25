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

// ── Desktop memory-orb positions ─────────────────────────────────────────────
// Grid covers the entire viewport.  The soul-text zone (≈ x 39–61 %, y 31–63 %)
// and bottom-nav zone (y > 85 %) are excluded.
// Columns are ordered outermost → innermost so the margins fill first; the
// centre only populates once there are enough memories to warrant it (~140+).
// ~260 unique positions — overlap shouldn't occur in normal play.
const DESKTOP_FLOAT_POS: Array<{ x: number; y: number }> = (() => {
  // Pairs ordered by distance from the centre (50 %): furthest first.
  // Each pair is [leftX, rightX].
  const colPairs: [number, number][] = [
    [3, 97], [8, 92], [13, 87], [18, 82],
    [23, 77], [28, 72], [33, 67], [38, 62],
    [43, 57], [48, 52],
  ];
  const ys = [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 66, 72, 78, 84];
  const out: Array<{ x: number; y: number }> = [];
  for (const [lx, rx] of colPairs) {
    for (const y of ys) {
      // Exclude the soul-text zone: roughly x 39–61 %, y 31–63 %
      const inTextZone = (x: number) => x >= 39 && x <= 61 && y >= 31 && y <= 63;
      if (!inTextZone(lx)) out.push({ x: lx, y });
      if (!inTextZone(rx)) out.push({ x: rx, y });
    }
  }
  return out;
})();

// ── Mobile memory-orb positions ────────────────────────────────────────────
// Four safe zones — orb is 24px so center must stay ≥12px from screen edges;
// x=5% is the minimum safe value on a 240px+ device.
// y is hard-capped at 84% to stay clear of the fixed bottom nav bar.
//
// Zone 1 — Above text  (y < 31%): full width safe, text starts at pt-[36vh]
// Zone 2 — Left strip  (y 33–76%): beside the centered labels (x ≤ 16%)
// Zone 3 — Right strip (y 33–76%): beside the centered labels (x ≥ 84%)
// Zone 4 — Below text  (y 78–84%): center is clear once labels end
//
// Total: 55 + 16 + 16 + 14 = 101 positions
const MOBILE_FLOAT_POS: Array<{ x: number; y: number }> = (() => {
  const out: Array<{ x: number; y: number }> = [];

  // Zone 1: above text — any x from 5%–95%, y 4%–27%
  const aboveXs = [5, 14, 23, 32, 41, 50, 59, 68, 77, 86, 95];
  const aboveYs = [4, 9, 15, 21, 27];
  for (const x of aboveXs) {
    for (const y of aboveYs) {
      out.push({ x, y });
    }
  }

  // Zone 2: left of centered text labels (y 33–76%)
  // Centered labels (e.g. TRUE NAME) extend to about x=22%, so x≤16% is safe
  const sideYs = [33, 39, 45, 51, 57, 63, 69, 75];
  for (const x of [5, 13]) {
    for (const y of sideYs) out.push({ x, y });
  }

  // Zone 3: right of centered text labels
  for (const x of [87, 95]) {
    for (const y of sideYs) out.push({ x, y });
  }

  // Zone 4: below text — center is free once labels end (~y 77%)
  const belowXs = [14, 25, 36, 50, 64, 75, 86];
  for (const x of belowXs) {
    out.push({ x, y: 79 });
    out.push({ x, y: 84 });
  }

  return out;
})();

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
          // Popup lives inside the orb's own stacking context; the orb is at
          // z-index 9999 when active so this is already above every other orb.
          zIndex: 10,
          pointerEvents: "auto",
          padding: "5px 7px",
          background: "rgba(3,3,5,0.97)",
          border: "1px solid rgba(201,168,76,0.28)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.9)",
        };

        return (
          <div
            key={mem.id}
            className="fixed float-slow cursor-pointer select-none"
            style={{
              left: `${pos.x}%`,
              top:  `${pos.y}%`,
              transform: "translate(-50%,-50%)",
              // 9999 when active so the popup is guaranteed above every other orb
              zIndex: isActive ? 9999 : 5,
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
