import type { MemoryEffect } from "./game";

export type MemoryType = "Weapon" | "Armour" | "Charm" | "Tool";
export type MemoryRank = "Awakened" | "Ascended" | "Transcended" | "Supreme" | "Sacred" | "Divine";
export type MemoryTier = "I" | "II" | "III" | "IV" | "V" | "VI" | "VII";

export type Memory = {
  id: string;
  name: string;
  type: MemoryType;
  rank: MemoryRank;
  tier: MemoryTier;
  attribute: string;
  flavor: string;
  effect: MemoryEffect;
  acquiredAt: number;
};

export const MEMORY_RANKS: MemoryRank[] = ["Awakened", "Ascended", "Transcended", "Supreme", "Sacred", "Divine"];
export const MEMORY_TIERS: MemoryTier[] = ["I", "II", "III", "IV", "V", "VI", "VII"];

// Same roll weights as aspect ranks
const RANK_WEIGHTS: Record<MemoryRank, number> = {
  Awakened: 35, Ascended: 25, Transcended: 20, Supreme: 10, Sacred: 5, Divine: 5,
};

const TIER_WEIGHTS: Record<MemoryTier, number> = {
  "I": 25, "II": 25, "III": 20, "IV": 15, "V": 10, "VI": 5, "VII": 5,
};

// Effect strength lookup tables by tier
const T_PCT: Record<MemoryTier, number> = { "I": 5,  "II": 8,  "III": 12, "IV": 18, "V": 25, "VI": 33, "VII": 40 };
const T_FPR: Record<MemoryTier, number> = { "I": 1,  "II": 1,  "III": 2,  "IV": 2,  "V": 3,  "VI": 4,  "VII": 5  };
const T_FPS: Record<MemoryTier, number> = { "I": 1,  "II": 2,  "III": 3,  "IV": 4,  "V": 5,  "VI": 7,  "VII": 10 };
const T_NM:  Record<MemoryTier, number> = { "I": 5,  "II": 8,  "III": 12, "IV": 18, "V": 25, "VI": 33, "VII": 40 };
const T_BW:  Record<MemoryTier, number> = { "I": 2,  "II": 3,  "III": 5,  "IV": 8,  "V": 12, "VI": 18, "VII": 25 };
const T_DC:  Record<MemoryTier, number> = { "I": 10, "II": 12, "III": 15, "IV": 20, "V": 28, "VI": 40, "VII": 60 };

type PoolEntry = {
  name: string;
  type: MemoryType;
  flavor: string;
  attribute: (t: MemoryTier) => string;
  effect: (t: MemoryTier) => MemoryEffect;
};

const RANK_POOL: Record<MemoryRank, PoolEntry[]> = {
  // ── AWAKENED: single muscle group % buffs ──────────────────────────────
  Awakened: [
    {
      name: "Ember of the Press", type: "Weapon",
      flavor: "The first flame warms the chest.",
      attribute: t => `+${T_PCT[t]}% chest shards`,
      effect:    t => ({ chestPct: T_PCT[t] }),
    },
    {
      name: "Gale Wing", type: "Charm",
      flavor: "A gale that lifts the wings.",
      attribute: t => `+${T_PCT[t]}% shoulder shards`,
      effect:    t => ({ shoulderPct: T_PCT[t] }),
    },
    {
      name: "Root Shard", type: "Armour",
      flavor: "Roots that anchor each step.",
      attribute: t => `+${T_PCT[t]}% leg shards`,
      effect:    t => ({ legPct: T_PCT[t] }),
    },
    {
      name: "Core Ember", type: "Charm",
      flavor: "Warmth radiates from the centre.",
      attribute: t => `+${T_PCT[t]}% core shards`,
      effect:    t => ({ corePct: T_PCT[t] }),
    },
    {
      name: "Twin Coil", type: "Weapon",
      flavor: "Both coils tighten at once.",
      attribute: t => `+${T_PCT[t]}% arm shards`,
      effect:    t => ({ armPct: T_PCT[t] }),
    },
  ],

  // ── ASCENDED: movement pattern buffs + flat per rep ────────────────────
  Ascended: [
    {
      name: "Iron Current", type: "Weapon",
      flavor: "The current flows through iron.",
      attribute: t => `+${T_PCT[t]}% pressing shards`,
      effect:    t => ({ pressPct: T_PCT[t] }),
    },
    {
      name: "Shadow Pull", type: "Weapon",
      flavor: "Drawn from the shadow.",
      attribute: t => `+${T_PCT[t]}% pulling shards`,
      effect:    t => ({ pullPct: T_PCT[t] }),
    },
    {
      name: "Hawk Strike", type: "Charm",
      flavor: "Each strike drops shadow shards.",
      attribute: t => `+${T_FPR[t]} shard${T_FPR[t] === 1 ? "" : "s"} per shoulder rep`,
      effect:    t => ({ shoulderFlatPerRep: T_FPR[t] }),
    },
    {
      name: "Iron March", type: "Armour",
      flavor: "Every march forges iron shards.",
      attribute: t => `+${T_FPR[t]} shard${T_FPR[t] === 1 ? "" : "s"} per leg rep`,
      effect:    t => ({ legFlatPerRep: T_FPR[t] }),
    },
    {
      name: "Veil Shroud", type: "Armour",
      flavor: "The veil absorbs the nightmare's cost.",
      attribute: t => `Lose ${T_NM[t]}% less on failed Nightmares`,
      effect:    t => ({ nmLossReduction: T_NM[t] }),
    },
  ],

  // ── TRANSCENDED: major muscle + flat per set + PR ──────────────────────
  Transcended: [
    {
      name: "Spine of the Void", type: "Weapon",
      flavor: "The void has a spine of iron.",
      attribute: t => `+${T_PCT[t]}% back shards`,
      effect:    t => ({ backPct: T_PCT[t] }),
    },
    {
      name: "Pillar Weight", type: "Armour",
      flavor: "Pillars do not bend.",
      attribute: t => `+${T_PCT[t]}% leg shards`,
      effect:    t => ({ legPct: T_PCT[t] }),
    },
    {
      name: "Blood Echo", type: "Charm",
      flavor: "Blood remembers every record.",
      attribute: t => `+${T_PCT[t]}% shards on PRs`,
      effect:    t => ({ prPct: T_PCT[t] }),
    },
    {
      name: "Soul Fragment", type: "Tool",
      flavor: "Each set sheds a fragment of soul.",
      attribute: t => `+${T_FPS[t]} shards per set`,
      effect:    t => ({ flatPerSet: T_FPS[t] }),
    },
    {
      name: "Serpent Wrap", type: "Weapon",
      flavor: "The serpent wraps tighter with each curl.",
      attribute: t => `+${T_PCT[t]}% biceps shards`,
      effect:    t => ({ bicepsPct: T_PCT[t] }),
    },
  ],

  // ── SUPREME: cross-cutting + stronger flat ─────────────────────────────
  Supreme: [
    {
      name: "Worldshard", type: "Weapon",
      flavor: "The world itself bleeds shards.",
      attribute: t => `+${T_PCT[t]}% all shards`,
      effect:    t => ({ allPct: T_PCT[t] }),
    },
    {
      name: "Victor's Mark", type: "Charm",
      flavor: "Victory leaves its mark.",
      attribute: t => `+${T_PCT[t]}% shards on PRs`,
      effect:    t => ({ prPct: T_PCT[t] }),
    },
    {
      name: "Steel Memory", type: "Tool",
      flavor: "Steel never forgets a record.",
      attribute: t => `+${T_FPR[t]} shard${T_FPR[t] === 1 ? "" : "s"} per rep on PRs`,
      effect:    t => ({ prFlatPerRep: T_FPR[t] }),
    },
    {
      name: "Shard Cascade", type: "Tool",
      flavor: "Each set, shards cascade without end.",
      attribute: t => `+${T_FPS[t]} shards per set`,
      effect:    t => ({ flatPerSet: T_FPS[t] }),
    },
    {
      name: "Iron Sanctuary", type: "Armour",
      flavor: "A sanctuary forged from iron will.",
      attribute: t => `Lose ${T_NM[t]}% less on failed Nightmares`,
      effect:    t => ({ nmLossReduction: T_NM[t] }),
    },
  ],

  // ── SACRED: exotic — weight bonus, memory drop chance ──────────────────
  Sacred: [
    {
      name: "Apotheosis Shard", type: "Charm",
      flavor: "A fragment of something beyond rank.",
      attribute: t => `+${T_PCT[t]}% all shards`,
      effect:    t => ({ allPct: T_PCT[t] }),
    },
    {
      name: "Phantom Pull", type: "Tool",
      flavor: "Phantom weight drags you deeper into shadow.",
      attribute: t => `+${T_BW[t]}kg effective weight on Back exercises`,
      effect:    t => ({ bonusWeightMuscle: "Back" as const, bonusWeightKg: T_BW[t] }),
    },
    {
      name: "Memory Ward", type: "Charm",
      flavor: "Memory draws more memory.",
      attribute: t => `+${T_DC[t]}% memory drop chance`,
      effect:    t => ({ memoryDropChancePct: T_DC[t] }),
    },
    {
      name: "Death's Shroud", type: "Armour",
      flavor: "Even death is shrouded at this rank.",
      attribute: t => `Lose ${T_NM[t]}% less on failed Nightmares`,
      effect:    t => ({ nmLossReduction: T_NM[t] }),
    },
    {
      name: "Endless Echo", type: "Tool",
      flavor: "The echoes of effort never stop.",
      attribute: t => `+${T_FPS[t]} shards per set`,
      effect:    t => ({ flatPerSet: T_FPS[t] }),
    },
    {
      name: "Omen Weave", type: "Charm",
      flavor: "The weave of fate doubles every thread of memory.",
      attribute: _ => `Doubles all memory drop channels (PR, Shard, Nightmare)`,
      effect:    _ => ({ memoryDoubleChance: true }),
    },
  ],

  // ── DIVINE: peak effects ────────────────────────────────────────────────
  Divine: [
    {
      name: "Apex Radiance", type: "Weapon",
      flavor: "At the apex, all things radiate.",
      attribute: t => `+${T_PCT[t]}% all shards`,
      effect:    t => ({ allPct: T_PCT[t] }),
    },
    {
      name: "Titan Legs", type: "Tool",
      flavor: "Titan weight on every step, whether carried or not.",
      attribute: t => `+${T_BW[t]}kg effective weight on Leg exercises`,
      effect:    t => ({ bonusWeightMuscle: "Legs" as const, bonusWeightKg: T_BW[t] }),
    },
    {
      name: "Fate's Memory", type: "Charm",
      flavor: "Fate always remembers. So do you.",
      attribute: t => `+${T_DC[t]}% memory drop chance`,
      effect:    t => ({ memoryDropChancePct: T_DC[t] }),
    },
    {
      name: "Divine Sanctuary", type: "Armour",
      flavor: "Divine protection from the nightmare's toll.",
      attribute: t => `Lose ${T_NM[t]}% less on failed Nightmares`,
      effect:    t => ({ nmLossReduction: T_NM[t] }),
    },
    {
      name: "Godfall Shard", type: "Tool",
      flavor: "Each set, a god falls. Each shard, a name forgotten.",
      attribute: t => `+${T_FPS[t]} shards per set`,
      effect:    t => ({ flatPerSet: T_FPS[t] }),
    },
    {
      name: "Dream Architect", type: "Charm",
      flavor: "The architect reshapes probability itself — memory flows freely.",
      attribute: _ => `Doubles all memory drop channels (PR, Shard, Nightmare)`,
      effect:    _ => ({ memoryDoubleChance: true }),
    },
  ],
};

export const RANK_COLOR: Record<MemoryRank, string> = {
  Awakened:    "text-muted-foreground",
  Ascended:    "text-foreground",
  Transcended: "text-accent",
  Supreme:     "text-primary text-glow",
  Sacred:      "text-ember text-glow-ember",
  Divine:      "text-gold text-glow-strong",
};

function rollRank(): MemoryRank {
  const total = Object.values(RANK_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const rank of MEMORY_RANKS) { if ((r -= RANK_WEIGHTS[rank]) <= 0) return rank; }
  return "Awakened";
}

function rollTier(): MemoryTier {
  const total = Object.values(TIER_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const tier of MEMORY_TIERS) { if ((r -= TIER_WEIGHTS[tier]) <= 0) return tier; }
  return "I";
}

function buildMemory(rank: MemoryRank, tier: MemoryTier): Memory {
  const pool = RANK_POOL[rank];
  const entry = pool[Math.floor(Math.random() * pool.length)];
  return {
    id: crypto.randomUUID(),
    name: entry.name,
    type: entry.type,
    rank,
    tier,
    attribute: entry.attribute(tier),
    flavor: entry.flavor,
    effect: entry.effect(tier),
    acquiredAt: Date.now(),
  };
}

// Roll with elite tier bias — weighted toward Transcended/Supreme/Sacred/Divine (tier III+)
function rollEliteTier(): MemoryTier {
  const eliteWeights: Record<MemoryTier, number> = {
    "I": 0, "II": 0, "III": 20, "IV": 30, "V": 25, "VI": 15, "VII": 10,
  };
  const total = Object.values(eliteWeights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const tier of MEMORY_TIERS) { if ((r -= eliteWeights[tier]) <= 0) return tier; }
  return "IV";
}

// First nightmare only: 50% chance, capped at Ascended rank and Tier III.
export function rollFirstNightmareMemoryDrop(): Memory | null {
  if (Math.random() >= 0.50) return null;
  // Only Awakened or Ascended
  const r = Math.random() * 60; // Awakened:35, Ascended:25
  const rank: MemoryRank = r < 35 ? "Awakened" : "Ascended";
  // Only Tier I, II, or III (weights 25/25/20 → total 70)
  const t = Math.random() * 70;
  const tier: MemoryTier = t < 25 ? "I" : t < 50 ? "II" : "III";
  return buildMemory(rank, tier);
}

// PR drop — totalChancePct is the fully-computed channel chance (base 30 + flat bonus, doubled if applicable, capped at 80).
export function rollPRMemoryDrop(rankBoost: boolean, totalChancePct = 30): Memory | null {
  if (Math.random() >= totalChancePct / 100) return null;
  const rank = rankBoost ? rollBoostedRank() : rollRank();
  return buildMemory(rank, rollTier());
}

// Shard-count drop — totalChancePct is the fully-computed channel chance (base 15, capped at 80).
export function rollExpeditionMemoryDrop(rankBoost: boolean, totalChancePct = 15): Memory | null {
  if (Math.random() >= totalChancePct / 100) return null;
  const rank = rankBoost ? rollBoostedRank() : rollRank();
  return buildMemory(rank, rollTier());
}

// After a nightmare (pass): 2× normal rolls + 1× elite tier roll.
// normalChancePct: fully-computed channel chance (base 50, capped at 80).
// eliteChancePct:  fully-computed channel chance (base 10, capped at 80).
export function rollNightmareMemoryDrops(rankBoost: boolean, normalChancePct = 50, eliteChancePct = 10): Memory[] {
  const drops: Memory[] = [];
  for (let i = 0; i < 2; i++) {
    if (Math.random() < normalChancePct / 100) {
      const rank = rankBoost ? rollBoostedRank() : rollRank();
      drops.push(buildMemory(rank, rollTier()));
    }
  }
  if (Math.random() < eliteChancePct / 100) {
    const rank = rankBoost ? rollBoostedRank() : rollRank();
    drops.push(buildMemory(rank, rollEliteTier()));
  }
  return drops;
}

// Guaranteed drop (Shadowbreaker true name).
export function rollGuaranteedMemoryDrop(rankBoost: boolean): Memory {
  const rank = rankBoost ? rollBoostedRank() : rollRank();
  return buildMemory(rank, rollTier());
}

// Rank-boosted roll: shifts weight toward Transcended/Supreme/Sacred.
function rollBoostedRank(): MemoryRank {
  const boosted: Record<MemoryRank, number> = {
    Awakened: 15, Ascended: 20, Transcended: 25, Supreme: 20, Sacred: 12, Divine: 8,
  };
  const total = Object.values(boosted).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const rank of MEMORY_RANKS) { if ((r -= boosted[rank]) <= 0) return rank; }
  return "Ascended";
}

// Returns the stored effect directly.
export function getMemoryEffect(memory: Memory): MemoryEffect {
  return (memory as { effect?: MemoryEffect }).effect ?? {};
}
