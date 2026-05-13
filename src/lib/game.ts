// Game logic + constants for the Shadow Slave Workout Game

export type MuscleGroup =
  | "Chest" | "Back" | "Shoulders" | "Biceps" | "Triceps" | "Legs" | "Core";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Core",
];

export const EXERCISES: Record<MuscleGroup, string[]> = {
  Chest:     ["Bench Press", "Incline Dumbbell Press", "Cable Fly", "Push Up", "Chest Press Machine"],
  Back:      ["Lat Pulldown", "Barbell Row", "Seated Cable Row", "Pull Up", "Deadlift"],
  Shoulders: ["Overhead Press", "Lateral Raise", "Cable Lateral", "Rear Delt Fly", "Arnold Press"],
  Biceps:    ["Barbell Curl", "Dumbbell Curl", "Cable Curl", "Hammer Curl", "Preacher Curl"],
  Triceps:   ["Tricep Pushdown", "Skullcrusher", "Overhead Extension", "Dips", "Cable Kickback"],
  Legs:      ["Squat", "Leg Press", "Romanian Deadlift", "Leg Extension", "Leg Curl"],
<<<<<<< HEAD
  Core:      ["Hanging Leg Raise", "Cable Crunch", "Plank", "Ab Wheel", "Russian Twist"],
};

export const BODYWEIGHT_EXERCISES = new Set<string>([
  "Push Up", "Pull Up", "Dips", "Plank",
  "Squat", "Hanging Leg Raise", "Ab Wheel", "Russian Twist",
]);

=======
  Core:      ["Hanging Leg Raise", "Cable Crunch", "Plank (kg)", "Ab Wheel", "Russian Twist"],
};

>>>>>>> 67891d0b27fe2be929d6ffbd7fd1850ebf28d11a
export type Rank =
  | "Sleeper" | "Dormant" | "Awakened" | "Ascended"
  | "Transcended" | "Supreme" | "Sacred" | "Divine";

export const RANKS: Rank[] = [
  "Sleeper", "Dormant", "Awakened", "Ascended",
  "Transcended", "Supreme", "Sacred", "Divine",
];

// Minimum workout visits to unlock nightmare N (1-based index).
// Index 0 unused; nightmare 1 (first) always available.
export const NIGHTMARE_UNLOCK_AT: number[] = [0, 0, 50, 150, 300, 500, 750, 1000];

export function computeRank(nightmaresPassed: number, workoutCount: number): Rank {
  if (nightmaresPassed === 0) return "Sleeper";
  if (nightmaresPassed === 1 && workoutCount < 10) return "Dormant";
  if (nightmaresPassed === 1) return "Awakened"; // auto after 10 visits
  const tiers: Rank[] = ["Ascended", "Transcended", "Supreme", "Sacred", "Divine"];
  return tiers[Math.min(nightmaresPassed - 2, tiers.length - 1)];
}

export type CoreTier = { name: string; cost: number; multiplier: number };

export const CORES: CoreTier[] = [
  { name: "Beast",   cost: 1000, multiplier: 1.00 },
  { name: "Monster", cost: 2000, multiplier: 1.15 },
  { name: "Demon",   cost: 3000, multiplier: 1.30 },
  { name: "Devil",   cost: 4000, multiplier: 1.45 },
  { name: "Tyrant",  cost: 5000, multiplier: 1.60 },
  { name: "Terror",  cost: 6000, multiplier: 1.75 },
  { name: "Titan",   cost: 7000, multiplier: 1.90 },
];
export const TITAN_MAX_MULT = 2.05;

export type SetLog = {
  exercise: string;
  muscle: MuscleGroup;
  weight: number;
  reps: number;
};

export type AspectRank =
  | "Awakened" | "Ascended" | "Transcended"
  | "Supreme" | "Sacred" | "Divine";

export const ASPECT_RANKS: AspectRank[] = [
  "Awakened", "Ascended", "Transcended", "Supreme", "Sacred", "Divine",
];

const ASPECT_RANK_WEIGHTS: Record<AspectRank, number> = {
  Awakened: 35, Ascended: 25, Transcended: 20, Supreme: 10, Sacred: 5, Divine: 5,
};

export const ASPECT_RANK_MULT: Record<AspectRank, number> = {
  Awakened: 1.0, Ascended: 1.5, Transcended: 2.0, Supreme: 2.75, Sacred: 3.5, Divine: 4.0,
};

export type Aspect = {
  name: string;
  description: string;
  rank: AspectRank;
  // These fields drive the actual bonus — added in v2, migrated from old saves
  exercise: string;
  bonusKind: "pct" | "perRep" | "special";
  bonusValue: number;
};

export type FlawEffect = {
  shardMuscles?: MuscleGroup[]; // which muscles have shards reduced
  shardPct?: number;            // negative percentage, e.g. -15
  nmExtraPct?: number;          // extra % of current shards lost on NM fail
  nmExtraFlat?: number;         // extra flat shards lost on NM fail
};

export type Flaw = { name: string; description: string; effect: FlawEffect };

export type MemoryEffect = {
  allPct?: number;
  pressPct?: number;           // Chest / Shoulders / Triceps
  pullPct?: number;            // Back / Biceps
  armPct?: number;             // Biceps / Triceps
  legPct?: number;
  corePct?: number;
  shoulderPct?: number;
  bicepsPct?: number;
  prPct?: number;
  prFlatPerRep?: number;
  legFlatPerRep?: number;
  shoulderFlatPerRep?: number;
  flatPerSet?: number;
  nmLossReduction?: number;    // % reduction of NM fail penalty
};

export type TrueNameEffect = {
  allPct?: number;
  prPct?: number;
  prFlatPerRep?: number;
  nmLossReduction?: number;
  stormcallerPct?: number;       // +X% on Back and Shoulders sets
  strongestMusclePct?: number;   // +X% on strongest muscle group
  nmThresholdReduction?: boolean; // lower threshold from 20% to 17%
  guaranteedMemory?: boolean;
  memoryRankBoost?: boolean;
};

export type TrueName = { name: string; description: string; effect: TrueNameEffect };

// Aggregated bonuses passed into calcShards and nightmare penalty calc
export type BonusCtx = {
  allPct: number;
  musclePct: Partial<Record<MuscleGroup, number>>;
  prPct: number;
  prFlatPerRep: number;
  legFlatPerRep: number;
  shoulderFlatPerRep: number;
  flatPerSet: number;
  nmLossReduction: number;
  nmExtraPct: number;
  nmExtraFlat: number;
  nmThreshold: number;
  guaranteedMemory: boolean;
  memoryRankBoost: boolean;
};

export const EMPTY_BONUS_CTX: BonusCtx = {
  allPct: 0, musclePct: {}, prPct: 0, prFlatPerRep: 0,
  legFlatPerRep: 0, shoulderFlatPerRep: 0, flatPerSet: 0,
  nmLossReduction: 0, nmExtraPct: 0, nmExtraFlat: 0,
  nmThreshold: 0.20, guaranteedMemory: false, memoryRankBoost: false,
};

const PRESS_MUSCLES: MuscleGroup[] = ["Chest", "Shoulders", "Triceps"];
const PULL_MUSCLES:  MuscleGroup[] = ["Back", "Biceps"];
const ARM_MUSCLES:   MuscleGroup[] = ["Biceps", "Triceps"];

export function computeBonuses(
  flaw: Flaw | null,
  trueName: TrueName | null,
  memoryEffects: MemoryEffect[],
  strongestMuscle: MuscleGroup | null,
): BonusCtx {
  const ctx: BonusCtx = { ...EMPTY_BONUS_CTX, musclePct: {} };

  if (flaw) {
    const e = flaw.effect;
    if (e.shardMuscles && e.shardPct !== undefined) {
      for (const m of e.shardMuscles) {
        ctx.musclePct[m] = (ctx.musclePct[m] ?? 0) + e.shardPct;
      }
    }
    if (e.nmExtraPct)  ctx.nmExtraPct  += e.nmExtraPct;
    if (e.nmExtraFlat) ctx.nmExtraFlat += e.nmExtraFlat;
  }

  if (trueName) {
    const e = trueName.effect;
    if (e.allPct)             ctx.allPct       += e.allPct;
    if (e.prPct)              ctx.prPct        += e.prPct;
    if (e.prFlatPerRep)       ctx.prFlatPerRep += e.prFlatPerRep;
    if (e.nmLossReduction)    ctx.nmLossReduction += e.nmLossReduction;
    if (e.stormcallerPct) {
      ctx.musclePct["Back"]      = (ctx.musclePct["Back"]      ?? 0) + e.stormcallerPct;
      ctx.musclePct["Shoulders"] = (ctx.musclePct["Shoulders"] ?? 0) + e.stormcallerPct;
    }
    if (e.strongestMusclePct && strongestMuscle) {
      ctx.musclePct[strongestMuscle] = (ctx.musclePct[strongestMuscle] ?? 0) + e.strongestMusclePct;
    }
    if (e.nmThresholdReduction) ctx.nmThreshold = 0.17;
    if (e.guaranteedMemory)     ctx.guaranteedMemory = true;
    if (e.memoryRankBoost)      ctx.memoryRankBoost  = true;
  }

  for (const me of memoryEffects) {
    if (me.allPct)          ctx.allPct            += me.allPct;
    if (me.prPct)           ctx.prPct             += me.prPct;
    if (me.prFlatPerRep)    ctx.prFlatPerRep       += me.prFlatPerRep;
    if (me.legFlatPerRep)   ctx.legFlatPerRep      += me.legFlatPerRep;
    if (me.shoulderFlatPerRep) ctx.shoulderFlatPerRep += me.shoulderFlatPerRep;
    if (me.flatPerSet)      ctx.flatPerSet         += me.flatPerSet;
    if (me.nmLossReduction) ctx.nmLossReduction    += me.nmLossReduction;
    if (me.pressPct) {
      for (const m of PRESS_MUSCLES) ctx.musclePct[m] = (ctx.musclePct[m] ?? 0) + me.pressPct;
    }
    if (me.pullPct) {
      for (const m of PULL_MUSCLES)  ctx.musclePct[m] = (ctx.musclePct[m] ?? 0) + me.pullPct;
    }
    if (me.armPct) {
      for (const m of ARM_MUSCLES)   ctx.musclePct[m] = (ctx.musclePct[m] ?? 0) + me.armPct;
    }
    if (me.legPct)      ctx.musclePct["Legs"]      = (ctx.musclePct["Legs"]      ?? 0) + me.legPct;
    if (me.corePct)     ctx.musclePct["Core"]      = (ctx.musclePct["Core"]      ?? 0) + me.corePct;
    if (me.shoulderPct) ctx.musclePct["Shoulders"] = (ctx.musclePct["Shoulders"] ?? 0) + me.shoulderPct;
    if (me.bicepsPct)   ctx.musclePct["Biceps"]    = (ctx.musclePct["Biceps"]    ?? 0) + me.bicepsPct;
  }

  return ctx;
}

type AspectTemplate = {
  name: string;
  kind: "pct" | "perRep" | "special";
  baseBonus: number;
  flavor: string;
};

export const EXERCISE_ASPECTS: Record<string, AspectTemplate> = {
  "Bench Press":            { name: "Mountainpress",       kind: "pct",    baseBonus: 10, flavor: "Pressing exercises deal more damage to Nightmare Creatures." },
  "Incline Dumbbell Press": { name: "Skybreaker",          kind: "pct",    baseBonus: 12, flavor: "Incline pressing channels the rising sun." },
  "Cable Fly":              { name: "Wingspan of Dusk",    kind: "pct",    baseBonus: 8,  flavor: "Fly motions sweep wide, gathering shards on chest day." },
  "Push Up":                { name: "Endless Tide",        kind: "perRep", baseBonus: 1,  flavor: "Bodyweight pressing on Push Ups." },
  "Chest Press Machine":    { name: "Forged Plate",        kind: "pct",    baseBonus: 9,  flavor: "Machine pressing, steady as iron." },
  "Lat Pulldown":           { name: "Wings Unfurled",      kind: "pct",    baseBonus: 10, flavor: "Pulldowns reveal hidden memories." },
  "Barbell Row":            { name: "Ironback",            kind: "pct",    baseBonus: 12, flavor: "Rowing forges an unbreakable spine." },
  "Seated Cable Row":       { name: "Steady Reaper",       kind: "pct",    baseBonus: 8,  flavor: "Cable rows never miss a beat." },
  "Pull Up":                { name: "Climber of the Veil", kind: "perRep", baseBonus: 2,  flavor: "Each Pull Up rep on the Veil." },
  "Deadlift":               { name: "Worldlifter",         kind: "pct",    baseBonus: 15, flavor: "Deadlifts bend the earth itself." },
  "Overhead Press":         { name: "Crown of Atlas",      kind: "pct",    baseBonus: 12, flavor: "Overhead pressing crowns the worthy." },
  "Lateral Raise":          { name: "Hawk Wings",          kind: "perRep", baseBonus: 2,  flavor: "Lateral raises spread hawk-wings." },
  "Cable Lateral":          { name: "Whisper of Wind",     kind: "pct",    baseBonus: 10, flavor: "Cable laterals carry whispered shards." },
  "Rear Delt Fly":          { name: "Eyes Behind",         kind: "pct",    baseBonus: 9,  flavor: "Rear delt work grants dodge instinct." },
  "Arnold Press":           { name: "Twin Suns",           kind: "pct",    baseBonus: 11, flavor: "Arnold press — two truths at once." },
  "Barbell Curl":           { name: "Serpent's Coil",      kind: "pct",    baseBonus: 10, flavor: "Barbell curls coil with serpent strength." },
  "Dumbbell Curl":          { name: "Twin Fang",           kind: "pct",    baseBonus: 9,  flavor: "Dumbbell curls strike with balanced fangs." },
  "Cable Curl":             { name: "Endless Bow",         kind: "perRep", baseBonus: 1,  flavor: "Cable curls drawn like an endless bow." },
  "Hammer Curl":            { name: "Hammerheart",         kind: "pct",    baseBonus: 10, flavor: "Hammer curls forge forearms of stone." },
  "Preacher Curl":          { name: "Confessor's Grip",    kind: "pct",    baseBonus: 12, flavor: "Preacher curls claim every honest rep." },
  "Tricep Pushdown":        { name: "Hammer of the Void",  kind: "pct",    baseBonus: 10, flavor: "Pushdowns hammer the void." },
  "Skullcrusher":           { name: "Skullsplitter",       kind: "pct",    baseBonus: 12, flavor: "Skullcrushers split nightmare bone." },
  "Overhead Extension":     { name: "Reach of Night",      kind: "pct",    baseBonus: 9,  flavor: "Overhead extensions extend your reach." },
  "Dips":                   { name: "Pillar Dipper",       kind: "perRep", baseBonus: 1,  flavor: "Each Dip rep between the pillars." },
  "Cable Kickback":         { name: "Mule Kick",           kind: "pct",    baseBonus: 8,  flavor: "Kickbacks crack with a mule's strike." },
  "Squat":                  { name: "Pillars of the World", kind: "pct",   baseBonus: 15, flavor: "Squats raise the pillars of the world." },
  "Leg Press":              { name: "Throneborn",          kind: "pct",    baseBonus: 12, flavor: "Leg press seats you upon the throne." },
  "Romanian Deadlift":      { name: "Hinge of Fate",       kind: "pct",    baseBonus: 12, flavor: "RDLs hinge fate at the hips." },
  "Leg Extension":          { name: "Spear Quad",          kind: "pct",    baseBonus: 9,  flavor: "Leg extensions sharpen quads to spears." },
  "Leg Curl":               { name: "Hamstring Hunter",    kind: "pct",    baseBonus: 10, flavor: "Leg curls hunt from ambush." },
  "Hanging Leg Raise":      { name: "Pendulum Will",       kind: "pct",    baseBonus: 10, flavor: "Hanging leg raises swing as pendulum will." },
  "Cable Crunch":           { name: "Iron Sanctum",        kind: "pct",    baseBonus: 12, flavor: "Cable crunches enshrine an iron sanctum." },
<<<<<<< HEAD
  "Plank":                  { name: "Stone Diaphragm",     kind: "special",baseBonus: 25, flavor: "Loaded planks reduce failed-Nightmare shard loss by {bonus}%." },
=======
  "Plank (kg)":             { name: "Stone Diaphragm",     kind: "special",baseBonus: 25, flavor: "Loaded planks reduce failed-Nightmare shard loss by {bonus}%." },
>>>>>>> 67891d0b27fe2be929d6ffbd7fd1850ebf28d11a
  "Ab Wheel":               { name: "Wheelturner",         kind: "pct",    baseBonus: 10, flavor: "Ab wheel turns the wheel of the world." },
  "Russian Twist":          { name: "Twin Edge",           kind: "pct",    baseBonus: 9,  flavor: "Russian twists cut on both sides." },
};

function buildAspectDescription(t: AspectTemplate, rank: AspectRank): string {
  const mult = ASPECT_RANK_MULT[rank];
  if (t.kind === "pct") {
    const pct = Math.round(t.baseBonus * mult);
    return `${t.flavor} +${pct}% shards.`;
  }
  if (t.kind === "perRep") {
    const n = +(t.baseBonus * mult).toFixed(1);
    return `${t.flavor} +${n} shard${n === 1 ? "" : "s"} per rep.`;
  }
  const bonus = Math.round(t.baseBonus * mult);
  return t.flavor.replace("{bonus}", String(bonus));
}

const FLAW_POOL: Record<MuscleGroup, Flaw[]> = {
  Chest: [
    { name: "Hollow Chest",   description: "Pressing exercises grant 15% fewer shards.", effect: { shardMuscles: ["Chest","Shoulders","Triceps"], shardPct: -15 } },
    { name: "Caved Sternum",  description: "Chest sets grant 15% fewer shards.",         effect: { shardMuscles: ["Chest"], shardPct: -15 } },
    { name: "Glass Pectoral", description: "Failed Nightmares cost 10% more shards.",    effect: { nmExtraPct: 10 } },
  ],
  Back: [
    { name: "Brittle Spine",  description: "Pulling exercises grant 15% fewer shards.", effect: { shardMuscles: ["Back","Biceps"], shardPct: -15 } },
    { name: "Crooked Lat",    description: "Back sets grant 15% fewer shards.",          effect: { shardMuscles: ["Back"], shardPct: -15 } },
    { name: "Slack Posture",  description: "Back day shards reduced by 20%.",            effect: { shardMuscles: ["Back"], shardPct: -20 } },
  ],
  Shoulders: [
    { name: "Trembling Limbs", description: "Shoulder exercises grant 15% fewer shards.", effect: { shardMuscles: ["Shoulders"], shardPct: -15 } },
    { name: "Broken Crown",    description: "Shoulder exercises grant 12% fewer shards.", effect: { shardMuscles: ["Shoulders"], shardPct: -12 } },
    { name: "Rusted Joint",    description: "Shoulder day shards reduced by 18%.",         effect: { shardMuscles: ["Shoulders"], shardPct: -18 } },
  ],
  Biceps: [
    { name: "Withered Curl",  description: "Biceps exercises grant 15% fewer shards.", effect: { shardMuscles: ["Biceps"], shardPct: -15 } },
    { name: "Hollow Arm",     description: "Bicep exercises grant 12% fewer shards.",  effect: { shardMuscles: ["Biceps"], shardPct: -12 } },
    { name: "Snapped Tendon", description: "Bicep day shards reduced by 20%.",          effect: { shardMuscles: ["Biceps"], shardPct: -20 } },
  ],
  Triceps: [
    { name: "Locked Triceps", description: "Triceps exercises grant 15% fewer shards.", effect: { shardMuscles: ["Triceps"], shardPct: -15 } },
    { name: "Soft Hammer",    description: "Tricep exercises grant 12% fewer shards.",  effect: { shardMuscles: ["Triceps"], shardPct: -12 } },
    { name: "Frayed Sinew",   description: "Tricep day shards reduced by 18%.",          effect: { shardMuscles: ["Triceps"], shardPct: -18 } },
  ],
  Legs: [
    { name: "Frail Foundation", description: "Leg exercises grant 15% fewer shards.", effect: { shardMuscles: ["Legs"], shardPct: -15 } },
    { name: "Hollow Knees",     description: "Leg exercises grant 12% fewer shards.", effect: { shardMuscles: ["Legs"], shardPct: -12 } },
    { name: "Reedstalk Calves", description: "Leg day shards reduced by 20%.",         effect: { shardMuscles: ["Legs"], shardPct: -20 } },
  ],
  Core: [
    { name: "Fractured Will", description: "Lose 25% more shards on failed Nightmares.",  effect: { nmExtraPct: 25 } },
    { name: "Soft Sanctum",   description: "Core sets grant 20% fewer shards.",            effect: { shardMuscles: ["Core"], shardPct: -20 } },
    { name: "Open Wound",     description: "Failed Nightmares cost an extra 100 shards.",  effect: { nmExtraFlat: 100 } },
  ],
};

export const TRUE_NAMES: TrueName[] = [
  { name: "Voidwalker",    description: "+10% shards on every expedition.",                      effect: { allPct: 10 } },
  { name: "Shadowbreaker", description: "+1 guaranteed Memory drop per expedition.",              effect: { guaranteedMemory: true } },
  { name: "Soulreaper",    description: "+15% shards on PR sets.",                               effect: { prPct: 15 } },
  { name: "Duskfang",      description: "Failed Nightmares cost 50% fewer shards.",              effect: { nmLossReduction: 50 } },
  { name: "Ironveil",      description: "+5% shards across all core tiers.",                      effect: { allPct: 5 } },
  { name: "Nightspear",    description: "+20% shards on your strongest muscle group.",            effect: { strongestMusclePct: 20 } },
  { name: "Worldender",    description: "+8% all shards and +1 shard per rep on PRs.",            effect: { allPct: 8, prFlatPerRep: 1 } },
  { name: "Ashen Herald",  description: "Memory drops roll one rank higher (capped at Legendary).", effect: { memoryRankBoost: true } },
  { name: "Stormcaller",   description: "+12% shards on shoulder and back sets.",                 effect: { stormcallerPct: 12 } },
  { name: "The Unbroken",  description: "Nightmare ascension threshold reduced to 17%.",          effect: { nmThresholdReduction: true } },
];

function rollAspectRank(): AspectRank {
  const r = Math.random() * 100;
  let acc = 0;
  for (const rank of ASPECT_RANKS) {
    acc += ASPECT_RANK_WEIGHTS[rank];
    if (r < acc) return rank;
  }
  return "Awakened";
}

const EXPECTED_VOLUME: Record<MuscleGroup, number> = {
  Chest: 500, Back: 600, Shoulders: 250, Biceps: 180, Triceps: 200, Legs: 900, Core: 400,
};

function ratio(set: SetLog) {
  return (set.weight * set.reps) / EXPECTED_VOLUME[set.muscle];
}

export function judgeFirstNightmare(sets: SetLog[], aspirantName?: string): {
  aspect: Aspect;
  flaw: Flaw;
  trueName?: TrueName;
} {
  const ranked = [...sets].sort((a, b) => ratio(b) - ratio(a));
  const best  = ranked[0];
  const worst = ranked[ranked.length - 1];

  const tpl = EXERCISE_ASPECTS[best.exercise]
    ?? { name: "Wandering Shadow", kind: "pct" as const, baseBonus: 10, flavor: "Your strongest lift channels wandering shadow." };
  const rank = rollAspectRank();
  const mult = ASPECT_RANK_MULT[rank];
  const bonusValue = tpl.kind === "pct"
    ? Math.round(tpl.baseBonus * mult)
    : +(tpl.baseBonus * mult).toFixed(1);

  const aspect: Aspect = {
    name: tpl.name,
    description: buildAspectDescription(tpl, rank),
    rank,
    exercise: best.exercise,
    bonusKind: tpl.kind as Aspect["bonusKind"],
    bonusValue: Number(bonusValue),
  };

  const flawOptions = FLAW_POOL[worst.muscle];
  const flaw = flawOptions[Math.floor(Math.random() * flawOptions.length)];

  // 15% true name chance on first nightmare
  const guaranteed = (aspirantName ?? "").trim().toLowerCase() === "dev";
  const trueName = (guaranteed || Math.random() < 0.15)
    ? TRUE_NAMES[Math.floor(Math.random() * TRUE_NAMES.length)]
    : undefined;

  return { aspect, flaw, trueName };
}

// Migrate old Aspect (no exercise/bonusKind fields) loaded from localStorage
export function migrateAspect(a: Aspect): Aspect {
  if (a.exercise && a.bonusKind) return a;
  const entry = Object.entries(EXERCISE_ASPECTS).find(([, t]) => t.name === a.name);
  if (!entry) return { ...a, exercise: "", bonusKind: "pct", bonusValue: 0 };
  const [exercise, t] = entry;
  const mult = ASPECT_RANK_MULT[a.rank] ?? 1;
  return {
    ...a,
    exercise,
    bonusKind: t.kind as Aspect["bonusKind"],
    bonusValue: t.kind === "pct"
      ? Math.round(t.baseBonus * mult)
      : +(t.baseBonus * mult).toFixed(1),
  };
}

// Migrate old Flaw (no effect field) loaded from localStorage
export function migrateFlaw(f: Flaw): Flaw {
  if (f.effect) return f;
  const found = Object.values(FLAW_POOL).flat().find(x => x.name === f.name);
  return found ?? { ...f, effect: {} };
}

// Migrate old TrueName (no effect field) loaded from localStorage
export function migrateTrueName(t: TrueName): TrueName {
  if (t.effect) return t;
  const found = TRUE_NAMES.find(x => x.name === t.name);
  return found ?? { ...t, effect: {} };
}

export function calcShards(
  set: SetLog,
  baseline: number,
  coreMultiplier: number,
  ctx: BonusCtx,
  aspect: Aspect | null,
  isPR: boolean,
): number {
  const tier = Math.max(0, Math.floor((set.weight - baseline) / 10));
  const perRep = 1 + tier;
  const base = set.reps * perRep * coreMultiplier;

  // All additive % bonuses
  let pctBonus = ctx.allPct + (ctx.musclePct[set.muscle] ?? 0);
  if (isPR) pctBonus += ctx.prPct;
  if (aspect?.bonusKind === "pct" && set.exercise === aspect.exercise) {
    pctBonus += aspect.bonusValue;
  }

  const afterPct = base * (1 + pctBonus / 100);

  // Flat per-rep bonuses
  let flatPerRep = 0;
  if (isPR) flatPerRep += ctx.prFlatPerRep;
  if (set.muscle === "Legs")      flatPerRep += ctx.legFlatPerRep;
  if (set.muscle === "Shoulders") flatPerRep += ctx.shoulderFlatPerRep;
  if (aspect?.bonusKind === "perRep" && set.exercise === aspect.exercise) {
    flatPerRep += aspect.bonusValue;
  }

  return Math.floor(afterPct + flatPerRep * set.reps + ctx.flatPerSet);
}

// Compute the NM fail penalty (shards to deduct) including flaw/trueName modifiers
export function calcNMPenalty(currentShards: number, ctx: BonusCtx): number {
  const rollPct = 15 + Math.random() * 30; // 15–45%
  let penalty = Math.floor(currentShards * rollPct / 100);
  penalty = Math.floor(penalty * (1 - Math.min(ctx.nmLossReduction, 95) / 100));
  penalty = Math.floor(penalty * (1 + ctx.nmExtraPct / 100));
  penalty += ctx.nmExtraFlat;
  return Math.max(0, penalty);
}

// Legacy helper — kept for leaderboard/soul rank display from core count
export function rankFromCores(filledCores: number): Rank {
  return RANKS[Math.min(filledCores, RANKS.length - 1)];
}

export function currentCoreInfo(totalShards: number) {
  let remaining = totalShards;
  for (let i = 0; i < CORES.length; i++) {
    if (remaining < CORES[i].cost) {
      return { index: i, name: CORES[i].name, filled: remaining, cost: CORES[i].cost, completed: i };
    }
    remaining -= CORES[i].cost;
  }
  return { index: CORES.length - 1, name: "Titan (Max)", filled: 7000 + remaining, cost: 7000, completed: CORES.length };
}

export function currentMultiplier(totalShards: number): number {
  let remaining = totalShards;
  let mult = CORES[0].multiplier;
  for (let i = 0; i < CORES.length; i++) {
    if (remaining >= CORES[i].cost) {
      mult = i + 1 < CORES.length ? CORES[i + 1].multiplier : TITAN_MAX_MULT;
      remaining -= CORES[i].cost;
    } else break;
  }
  return mult;
}

// Returns the muscle group with the highest total volume in saved baselines
export function strongestMuscleFromBaselines(
  baselines: Record<string, number>,
  firstNightmareSets: SetLog[] | null,
): MuscleGroup | null {
  if (!firstNightmareSets) return null;
  const byMuscle: Partial<Record<MuscleGroup, number>> = {};
  for (const s of firstNightmareSets) {
    const vol = (baselines[s.exercise] ?? s.weight) * s.reps;
    byMuscle[s.muscle] = (byMuscle[s.muscle] ?? 0) + vol;
  }
  let best: MuscleGroup | null = null, bestVol = -1;
  for (const [m, v] of Object.entries(byMuscle) as [MuscleGroup, number][]) {
    if (v > bestVol) { best = m; bestVol = v; }
  }
  return best;
}
