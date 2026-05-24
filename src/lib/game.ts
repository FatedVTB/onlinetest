// Game logic + constants for the Shadow Slave Workout Game

export type MuscleGroup =
  | "Chest" | "Back" | "Shoulders" | "Biceps" | "Triceps" | "Legs" | "Core" | "Forearms";

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps", "Legs", "Core", "Forearms",
];

export const EXERCISES: Record<MuscleGroup, string[]> = {
  Chest: [
    "Bench Press", "Incline Bench Press", "Decline Bench Press",
    "Dumbbell Bench Press", "Incline Dumbbell Press",
    "Cable Fly", "Dumbbell Fly", "Low Cable Fly", "Pec Deck",
    "Push Up", "Chest Press Machine",
    "Smith Machine Bench Press", "Landmine Press", "Svend Press", "Dumbbell Pullover",
  ],
  Back: [
    "Lat Pulldown", "Barbell Row", "Seated Cable Row", "Pull Up", "Deadlift",
    "Single Arm Dumbbell Row", "Single Arm Cable Row",
    "T-Bar Row", "Chest Supported Row", "Cable Pullover",
    "Face Pull", "Rack Pull",
    "Straight Arm Pulldown", "Pendlay Row", "Inverted Row", "Meadows Row", "Machine Row",
  ],
  Shoulders: [
    "Overhead Press", "Dumbbell Overhead Press",
    "Single Arm Overhead Press",
    "Lateral Raise", "Single Arm Lateral Raise", "Single Arm Cable Lateral",
    "Cable Lateral", "Rear Delt Fly", "Arnold Press",
    "Machine Shoulder Press", "Upright Row",
    "Cable Front Raise", "Dumbbell Front Raise", "Seated Bent Over Lateral Raise",
    "Machine Lateral Raise", "Leaning Lateral Raise",
  ],
  Biceps: [
    "Barbell Curl", "EZ Bar Curl",
    "Dumbbell Curl", "Single Arm Dumbbell Curl",
    "Cable Curl", "Single Arm Cable Curl",
    "Hammer Curl", "Preacher Curl",
    "Incline Dumbbell Curl", "Concentration Curl",
    "Preacher Hammer Curl", "Cross Body Hammer Curl",
    "Zottman Curl", "Spider Curl", "Drag Curl",
  ],
  Triceps: [
    "Tricep Pushdown", "Rope Pushdown", "Single Arm Pushdown",
    "Skullcrusher", "Close Grip Bench Press",
    "Overhead Extension", "Single Arm Overhead Extension",
    "Dips", "Cable Kickback",
    "Diamond Push Up", "JM Press", "Tate Press", "Machine Tricep Press",
  ],
  Legs: [
    "Squat", "Hack Squat", "Goblet Squat",
    "Leg Press", "Single Leg Press",
    "Romanian Deadlift", "Single Leg Romanian Deadlift",
    "Leg Extension", "Leg Curl", "Single Leg Curl",
    "Bulgarian Split Squat", "Lunges",
    "Hip Thrust", "Calf Raise",
    "Sumo Deadlift", "Box Squat", "Step Up",
    "Glute Kickback", "Adductor Machine", "Abductor Machine",
    "Seated Calf Raise", "Reverse Lunge",
  ],
  Core: [
    "Hanging Leg Raise", "Cable Crunch", "Plank",
    "Ab Wheel", "Russian Twist",
    "Decline Sit Up", "Dragon Flag",
    "Pallof Press", "Dead Bug", "Hollow Body Hold",
    "Bicycle Crunch", "Toes to Bar", "L-Sit",
    "Side Plank", "Hanging Knee Raise", "Suitcase Carry", "Windmill",
  ],
  Forearms: [
    "Barbell Wrist Curl", "Dumbbell Wrist Curl", "Single Arm Wrist Curl",
    "Cable Wrist Curl", "Behind the Back Wrist Curl",
    "Barbell Reverse Wrist Curl", "Dumbbell Reverse Wrist Curl", "Single Arm Reverse Wrist Curl",
    "Reverse Curl", "Single Arm Reverse Curl",
    "Wrist Roller", "Plate Pinch", "Dead Hang", "Farmers Walk",
  ],
};

// Exercises that work one limb at a time — weight is halved for scoring
// (bilateral equivalent = weight × 2)
export const UNILATERAL_EXERCISES = new Set<string>([
  // Back
  "Single Arm Dumbbell Row", "Single Arm Cable Row", "Meadows Row",
  // Shoulders
  "Single Arm Overhead Press", "Single Arm Lateral Raise", "Single Arm Cable Lateral",
  "Leaning Lateral Raise",
  // Biceps
  "Single Arm Dumbbell Curl", "Single Arm Cable Curl", "Concentration Curl",
  "Preacher Hammer Curl", "Cross Body Hammer Curl",
  // Triceps
  "Single Arm Pushdown", "Single Arm Overhead Extension",
  // Legs
  "Single Leg Press", "Single Leg Romanian Deadlift", "Single Leg Curl",
  "Bulgarian Split Squat", "Lunges", "Step Up", "Glute Kickback", "Reverse Lunge",
  // Core
  "Suitcase Carry", "Windmill",
  // Forearms
  "Single Arm Wrist Curl", "Single Arm Reverse Wrist Curl", "Single Arm Reverse Curl",
]);

export const BODYWEIGHT_EXERCISES = new Set<string>([
  // Chest
  "Push Up",
  // Back
  "Pull Up", "Inverted Row",
  // Triceps
  "Dips", "Diamond Push Up",
  // Legs
  "Squat", "Bulgarian Split Squat", "Lunges", "Step Up", "Reverse Lunge",
  // Core
  "Plank", "Hanging Leg Raise", "Ab Wheel", "Russian Twist",
  "Dragon Flag", "Dead Bug", "Hollow Body Hold", "Decline Sit Up",
  "Bicycle Crunch", "Toes to Bar", "L-Sit", "Side Plank", "Hanging Knee Raise",
  // Forearms
  "Dead Hang",
]);

// How many kg above baseline = 1 shard tier, scaled to each muscle's natural strength range.
// Unilateral exercises use half this value automatically.
export const MUSCLE_KG_PER_TIER: Record<MuscleGroup, number> = {
  Chest:     10,
  Back:      15,
  Shoulders:  8,
  Biceps:     5,
  Triceps:    6,
  Legs:      20,
  Core:       5,
  Forearms:   3,
};

export type Rank =
  | "Sleeper" | "Dormant" | "Awakened" | "Ascended"
  | "Transcended" | "Supreme" | "Sacred" | "Divine";

export const RANKS: Rank[] = [
  "Sleeper", "Dormant", "Awakened", "Ascended",
  "Transcended", "Supreme", "Sacred", "Divine",
];

// Minimum workout visits to unlock nightmare N (1-based index).
// Index 0 unused; nightmare 1 (first) always available.
export const NIGHTMARE_UNLOCK_AT: number[] = [0, 0, 25, 75, 150, 250, 475];

export function computeRank(nightmaresPassed: number, workoutCount: number): Rank {
  if (nightmaresPassed === 0) return "Sleeper";
  if (nightmaresPassed === 1 && workoutCount < 5) return "Dormant";
  if (nightmaresPassed === 1) return "Awakened"; // auto after 5 visits
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

export type AspectAbilityKind =
  | "exercisePct" | "exercisePerRep"
  | "musclePct" | "relatedMusclePct"
  | "allPct" | "prPct" | "flatPerSet" | "nmLossReduction";

export type AspectAbility = { kind: AspectAbilityKind; value: number; description: string };

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
  exercise: string;
  bonusKind: "pct" | "perRep" | "special"; // legacy — kept for migration
  bonusValue: number;                        // legacy — kept for migration
  muscle?: MuscleGroup;
  abilities: AspectAbility[];               // [0] = primary (NM1), [1+] unlocked per NM
};

// Derive exercise → muscle lookup from EXERCISES at runtime
export const EXERCISE_MUSCLE: Record<string, MuscleGroup> = Object.fromEntries(
  MUSCLE_GROUPS.flatMap(m => EXERCISES[m].map(ex => [ex, m] as [string, MuscleGroup]))
);

// Which muscle groups are "related" for aspect secondary bonus expansion
const MUSCLE_RELATED: Record<MuscleGroup, MuscleGroup[]> = {
  Chest:     ["Shoulders", "Triceps"],
  Back:      ["Biceps"],
  Shoulders: ["Chest", "Triceps"],
  Biceps:    ["Back", "Forearms"],
  Triceps:   ["Chest", "Shoulders"],
  Legs:      [],
  Core:      [],
  Forearms:  ["Biceps"],
};

const MUSCLE_CATEGORY_LABEL: Record<MuscleGroup, string> = {
  Chest: "pressing", Back: "pulling", Shoulders: "shoulder",
  Biceps: "biceps", Triceps: "triceps", Legs: "leg", Core: "core", Forearms: "forearm",
};

type SecondaryTier = { samePct: number; relatedPct: number; allPct: number };

const ASPECT_SECONDARY: Record<AspectRank, SecondaryTier> = {
  Awakened:    { samePct: 0,  relatedPct: 0,  allPct: 0 },
  Ascended:    { samePct: 5,  relatedPct: 0,  allPct: 0 },
  Transcended: { samePct: 8,  relatedPct: 3,  allPct: 0 },
  Supreme:     { samePct: 12, relatedPct: 5,  allPct: 0 },
  Sacred:      { samePct: 15, relatedPct: 8,  allPct: 0 },
  Divine:      { samePct: 20, relatedPct: 12, allPct: 2 },
};

// Abilities unlocked after each nightmare (index 0 = NM2, index 1 = NM3, etc.)
export const ABILITY_PROGRESSION: { kind: AspectAbilityKind; baseValue: number }[] = [
  { kind: "musclePct",        baseValue: 5 }, // NM2 — same muscle group
  { kind: "relatedMusclePct", baseValue: 3 }, // NM3 — related muscles (or allPct if none)
  { kind: "prPct",            baseValue: 8 }, // NM4 — PR sets
  { kind: "allPct",           baseValue: 3 }, // NM5 — all exercises
  { kind: "flatPerSet",       baseValue: 5 }, // NM6 — flat per set (same muscle) · Divine rank
];

// Boost applied to each existing ability when a new one is unlocked
const PCT_ABILITY_BOOST  = 2; // % added to percentage-based abilities
const FLAT_ABILITY_BOOST = 1; // flat added to per-rep / flat-per-set abilities

export function describeAbility(ab: AspectAbility, exercise: string, muscle?: MuscleGroup): string {
  const v = ab.value;
  switch (ab.kind) {
    case "exercisePct":    return `+${v}% shards on ${exercise}.`;
    case "exercisePerRep": return `+${v} shard${v === 1 ? "" : "s"} per rep on ${exercise}.`;
    case "musclePct":      return `+${v}% shards on all ${muscle ?? "muscle"} exercises.`;
    case "relatedMusclePct": {
      const rel = muscle ? MUSCLE_RELATED[muscle] : [];
      return `+${v}% shards on ${rel.length ? rel.join(" & ") : "related"} exercises.`;
    }
    case "allPct":          return `+${v}% shards on all exercises.`;
    case "prPct":           return `+${v}% extra shards on any PR set.`;
    case "flatPerSet":      return `+${v} shards per ${muscle ? muscle.toLowerCase() + " " : ""}set.`;
    case "nmLossReduction": return `Nightmare failures cost ${v}% fewer shards.`;
  }
}

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
  chestPct?: number;           // Chest only
  backPct?: number;            // Back only
  tricepsPct?: number;         // Triceps only
  prPct?: number;
  prFlatPerRep?: number;
  legFlatPerRep?: number;
  shoulderFlatPerRep?: number;
  flatPerSet?: number;
  nmLossReduction?: number;      // % reduction of NM fail penalty
  memoryDropChancePct?: number;  // +X% flat added to every memory drop channel (min 10, max 60 per source)
  memoryDoubleChance?: boolean;  // doubles all memory drop channels (PR, shard, nightmare)
  bonusWeightMuscle?: MuscleGroup; // muscle group that receives virtual kg bonus
  bonusWeightKg?: number;          // kg added to effective weight for that muscle in calcShards
};

export type TrueNameEffect = {
  allPct?: number;
  prPct?: number;
  prFlatPerRep?: number;
  nmLossReduction?: number;
  stormcallerPct?: number;       // +X% on Back and Shoulders sets
  strongestMusclePct?: number;   // +X% on strongest muscle group
  nmThresholdReduction?: boolean; // legacy — lower threshold to 17%
  nmThresholdValue?: number;      // explicit threshold override (e.g. 0.14)
  memoryDoubleChance?: boolean;  // doubles all memory drop channels (PR, shard, nightmare)
  memoryRankBoost?: boolean;
  pusherPct?: number;            // +X% on Chest / Shoulders / Triceps
  pullerPct?: number;            // +X% on Back / Biceps
  armPct?: number;               // +X% on Biceps / Triceps
  legPct?: number;               // +X% on Legs
  corePct?: number;              // +X% on Core
  flatPerSet?: number;           // +X flat shards on every set
  memoryDropChancePct?: number;  // +X% flat added to every memory drop channel (PR, Shard, Nightmare)
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
  memoryDoubleCount: number;    // number of equipped doubling sources (first doubles, each extra adds +10%)
  memoryRankBoost: boolean;
  memoryDropChancePct: number;  // total flat bonus added to every channel's base chance
  bonusWeightByMuscle: Partial<Record<MuscleGroup, number>>;
};

export const EMPTY_BONUS_CTX: BonusCtx = {
  allPct: 0, musclePct: {}, prPct: 0, prFlatPerRep: 0,
  legFlatPerRep: 0, shoulderFlatPerRep: 0, flatPerSet: 0,
  nmLossReduction: 0, nmExtraPct: 0, nmExtraFlat: 0,
  nmThreshold: 0.20, memoryDoubleCount: 0, memoryRankBoost: false,
  memoryDropChancePct: 0, bonusWeightByMuscle: {},
};

const PRESS_MUSCLES: MuscleGroup[] = ["Chest", "Shoulders", "Triceps"];
const PULL_MUSCLES:  MuscleGroup[] = ["Back", "Biceps"];
const ARM_MUSCLES:   MuscleGroup[] = ["Biceps", "Triceps", "Forearms"];

export function computeBonuses(
  flaw: Flaw | null,
  trueName: TrueName | null,
  memoryEffects: MemoryEffect[],
  strongestMuscle: MuscleGroup | null,
): BonusCtx {
  const ctx: BonusCtx = { ...EMPTY_BONUS_CTX, musclePct: {}, bonusWeightByMuscle: {} };

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
    if (e.nmThresholdValue !== undefined) ctx.nmThreshold = e.nmThresholdValue;
    else if (e.nmThresholdReduction) ctx.nmThreshold = 0.17;
    if (e.memoryDoubleChance)   ctx.memoryDoubleCount++;
    if (e.memoryRankBoost)      ctx.memoryRankBoost  = true;
    if (e.pusherPct) {
      ctx.musclePct["Chest"]     = (ctx.musclePct["Chest"]     ?? 0) + e.pusherPct;
      ctx.musclePct["Shoulders"] = (ctx.musclePct["Shoulders"] ?? 0) + e.pusherPct;
      ctx.musclePct["Triceps"]   = (ctx.musclePct["Triceps"]   ?? 0) + e.pusherPct;
    }
    if (e.pullerPct) {
      ctx.musclePct["Back"]   = (ctx.musclePct["Back"]   ?? 0) + e.pullerPct;
      ctx.musclePct["Biceps"] = (ctx.musclePct["Biceps"] ?? 0) + e.pullerPct;
    }
    if (e.armPct) {
      ctx.musclePct["Biceps"]  = (ctx.musclePct["Biceps"]  ?? 0) + e.armPct;
      ctx.musclePct["Triceps"] = (ctx.musclePct["Triceps"] ?? 0) + e.armPct;
    }
    if (e.legPct)  ctx.musclePct["Legs"] = (ctx.musclePct["Legs"] ?? 0) + e.legPct;
    if (e.corePct) ctx.musclePct["Core"] = (ctx.musclePct["Core"] ?? 0) + e.corePct;
    if (e.flatPerSet)          ctx.flatPerSet          += e.flatPerSet;
    if (e.memoryDropChancePct) ctx.memoryDropChancePct += e.memoryDropChancePct;
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
    if (me.chestPct)    ctx.musclePct["Chest"]     = (ctx.musclePct["Chest"]     ?? 0) + me.chestPct;
    if (me.backPct)     ctx.musclePct["Back"]      = (ctx.musclePct["Back"]      ?? 0) + me.backPct;
    if (me.tricepsPct)  ctx.musclePct["Triceps"]   = (ctx.musclePct["Triceps"]   ?? 0) + me.tricepsPct;
    if (me.memoryDropChancePct) ctx.memoryDropChancePct += me.memoryDropChancePct;
    if (me.memoryDoubleChance)  ctx.memoryDoubleCount++;
    if (me.bonusWeightMuscle && me.bonusWeightKg) {
      ctx.bonusWeightByMuscle[me.bonusWeightMuscle] =
        (ctx.bonusWeightByMuscle[me.bonusWeightMuscle] ?? 0) + me.bonusWeightKg;
    }
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
  "Plank":                  { name: "Stone Diaphragm",     kind: "special",baseBonus: 25, flavor: "Loaded planks reduce failed-Nightmare shard loss by {bonus}%." },
  "Ab Wheel":               { name: "Wheelturner",         kind: "pct",    baseBonus: 10, flavor: "Ab wheel turns the wheel of the world." },
  "Russian Twist":          { name: "Twin Edge",           kind: "pct",    baseBonus: 9,  flavor: "Russian twists cut on both sides." },

  // ── Chest (additional) ────────────────────────────────────────────────────
  "Incline Bench Press":    { name: "Skyforge",            kind: "pct",    baseBonus: 12, flavor: "Incline pressing forges weapons against the sky." },
  "Decline Bench Press":    { name: "Grave Shelf",         kind: "pct",    baseBonus: 11, flavor: "Decline pressing lays nightmares to rest." },
  "Dumbbell Bench Press":   { name: "Twin Ember",          kind: "pct",    baseBonus: 10, flavor: "Two dumbbells burn with twin ember fire." },
  "Dumbbell Fly":           { name: "Phantom Wings",       kind: "pct",    baseBonus: 9,  flavor: "Fly motions unfurl wings of shadow." },
  "Low Cable Fly":          { name: "Rising Current",      kind: "pct",    baseBonus: 8,  flavor: "Low cables gather current from below." },
  "Pec Deck":               { name: "Iron Butterfly",      kind: "pct",    baseBonus: 9,  flavor: "Machine fly crushes nightmares between iron wings." },

  // ── Back (additional) ─────────────────────────────────────────────────────
  "Single Arm Dumbbell Row":{ name: "Lone Predator",       kind: "pct",    baseBonus: 11, flavor: "One arm hunting is twice as focused." },
  "Single Arm Cable Row":   { name: "Tether Pull",         kind: "pct",    baseBonus: 9,  flavor: "A single cable tethers the nightmare." },
  "T-Bar Row":              { name: "Anchor Hold",         kind: "pct",    baseBonus: 12, flavor: "The T-bar anchors the body to the earth." },
  "Chest Supported Row":    { name: "Braced Hunter",       kind: "pct",    baseBonus: 10, flavor: "Supported and stable — the hunter never misses." },
  "Cable Pullover":         { name: "Shadow Sweep",        kind: "pct",    baseBonus: 9,  flavor: "Pullovers sweep shadow across the chest." },
  "Face Pull":              { name: "Rear Sentinel",       kind: "pct",    baseBonus: 9,  flavor: "Face pulls guard what the eyes cannot see." },
  "Rack Pull":              { name: "Half Blood",          kind: "pct",    baseBonus: 13, flavor: "Rack pulls bleed power from the top half of the lift." },

  // ── Shoulders (additional) ────────────────────────────────────────────────
  "Dumbbell Overhead Press":  { name: "Twin Summit",       kind: "pct",    baseBonus: 11, flavor: "Two heads pressed skyward claim the twin summit." },
  "Single Arm Overhead Press":{ name: "One-Handed Sky",    kind: "pct",    baseBonus: 10, flavor: "A single arm holds the sky in place." },
  "Single Arm Lateral Raise": { name: "Crooked Horizon",   kind: "perRep", baseBonus: 2,  flavor: "The horizon tilts for those who reach past it." },
  "Single Arm Cable Lateral": { name: "Wire Walker",       kind: "pct",    baseBonus: 10, flavor: "Walking the wire with a single cable taut." },
  "Upright Row":              { name: "Chains to Heaven",  kind: "pct",    baseBonus: 10, flavor: "The bar rises like chains cast upward." },
  "Machine Shoulder Press":   { name: "Steel Throne",      kind: "pct",    baseBonus: 9,  flavor: "Iron guides iron — the machine throne never wavers." },

  // ── Biceps (additional) ───────────────────────────────────────────────────
  "EZ Bar Curl":              { name: "Bent Serpent",       kind: "pct",    baseBonus: 10, flavor: "The curved bar coils like a serpent mid-strike." },
  "Single Arm Dumbbell Curl": { name: "Solitary Fang",      kind: "pct",    baseBonus: 10, flavor: "One arm, one fang — precise and lethal." },
  "Single Arm Cable Curl":    { name: "Lone Arc",           kind: "perRep", baseBonus: 1,  flavor: "A single cable arcs through the nightmare's hide." },
  "Incline Dumbbell Curl":    { name: "Stretched Coil",     kind: "pct",    baseBonus: 11, flavor: "Full stretch unlocks the coiled serpent's power." },
  "Concentration Curl":       { name: "Singular Focus",     kind: "pct",    baseBonus: 12, flavor: "One arm, one thought — total annihilation." },

  // ── Triceps (additional) ──────────────────────────────────────────────────
  "Rope Pushdown":             { name: "Split Lightning",   kind: "perRep", baseBonus: 1,  flavor: "The rope splits and strikes twice." },
  "Single Arm Pushdown":       { name: "Solo Hammer",       kind: "pct",    baseBonus: 9,  flavor: "One arm swings the hammer harder." },
  "Close Grip Bench Press":    { name: "Narrow Throne",     kind: "pct",    baseBonus: 11, flavor: "Narrow grip, concentrated power." },
  "Single Arm Overhead Extension": { name: "Reaching Void",kind: "pct",    baseBonus: 9,  flavor: "One arm stretches into the void above." },

  // ── Legs (additional) ─────────────────────────────────────────────────────
  "Hack Squat":               { name: "Iron Throne",        kind: "pct",    baseBonus: 13, flavor: "The hack squat seats you upon a throne of iron." },
  "Goblet Squat":             { name: "Chalice Breaker",    kind: "pct",    baseBonus: 11, flavor: "The chalice is raised before it shatters." },
  "Single Leg Press":         { name: "Lone Foundation",    kind: "pct",    baseBonus: 12, flavor: "One leg carries what two could not." },
  "Single Leg Romanian Deadlift": { name: "Broken Hinge",  kind: "pct",    baseBonus: 11, flavor: "Balance is found at the breaking point." },
  "Single Leg Curl":          { name: "Half Moon",          kind: "pct",    baseBonus: 10, flavor: "The curl of a single leg carves a crescent." },
  "Bulgarian Split Squat":    { name: "Rift Strider",       kind: "perRep", baseBonus: 2,  flavor: "Each step across the rift claims another shard." },
  "Lunges":                   { name: "Road of Blades",     kind: "perRep", baseBonus: 1,  flavor: "Every lunge step falls upon blades." },
  "Hip Thrust":               { name: "Earthshaker",        kind: "pct",    baseBonus: 12, flavor: "Hip thrusts shake the earth from below." },
  "Calf Raise":               { name: "Light Step",         kind: "perRep", baseBonus: 1,  flavor: "Light steps carry far — calves remember every journey." },

  // ── Core (additional) ─────────────────────────────────────────────────────
  "Decline Sit Up":           { name: "Gravity's Chosen",   kind: "pct",    baseBonus: 10, flavor: "Fighting gravity is its own reward." },
  "Pallof Press":             { name: "Axis of Will",        kind: "pct",    baseBonus: 9,  flavor: "The Pallof press resists the world's rotation." },
  "Dead Bug":                 { name: "Stirring Corpse",     kind: "pct",    baseBonus: 8,  flavor: "Even the dead stir when the core demands it." },
  "Hollow Body Hold":         { name: "The Hollow",          kind: "pct",    baseBonus: 9,  flavor: "Emptiness held in tension is still a weapon." },
  "Bicycle Crunch":           { name: "Pedal Through Shadow",kind: "perRep", baseBonus: 1,  flavor: "Each pedal drives through the darkness." },
  "Toes to Bar":              { name: "Ascending Spine",     kind: "pct",    baseBonus: 11, flavor: "Rising to the bar demands total will." },
  "L-Sit":                    { name: "Suspended Will",      kind: "special",baseBonus: 20, flavor: "Held in suspension, the core becomes iron. Failed-Nightmare shard loss reduced by {bonus}%." },
  "Side Plank":               { name: "Lateral Fortress",   kind: "pct",    baseBonus: 9,  flavor: "The fortress that holds from the side." },
  "Hanging Knee Raise":       { name: "Coiled Ascent",       kind: "pct",    baseBonus: 9,  flavor: "Knees drawn to the chest, power drawn inward." },
  "Suitcase Carry":           { name: "Loaded Pilgrim",      kind: "pct",    baseBonus: 10, flavor: "One side carries the weight of the journey." },
  "Windmill":                 { name: "Turning World",       kind: "pct",    baseBonus: 11, flavor: "The world turns — those who bend with it gather its shards." },

  // ── Chest (additional) ────────────────────────────────────────────────────
  "Smith Machine Bench Press":{ name: "Smith Sentinel",      kind: "pct",    baseBonus: 10, flavor: "The guided path is still a path to power." },
  "Landmine Press":           { name: "Barrel of the Earth", kind: "pct",    baseBonus: 11, flavor: "The angled press splits the earth itself." },
  "Svend Press":              { name: "Plate Whisper",       kind: "perRep", baseBonus: 1,  flavor: "Compressed iron carries a quiet fury." },
  "Dumbbell Pullover":        { name: "Shadow Expand",       kind: "pct",    baseBonus: 9,  flavor: "The pullover bridges chest and back." },

  // ── Back (additional) ─────────────────────────────────────────────────────
  "Straight Arm Pulldown":    { name: "Wingspan Lock",       kind: "pct",    baseBonus: 9,  flavor: "Straight arms slam the dream door shut." },
  "Pendlay Row":              { name: "Dead Stop Reaper",    kind: "pct",    baseBonus: 13, flavor: "Dead stop rowing strikes from absolute stillness." },
  "Inverted Row":             { name: "Hollow Pull",         kind: "perRep", baseBonus: 2,  flavor: "Bodyweight peeled upward from the void." },
  "Meadows Row":              { name: "Shadow Anchor",       kind: "pct",    baseBonus: 11, flavor: "One arm tethered to the ground." },
  "Machine Row":              { name: "Iron Current",        kind: "pct",    baseBonus: 9,  flavor: "Guided steel flows like an iron current." },

  // ── Shoulders (additional) ────────────────────────────────────────────────
  "Cable Front Raise":             { name: "Dawn Spear",           kind: "pct",    baseBonus: 9,  flavor: "The front raise pierces the dawn." },
  "Dumbbell Front Raise":          { name: "Twin Dawn",            kind: "pct",    baseBonus: 9,  flavor: "Two weights rise toward the breaking light." },
  "Seated Bent Over Lateral Raise":{ name: "Cowl of Shadows",      kind: "pct",    baseBonus: 10, flavor: "Bent over, the rear delts carry the night." },
  "Machine Lateral Raise":         { name: "Guided Storm",         kind: "pct",    baseBonus: 9,  flavor: "The machine keeps the storm precise." },
  "Leaning Lateral Raise":         { name: "Tilted Horizon",       kind: "pct",    baseBonus: 11, flavor: "Leaning gives the arm a longer path to power." },

  // ── Biceps (additional) ───────────────────────────────────────────────────
  "Preacher Hammer Curl":     { name: "Confessor's Hammer",  kind: "pct",    baseBonus: 12, flavor: "A single arm pressed firm — every rep honest." },
  "Cross Body Hammer Curl":   { name: "Cross Fang",          kind: "pct",    baseBonus: 10, flavor: "Striking across the body finds a hidden angle." },
  "Zottman Curl":             { name: "Turning Fang",        kind: "pct",    baseBonus: 10, flavor: "The rotation unleashes both heads of the serpent." },
  "Spider Curl":              { name: "Eight Eyes",          kind: "pct",    baseBonus: 11, flavor: "Hanging the arm reveals a spider's precision." },
  "Drag Curl":                { name: "Dragging Chain",      kind: "pct",    baseBonus: 10, flavor: "Dragging the bar channels deeper strength." },

  // ── Triceps (additional) ──────────────────────────────────────────────────
  "Diamond Push Up":          { name: "Crystal Pressure",    kind: "perRep", baseBonus: 2,  flavor: "Diamond hands, diamond will." },
  "JM Press":                 { name: "Dual Edge",           kind: "pct",    baseBonus: 11, flavor: "Skull and press combined — twice the damage." },
  "Tate Press":               { name: "Open Elbow",          kind: "pct",    baseBonus: 10, flavor: "Elbows flared wide, the strike opens." },
  "Machine Tricep Press":     { name: "Pillar Machine",      kind: "pct",    baseBonus: 9,  flavor: "Iron guides iron — the tricep throne never wavers." },

  // ── Legs (additional) ─────────────────────────────────────────────────────
  "Sumo Deadlift":            { name: "Wide Foundation",     kind: "pct",    baseBonus: 14, flavor: "A wide stance claims more of the earth." },
  "Box Squat":                { name: "Throne Descent",      kind: "pct",    baseBonus: 13, flavor: "Sitting briefly before rising again." },
  "Step Up":                  { name: "Staircase Conqueror", kind: "perRep", baseBonus: 2,  flavor: "Each step claimed is a summit reached." },
  "Glute Kickback":           { name: "Rearguard Strike",    kind: "pct",    baseBonus: 9,  flavor: "The rear strike comes without warning." },
  "Adductor Machine":         { name: "Inner Gate",          kind: "pct",    baseBonus: 8,  flavor: "The inner gate holds everything in place." },
  "Abductor Machine":         { name: "Outer Guard",         kind: "pct",    baseBonus: 8,  flavor: "The outer guard keeps nightmares at bay." },
  "Seated Calf Raise":        { name: "Seated Pilgrim",      kind: "perRep", baseBonus: 1,  flavor: "Even seated, the journey continues." },
  "Reverse Lunge":            { name: "Backward Path",       kind: "perRep", baseBonus: 1,  flavor: "The path back demands the same strength." },

  // ── Forearms ──────────────────────────────────────────────────────────────
  "Barbell Wrist Curl":           { name: "Iron Serpent",          kind: "pct",    baseBonus: 10, flavor: "Wrist curls coil the serpent of the forearm." },
  "Dumbbell Wrist Curl":          { name: "Twin Coil",             kind: "pct",    baseBonus: 9,  flavor: "Two dumbbells wind the forearm to stone." },
  "Single Arm Wrist Curl":        { name: "Solitary Coil",         kind: "pct",    baseBonus: 10, flavor: "One wrist, one will, one coiled truth." },
  "Cable Wrist Curl":             { name: "Taut Wire",             kind: "pct",    baseBonus: 9,  flavor: "The cable keeps tension through the full arc." },
  "Behind the Back Wrist Curl":   { name: "Hidden Coil",           kind: "pct",    baseBonus: 11, flavor: "What curls behind the back hides the deepest strength." },
  "Barbell Reverse Wrist Curl":   { name: "Iron Extension",        kind: "pct",    baseBonus: 10, flavor: "Reverse curls awaken the sleeping extensor." },
  "Dumbbell Reverse Wrist Curl":  { name: "Twin Extension",        kind: "pct",    baseBonus: 9,  flavor: "Two dumbbells extend the reach of shadow." },
  "Single Arm Reverse Wrist Curl":{ name: "Unfolded Edge",         kind: "pct",    baseBonus: 10, flavor: "A single arm unfolds its sharpest edge." },
  "Reverse Curl":                 { name: "Brachial Awakening",    kind: "pct",    baseBonus: 10, flavor: "Reversed, the arm finds hidden muscle." },
  "Single Arm Reverse Curl":      { name: "Lone Brachial",         kind: "pct",    baseBonus: 10, flavor: "One arm reversed, twice as honest." },
  "Wrist Roller":                 { name: "Cylinder of Fate",      kind: "perRep", baseBonus: 2,  flavor: "Rolling the wrist winds fate tighter." },
  "Plate Pinch":                  { name: "Iron Grip",             kind: "pct",    baseBonus: 9,  flavor: "Pinched iron between two fingers — absolute control." },
  "Dead Hang":                    { name: "The Hanging",           kind: "perRep", baseBonus: 2,  flavor: "Hanging by will alone." },
  "Farmers Walk":                 { name: "Loaded Path",           kind: "pct",    baseBonus: 11, flavor: "Every step under load forges unbreakable grip." },
};

function buildAspectDescription(t: AspectTemplate, rank: AspectRank, muscle?: MuscleGroup): string {
  const mult = ASPECT_RANK_MULT[rank];
  let desc: string;
  if (t.kind === "pct") {
    const pct = Math.round(t.baseBonus * mult);
    desc = `${t.flavor} +${pct}% shards.`;
  } else if (t.kind === "perRep") {
    const n = +(t.baseBonus * mult).toFixed(1);
    desc = `${t.flavor} +${n} shard${n === 1 ? "" : "s"} per rep.`;
  } else {
    const bonus = Math.round(t.baseBonus * mult);
    desc = t.flavor.replace("{bonus}", String(bonus));
  }
  if (muscle) {
    const sec = ASPECT_SECONDARY[rank];
    const related = MUSCLE_RELATED[muscle];
    const cat = MUSCLE_CATEGORY_LABEL[muscle];
    if (sec.samePct > 0)
      desc += ` +${sec.samePct}% all ${cat} exercises.`;
    if (sec.relatedPct > 0 && related.length > 0)
      desc += ` +${sec.relatedPct}% ${related.map(m => MUSCLE_CATEGORY_LABEL[m]).join(" & ")} exercises.`;
    if (sec.allPct > 0)
      desc += ` +${sec.allPct}% all exercises.`;
  }
  return desc;
}

const FLAW_POOL: Record<MuscleGroup, Flaw[]> = {
  Chest: [
    { name: "Hollow Chest",   description: "Pressing exercises grant 15% fewer shards.",                    effect: { shardMuscles: ["Chest","Shoulders","Triceps"], shardPct: -15 } },
    { name: "Caved Sternum",  description: "Chest sets grant 15% fewer shards.",                            effect: { shardMuscles: ["Chest"], shardPct: -15 } },
    { name: "Glass Pectoral", description: "Failed Nightmares cost 10% more shards.",                       effect: { nmExtraPct: 10 } },
    { name: "Lead Shoulders", description: "Chest, Shoulders and Triceps earn 10% fewer shards.",           effect: { shardMuscles: ["Chest","Shoulders","Triceps"], shardPct: -10 } },
    { name: "Hollow Ribs",    description: "Failed Nightmares cost an extra 75 shards.",                    effect: { nmExtraFlat: 75 } },
  ],
  Back: [
    { name: "Brittle Spine",  description: "Pulling exercises grant 15% fewer shards.",                     effect: { shardMuscles: ["Back","Biceps"], shardPct: -15 } },
    { name: "Crooked Lat",    description: "Back sets grant 15% fewer shards.",                             effect: { shardMuscles: ["Back"], shardPct: -15 } },
    { name: "Slack Posture",  description: "Back sets grant 20% fewer shards.",                             effect: { shardMuscles: ["Back"], shardPct: -20 } },
    { name: "Hunched Shadow", description: "Failed Nightmares cost 15% more shards.",                       effect: { nmExtraPct: 15 } },
    { name: "Hollow Lats",    description: "Back and Biceps exercises earn 12% fewer shards.",              effect: { shardMuscles: ["Back","Biceps"], shardPct: -12 } },
  ],
  Shoulders: [
    { name: "Trembling Limbs",  description: "Shoulder exercises grant 15% fewer shards.",                  effect: { shardMuscles: ["Shoulders"], shardPct: -15 } },
    { name: "Broken Crown",     description: "Shoulder exercises grant 12% fewer shards.",                  effect: { shardMuscles: ["Shoulders"], shardPct: -12 } },
    { name: "Rusted Joint",     description: "Shoulder sets grant 18% fewer shards.",                       effect: { shardMuscles: ["Shoulders"], shardPct: -18 } },
    { name: "Drooping Guard",   description: "Shoulder and Chest sets earn 12% fewer shards.",              effect: { shardMuscles: ["Shoulders","Chest"], shardPct: -12 } },
    { name: "Locked Elevation", description: "Failed Nightmares cost an extra 80 shards.",                  effect: { nmExtraFlat: 80 } },
  ],
  Biceps: [
    { name: "Withered Curl",  description: "Biceps exercises grant 15% fewer shards.",                      effect: { shardMuscles: ["Biceps"], shardPct: -15 } },
    { name: "Hollow Arm",     description: "Biceps exercises grant 12% fewer shards.",                      effect: { shardMuscles: ["Biceps"], shardPct: -12 } },
    { name: "Snapped Tendon", description: "Biceps sets grant 20% fewer shards.",                           effect: { shardMuscles: ["Biceps"], shardPct: -20 } },
    { name: "Stubborn Grip",  description: "Arm exercises (Biceps and Triceps) earn 12% fewer shards.",     effect: { shardMuscles: ["Biceps","Triceps"], shardPct: -12 } },
    { name: "Hollow Flexion", description: "Failed Nightmares cost 12% more shards.",                       effect: { nmExtraPct: 12 } },
  ],
  Triceps: [
    { name: "Locked Triceps",       description: "Triceps exercises grant 15% fewer shards.",               effect: { shardMuscles: ["Triceps"], shardPct: -15 } },
    { name: "Soft Hammer",          description: "Triceps exercises grant 12% fewer shards.",               effect: { shardMuscles: ["Triceps"], shardPct: -12 } },
    { name: "Frayed Sinew",         description: "Triceps sets grant 18% fewer shards.",                    effect: { shardMuscles: ["Triceps"], shardPct: -18 } },
    { name: "Hollow Push",          description: "Pressing muscles (Chest, Shoulders, Triceps) earn 10% fewer shards.", effect: { shardMuscles: ["Chest","Shoulders","Triceps"], shardPct: -10 } },
    { name: "Crumbling Extension",  description: "Failed Nightmares cost an extra 80 shards.",              effect: { nmExtraFlat: 80 } },
  ],
  Legs: [
    { name: "Frail Foundation", description: "Leg exercises grant 15% fewer shards.",                       effect: { shardMuscles: ["Legs"], shardPct: -15 } },
    { name: "Hollow Knees",     description: "Leg exercises grant 12% fewer shards.",                       effect: { shardMuscles: ["Legs"], shardPct: -12 } },
    { name: "Reedstalk Calves", description: "Leg sets grant 20% fewer shards.",                            effect: { shardMuscles: ["Legs"], shardPct: -20 } },
    { name: "Hollow Steps",     description: "Leg and Core sets earn 10% fewer shards.",                    effect: { shardMuscles: ["Legs","Core"], shardPct: -10 } },
    { name: "Glass Foundation", description: "Failed Nightmares cost 15% more shards.",                     effect: { nmExtraPct: 15 } },
  ],
  Core: [
    { name: "Fractured Will",  description: "Lose 25% more shards on failed Nightmares.",                   effect: { nmExtraPct: 25 } },
    { name: "Soft Sanctum",    description: "Core sets grant 20% fewer shards.",                            effect: { shardMuscles: ["Core"], shardPct: -20 } },
    { name: "Open Wound",      description: "Failed Nightmares cost an extra 100 shards.",                  effect: { nmExtraFlat: 100 } },
    { name: "Dimmed Centre",   description: "All exercises earn 8% fewer shards.",                          effect: { shardMuscles: ["Chest","Back","Shoulders","Biceps","Triceps","Legs","Core","Forearms"], shardPct: -8 } },
    { name: "Hollow Sanctum",  description: "Failed Nightmares cost 30% more shards.",                      effect: { nmExtraPct: 30 } },
  ],
  Forearms: [
    { name: "Iron Grip Curse", description: "Forearm exercises grant 15% fewer shards.",                    effect: { shardMuscles: ["Forearms"], shardPct: -15 } },
    { name: "Limp Wrist",      description: "Forearm exercises grant 20% fewer shards.",                    effect: { shardMuscles: ["Forearms"], shardPct: -20 } },
    { name: "Cramped Digits",  description: "Forearm and Biceps sets earn 12% fewer shards.",               effect: { shardMuscles: ["Forearms","Biceps"], shardPct: -12 } },
    { name: "Weak Grip",       description: "Failed Nightmares cost an extra 60 shards.",                   effect: { nmExtraFlat: 60 } },
    { name: "Hollow Tendons",  description: "Failed Nightmares cost 12% more shards.",                      effect: { nmExtraPct: 12 } },
  ],
};

export const TRUE_NAMES: TrueName[] = [
  { name: "Voidwalker",    description: "+10% shards on every expedition.",                                    effect: { allPct: 10 } },
  { name: "Shadowbreaker", description: "Doubles all memory drop channels (PR, Shard, Nightmare). Each additional doubling source only adds +10% per channel instead.", effect: { memoryDoubleChance: true } },
  { name: "Soulreaper",    description: "+15% shards on PR sets.",                                             effect: { prPct: 15 } },
  { name: "Duskfang",      description: "Failed Nightmares cost 50% fewer shards.",                            effect: { nmLossReduction: 50 } },
  { name: "Ironveil",      description: "+5% shards across all exercises.",                                    effect: { allPct: 5 } },
  { name: "Nightspear",    description: "+20% shards on your strongest muscle group.",                         effect: { strongestMusclePct: 20 } },
  { name: "Worldender",    description: "+8% all shards and +1 shard per rep on PRs.",                         effect: { allPct: 8, prFlatPerRep: 1 } },
  { name: "Ashen Herald",  description: "Memory drops roll one rank higher (capped at Divine).",               effect: { memoryRankBoost: true } },
  { name: "Stormcaller",   description: "+12% shards on Back and Shoulder sets.",                              effect: { stormcallerPct: 12 } },
  { name: "The Unbroken",  description: "Nightmare ascension threshold reduced to 17%.",                       effect: { nmThresholdReduction: true } },
  // New entries
  { name: "Emberbrand",    description: "+14% shards on all pressing exercises (Chest, Shoulders, Triceps).",  effect: { pusherPct: 14 } },
  { name: "Tide Warden",   description: "+14% shards on all pulling exercises (Back, Biceps).",                effect: { pullerPct: 14 } },
  { name: "Iron Pilgrim",  description: "+3 flat shards on every set logged.",                                 effect: { flatPerSet: 3 } },
  { name: "Dawnstrider",   description: "+18% shards on all Leg exercises.",                                   effect: { legPct: 18 } },
  { name: "The Witness",   description: "+16% shards on all Arm exercises (Biceps, Triceps).",                 effect: { armPct: 16 } },
  { name: "Starless Night",description: "+20% to every memory drop channel (PR, Shard, Nightmare).",           effect: { memoryDropChancePct: 20 } },
  { name: "Fracture Mark", description: "+18% shards on all Core exercises.",                                  effect: { corePct: 18 } },
  { name: "Gravechant",    description: "+7% all shards and Nightmare ascension threshold reduced to 18%.",    effect: { allPct: 7, nmThresholdValue: 0.18 } },
  { name: "Veil Seer",     description: "Doubles all memory drop channels (PR, Shard, Nightmare). Each additional doubling source only adds +10% per channel instead.", effect: { memoryDoubleChance: true } },
];

// Stronger true names granted only by the First Nightmare (~40% stronger than standard)
export const FIRST_NM_TRUE_NAMES: TrueName[] = [
  { name: "Voidwalker",    description: "+14% shards on every expedition.",                                          effect: { allPct: 14 } },
  { name: "Shadowbreaker", description: "Doubles all memory drop channels (PR, Shard, Nightmare). +5% all shards.",  effect: { memoryDoubleChance: true, allPct: 5 } },
  { name: "Soulreaper",    description: "+21% shards on PR sets.",                                                   effect: { prPct: 21 } },
  { name: "Duskfang",      description: "Failed Nightmares cost 70% fewer shards.",                                  effect: { nmLossReduction: 70 } },
  { name: "Ironveil",      description: "+7% shards across all exercises.",                                          effect: { allPct: 7 } },
  { name: "Nightspear",    description: "+28% shards on your strongest muscle group.",                               effect: { strongestMusclePct: 28 } },
  { name: "Worldender",    description: "+11% all shards and +1 shard per rep on PRs.",                              effect: { allPct: 11, prFlatPerRep: 1 } },
  { name: "Ashen Herald",  description: "Memory drops roll one rank higher (capped at Divine). +5% all shards.",    effect: { memoryRankBoost: true, allPct: 5 } },
  { name: "Stormcaller",   description: "+17% shards on Back and Shoulder sets.",                                    effect: { stormcallerPct: 17 } },
  { name: "The Unbroken",  description: "Nightmare ascension threshold reduced to 14%.",                             effect: { nmThresholdValue: 0.14 } },
  // New entries — ~40% stronger than their standard counterparts
  { name: "Emberbrand",    description: "+20% shards on all pressing exercises (Chest, Shoulders, Triceps).",        effect: { pusherPct: 20 } },
  { name: "Tide Warden",   description: "+20% shards on all pulling exercises (Back, Biceps).",                      effect: { pullerPct: 20 } },
  { name: "Iron Pilgrim",  description: "+4 flat shards on every set logged.",                                       effect: { flatPerSet: 4 } },
  { name: "Dawnstrider",   description: "+25% shards on all Leg exercises.",                                         effect: { legPct: 25 } },
  { name: "The Witness",   description: "+22% shards on all Arm exercises (Biceps, Triceps).",                       effect: { armPct: 22 } },
  { name: "Starless Night",description: "+30% to every memory drop channel (PR, Shard, Nightmare).",                 effect: { memoryDropChancePct: 30 } },
  { name: "Fracture Mark", description: "+25% shards on all Core exercises.",                                        effect: { corePct: 25 } },
  { name: "Gravechant",    description: "+10% all shards and Nightmare ascension threshold reduced to 16%.",         effect: { allPct: 10, nmThresholdValue: 0.16 } },
  { name: "Veil Seer",     description: "Doubles all memory drop channels (PR, Shard, Nightmare) and +8% all shards.", effect: { memoryDoubleChance: true, allPct: 8 } },
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
  Forearms: 150,
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

  const primaryKind: AspectAbilityKind =
    tpl.kind === "pct"    ? "exercisePct" :
    tpl.kind === "perRep" ? "exercisePerRep" :
                            "nmLossReduction";
  const primaryAbility: AspectAbility = {
    kind: primaryKind,
    value: Number(bonusValue),
    description: "",
  };
  primaryAbility.description = describeAbility(primaryAbility, best.exercise, best.muscle);

  const aspect: Aspect = {
    name: tpl.name,
    description: primaryAbility.description,
    rank,
    exercise: best.exercise,
    muscle: best.muscle,
    bonusKind: tpl.kind as Aspect["bonusKind"],
    bonusValue: Number(bonusValue),
    abilities: [primaryAbility],
  };

  const flawOptions = FLAW_POOL[worst.muscle];
  const flaw = flawOptions[Math.floor(Math.random() * flawOptions.length)];

  // 15% true name chance on first nightmare — uses stronger FIRST_NM pool
  const guaranteed = (aspirantName ?? "").trim().toLowerCase() === "dev";
  const trueName = (guaranteed || Math.random() < 0.15)
    ? FIRST_NM_TRUE_NAMES[Math.floor(Math.random() * FIRST_NM_TRUE_NAMES.length)]
    : undefined;

  return { aspect, flaw, trueName };
}

// Migrate old Aspect loaded from localStorage — ensures exercise, muscle, and abilities are set
export function migrateAspect(a: Aspect): Aspect {
  let result = a;

  // Ensure exercise / bonusKind / muscle are populated
  if (!result.exercise || !result.bonusKind) {
    const entry = Object.entries(EXERCISE_ASPECTS).find(([, t]) => t.name === result.name);
    if (!entry) {
      result = { ...result, exercise: "", bonusKind: "pct", bonusValue: 0, abilities: result.abilities ?? [] };
    } else {
      const [exercise, t] = entry;
      const mult = ASPECT_RANK_MULT[result.rank] ?? 1;
      const muscle = EXERCISE_MUSCLE[exercise];
      result = {
        ...result,
        exercise,
        muscle,
        bonusKind: t.kind as Aspect["bonusKind"],
        bonusValue: t.kind === "pct"
          ? Math.round(t.baseBonus * mult)
          : +(t.baseBonus * mult).toFixed(1),
        description: buildAspectDescription(t, result.rank, muscle),
      };
    }
  } else if (!result.muscle) {
    result = { ...result, muscle: EXERCISE_MUSCLE[result.exercise] };
  }

  // Ensure abilities array exists — initialise from legacy bonusKind/bonusValue
  if (!result.abilities || result.abilities.length === 0) {
    const primaryKind: AspectAbilityKind =
      result.bonusKind === "pct"    ? "exercisePct" :
      result.bonusKind === "perRep" ? "exercisePerRep" :
                                      "nmLossReduction";
    const primary: AspectAbility = {
      kind: primaryKind,
      value: result.bonusValue,
      description: describeAbility(
        { kind: primaryKind, value: result.bonusValue, description: "" },
        result.exercise, result.muscle,
      ),
    };
    result = { ...result, abilities: [primary] };
  }

  return result;
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

// Map from nightmaresPassed count to the corresponding AspectRank
const NM_TO_ASPECT_RANK: Record<number, AspectRank> = {
  1: "Awakened", 2: "Ascended", 3: "Transcended", 4: "Supreme", 5: "Sacred",
};

// Called when a nightmare is passed: boosts all existing abilities and unlocks a new one.
// Aspect rank is genetically fixed from the first nightmare and never changes.
export function upgradeAspect(aspect: Aspect, nightmaresPassed: number): Aspect {
  const existing = aspect.abilities ?? [];

  // Boost all existing abilities slightly
  const boosted = existing.map(ab => {
    const isFlat = ab.kind === "exercisePerRep" || ab.kind === "flatPerSet";
    return { ...ab, value: ab.value + (isFlat ? FLAT_ABILITY_BOOST : PCT_ABILITY_BOOST) };
  });

  // Unlock new ability if one is available for this nightmare number
  const progIdx = nightmaresPassed - 2; // NM2 → index 0
  let updated = boosted;
  if (progIdx >= 0 && progIdx < ABILITY_PROGRESSION.length) {
    const prog = ABILITY_PROGRESSION[progIdx];
    const rankMult = ASPECT_RANK_MULT[aspect.rank]; // fixed rank — never changes
    // If the muscle has no related muscles (Legs, Core), give allPct instead
    const kind: AspectAbilityKind =
      prog.kind === "relatedMusclePct" && aspect.muscle && MUSCLE_RELATED[aspect.muscle].length === 0
        ? "allPct"
        : prog.kind;
    const value = Math.round(prog.baseValue * rankMult);
    updated = [...boosted, { kind, value, description: "" }];
  }

  // Refresh all descriptions
  const refreshed = updated.map(ab => ({
    ...ab,
    description: describeAbility(ab, aspect.exercise, aspect.muscle),
  }));

  return {
    ...aspect,
    // rank intentionally omitted — fixed at birth from the first nightmare
    bonusValue: refreshed[0]?.value ?? aspect.bonusValue,
    abilities: refreshed,
    description: refreshed.map(ab => ab.description).join(" "),
  };
}

export function calcShards(
  set: SetLog,
  nmBaseline: number,   // first-nightmare weight for this exercise (fixed reference point)
  coreMultiplier: number,
  ctx: BonusCtx,
  aspect: Aspect | null,
  isPR: boolean,
): number {
  const bonusKgPerRep = ctx.bonusWeightByMuscle[set.muscle] ?? 0;
  // Step size: 5 kg bilateral, 2.5 kg unilateral — each step adds +0.5 shards/rep
  const kgStep = UNILATERAL_EXERCISES.has(set.exercise) ? 2.5 : 5;

  // Below NM baseline: more than one step below = 0 shards; within one step = 0.5/rep flat
  if (set.weight < nmBaseline - kgStep) return 0;
  if (set.weight < nmBaseline) return 0.5 * set.reps;

  // At NM baseline = 1/rep; every 5 kg (2.5 kg unilateral) above = +0.5/rep
  const perRep = 1 + Math.floor((set.weight - nmBaseline) / kgStep) * 0.5;
  // PR sets earn 1.5× shards — applied to the base so all % bonuses scale on top of it.
  const prMultiplier = isPR ? 1.5 : 1;
  const base = set.reps * perRep * coreMultiplier * prMultiplier;

  // All additive % bonuses
  let pctBonus = ctx.allPct + (ctx.musclePct[set.muscle] ?? 0);
  if (isPR) pctBonus += ctx.prPct;

  // Flat per-rep bonuses
  let flatPerRep = 0;
  if (isPR) flatPerRep += ctx.prFlatPerRep;
  if (set.muscle === "Legs")      flatPerRep += ctx.legFlatPerRep;
  if (set.muscle === "Shoulders") flatPerRep += ctx.shoulderFlatPerRep;

  // Aspect abilities
  let aspectFlatPerSet = 0;
  if (aspect?.abilities?.length) {
    for (const ab of aspect.abilities) {
      switch (ab.kind) {
        case "exercisePct":
          if (set.exercise === aspect.exercise) pctBonus += ab.value;
          break;
        case "exercisePerRep":
          if (set.exercise === aspect.exercise) flatPerRep += ab.value;
          break;
        case "musclePct":
          if (set.muscle === aspect.muscle) pctBonus += ab.value;
          break;
        case "relatedMusclePct":
          if (aspect.muscle && MUSCLE_RELATED[aspect.muscle].includes(set.muscle)) pctBonus += ab.value;
          break;
        case "allPct":
          pctBonus += ab.value;
          break;
        case "prPct":
          if (isPR) pctBonus += ab.value;
          break;
        case "flatPerSet":
          if (set.muscle === aspect.muscle) aspectFlatPerSet += ab.value;
          break;
      }
    }
  } else if (aspect) {
    // Legacy fallback for saves without abilities
    if (aspect.bonusKind === "pct" && set.exercise === aspect.exercise) pctBonus += aspect.bonusValue;
    if (aspect.bonusKind === "perRep" && set.exercise === aspect.exercise) flatPerRep += aspect.bonusValue;
    if (aspect.muscle) {
      const sec = ASPECT_SECONDARY[aspect.rank];
      if (sec.samePct > 0 && set.muscle === aspect.muscle) pctBonus += sec.samePct;
      if (sec.relatedPct > 0 && MUSCLE_RELATED[aspect.muscle].includes(set.muscle)) pctBonus += sec.relatedPct;
      if (sec.allPct > 0) pctBonus += sec.allPct;
    }
  }

  const afterPct = base * (1 + pctBonus / 100);

  // Return raw float — caller accumulates the fractional remainder across sets
  return afterPct + flatPerRep * set.reps + ctx.flatPerSet + aspectFlatPerSet + bonusKgPerRep * set.reps;
}

// Compute the NM fail penalty (shards to deduct) including flaw/trueName modifiers.
// The base is the shards earned INTO the current core tier (not the lifetime total),
// so a failed Nightmare can only set you back within your current tier, never below it.
export function calcNMPenalty(currentShards: number, ctx: BonusCtx): number {
  const tierProgress = currentCoreInfo(currentShards).filled; // shards into current tier
  const rollPct = 15 + Math.random() * 30; // 15–45%
  let penalty = Math.floor(tierProgress * rollPct / 100);
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
