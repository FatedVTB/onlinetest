import type { MemoryEffect } from "./game";

export type MemoryType = "Weapon" | "Armour" | "Charm" | "Tool";
export type MemoryRank = "Lesser" | "Common" | "Greater" | "Grand" | "Legendary";

export type Memory = {
  id: string;
  name: string;
  baseName?: string; // name without rank prefix, used for effect lookup; absent on pre-v2 saves
  type: MemoryType;
  rank: MemoryRank;
  attribute: string;
  flavor: string;
  acquiredAt: number;
};

const RANK_WEIGHTS: Record<MemoryRank, number> = {
  Lesser: 60, Common: 25, Greater: 10, Grand: 4, Legendary: 1,
};

type PoolEntry = { name: string; attribute: string; flavor: string; effect: MemoryEffect };

const POOL: Record<MemoryType, PoolEntry[]> = {
  Weapon: [
    { name: "Shadow Spear",    attribute: "+5% pressing shards",        flavor: "A blade forged from condensed dusk.",    effect: { pressPct: 5 } },
    { name: "Soulrend Blade",  attribute: "+8% pulling shards",         flavor: "It hums when shadows draw near.",        effect: { pullPct: 8 } },
    { name: "Ember Gauntlet",  attribute: "+10% arm day shards",        flavor: "Knuckles glow with banked fire.",        effect: { armPct: 10 } },
    { name: "Voidfang Dagger", attribute: "+1 shard per rep on PRs",    flavor: "Tastes the strongest first.",           effect: { prFlatPerRep: 1 } },
    { name: "Ironveil Hammer", attribute: "+12% leg day shards",        flavor: "The ground remembers each strike.",     effect: { legPct: 12 } },
  ],
  Armour: [
    { name: "Duskwoven Cloak",    attribute: "Lose 10% less on failed NM", flavor: "Stitched from the hush of nightfall.", effect: { nmLossReduction: 10 } },
    { name: "Plate of the Pillar",attribute: "+5% leg shards",             flavor: "Heavy as a vow.",                     effect: { legPct: 5 } },
    { name: "Wraith Vest",        attribute: "+5% core shards",            flavor: "Whispers when you breathe.",          effect: { corePct: 5 } },
    { name: "Bone Greaves",       attribute: "+1 shard per leg rep",        flavor: "Carved from a fallen Tyrant.",        effect: { legFlatPerRep: 1 } },
  ],
  Charm: [
    { name: "Spell Sigil",         attribute: "+3% all shards",              flavor: "A rune of the Nightmare Spell.",      effect: { allPct: 3 } },
    { name: "Heart of Ember",      attribute: "+15% shards on PRs",          flavor: "Beats louder when you push past.",   effect: { prPct: 15 } },
    { name: "Quiet Eye",           attribute: "+2 shards per shoulder rep",  flavor: "Sees the gap between heartbeats.",   effect: { shoulderFlatPerRep: 2 } },
    { name: "Coil of the Serpent", attribute: "+10% biceps shards",          flavor: "Tightens at the curl.",              effect: { bicepsPct: 10 } },
    { name: "Mark of Atlas",       attribute: "+10% shoulder shards",        flavor: "The sky has weight today.",          effect: { shoulderPct: 10 } },
  ],
  Tool: [
    { name: "Soul Lantern",    attribute: "Reveal next NM bonus",      flavor: "Draws moths of memory.",      effect: {} },
    { name: "Echo Stone",      attribute: "+5% all shards",            flavor: "Holds an echo of effort.",    effect: { allPct: 5 } },
    { name: "Rope of Binding", attribute: "Lose 8% less on failed NM", flavor: "Some things must hold.",      effect: { nmLossReduction: 8 } },
    { name: "Chronicle Quill", attribute: "+1 shard per logged set",   flavor: "Ink that never fades.",       effect: { flatPerSet: 1 } },
  ],
};

const RANK_PREFIX: Record<MemoryRank, string> = {
  Lesser: "Lesser", Common: "", Greater: "Greater", Grand: "Grand", Legendary: "Legendary",
};

export const RANK_COLOR: Record<MemoryRank, string> = {
  Lesser:    "text-muted-foreground",
  Common:    "text-foreground",
  Greater:   "text-accent",
  Grand:     "text-primary text-glow",
  Legendary: "text-ember text-glow-ember",
};

function rollRank(boost: boolean): MemoryRank {
  const ranks: MemoryRank[] = ["Lesser", "Common", "Greater", "Grand", "Legendary"];
  const weights = { ...RANK_WEIGHTS };
  if (boost) {
    // Shift one rank higher: move weight from Lesser→Common, Common→Greater, etc.
    weights.Lesser  = Math.max(5,  weights.Lesser  - 20);
    weights.Common  = Math.max(5,  weights.Common  - 10);
    weights.Greater += 15;
    weights.Grand   += 10;
    weights.Legendary += 5;
  }
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const rank of ranks) {
    if ((r -= weights[rank]) <= 0) return rank;
  }
  return "Lesser";
}

function buildMemory(type: MemoryType, entry: PoolEntry, rankBoost: boolean): Memory {
  const rank = rollRank(rankBoost);
  const prefix = RANK_PREFIX[rank];
  return {
    id: crypto.randomUUID(),
    type,
    rank,
    baseName: entry.name,
    name: prefix ? `${prefix} ${entry.name}` : entry.name,
    attribute: entry.attribute,
    flavor: entry.flavor,
    acquiredAt: Date.now(),
  };
}

// 15% chance to drop a memory on a PR set.
// Pass rankBoost=true when Ashen Herald true name is active.
export function rollPRMemoryDrop(rankBoost: boolean): Memory | null {
  if (Math.random() >= 0.15) return null;
  const types: MemoryType[] = ["Weapon", "Armour", "Charm", "Tool"];
  const type = types[Math.floor(Math.random() * types.length)];
  const list = POOL[type];
  const entry = list[Math.floor(Math.random() * list.length)];
  return buildMemory(type, entry, rankBoost);
}

// Guaranteed drop (e.g. Shadowbreaker true name).
export function rollGuaranteedMemoryDrop(rankBoost: boolean): Memory {
  const types: MemoryType[] = ["Weapon", "Armour", "Charm", "Tool"];
  const type = types[Math.floor(Math.random() * types.length)];
  const list = POOL[type];
  const entry = list[Math.floor(Math.random() * list.length)];
  return buildMemory(type, entry, rankBoost);
}

// Look up the structured effect for an equipped memory.
// Falls back gracefully for old saves that lack baseName.
export function getMemoryEffect(memory: Memory): MemoryEffect {
  const list = POOL[memory.type];
  const entry = list.find(p => p.name === memory.baseName)
             ?? list.find(p => memory.name === p.name || memory.name.endsWith(p.name));
  return entry?.effect ?? {};
}
