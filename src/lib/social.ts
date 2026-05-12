// Local "social" simulation — seeded NPC aspirants for leaderboards & cohorts.

import { RANKS, type Rank } from "./game";

const NAMES = [
  "Sunny", "Cassie", "Nephis", "Effie", "Cain", "Anna", "Brandon", "Jet",
  "Kai", "Lyra", "Vyrhal", "Marn", "Tessa", "Orin", "Pellis", "Quinn",
  "Reyna", "Sigrid", "Theron", "Ulric", "Vex", "Wren", "Xara", "Yuki",
  "Zane", "Mara", "Drask", "Ilya", "Kara", "Niven",
];

export type NPC = { name: string; shards: number; rank: Rank };

function seededRand(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) % 1000) / 1000;
  };
}

export function generateNPCs(seed: number, count: number): NPC[] {
  const rand = seededRand(seed);
  const used = new Set<string>();
  const out: NPC[] = [];
  while (out.length < count) {
    const name = NAMES[Math.floor(rand() * NAMES.length)];
    if (used.has(name)) continue;
    used.add(name);
    const shards = Math.floor(rand() * 18000);
    let filled = 0, remaining = shards;
    const costs = [1000, 2000, 3000, 4000, 5000, 6000, 7000];
    for (const c of costs) { if (remaining >= c) { filled++; remaining -= c; } else break; }
    out.push({ name, shards, rank: RANKS[Math.min(filled + 1, RANKS.length - 1)] });
  }
  return out.sort((a, b) => b.shards - a.shards);
}

// Deterministic seed from invite code
export function codeToSeed(code: string): number {
  let h = 0;
  for (let i = 0; i < code.length; i++) h = ((h << 5) - h + code.charCodeAt(i)) | 0;
  return Math.abs(h) || 1;
}

export function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
