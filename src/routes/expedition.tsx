import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useGame, type Workout } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import {
  MUSCLE_GROUPS, EXERCISES, BODYWEIGHT_EXERCISES, UNILATERAL_EXERCISES, calcShards, currentMultiplier, currentCoreInfo,
  computeBonuses, strongestMuscleFromBaselines, computeRank,
  type SetLog, type MuscleGroup,
} from "@/lib/game";
import { rollPRMemoryDrop, rollExpeditionMemoryDrop, getMemoryEffect, RANK_COLOR, type Memory } from "@/lib/memories";
import {
  getActiveCohortSessionForUser, getCohortExpeditionSession,
  requestCohortExit, cancelCohortExitRequest,
  deleteCohortExpeditionSession, updateCohortLiveShards,
  type CohortExpeditionSession,
} from "@/lib/social";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/expedition")({
  component: DreamRealm,
  head: () => ({ meta: [{ title: "Expedition — Shadow Slave" }] }),
});

const DAYS = ["Pull", "Push", "Legs", "Upper", "Lower", "Arms", "Full Body"];

// ── Expedition draft persistence ───────────────────────────────────────────
// Saved to localStorage whenever sets change so an accidental exit can be resumed.

// Draft key is per-user so switching accounts never restores another player's session.
const DRAFT_KEY = `nma-expedition-draft-${getCurrentUser() ?? "guest"}`;

type ExpeditionDraft = {
  sets: Array<SetLog & { shards: number; isPR: boolean }>;
  day: string;
  startTime: number;
  prExercises: string[];
  shardCarry: number;
};

function loadDraft(): ExpeditionDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as ExpeditionDraft;
    return d.sets?.length > 0 ? d : null;
  } catch { return null; }
}

function saveDraft(draft: ExpeditionDraft) {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch {}
}

function clearDraft() {
  try { localStorage.removeItem(DRAFT_KEY); } catch {}
}

const REST_KEY = "nma-rest-duration";
const REST_PRESETS = [30, 45, 60, 90, 120, 180];

function getSavedRestDuration(): number | null {
  try { const v = localStorage.getItem(REST_KEY); return v ? Number(v) : null; } catch { return null; }
}
function saveRestDuration(s: number) {
  try { localStorage.setItem(REST_KEY, String(s)); } catch {}
}
function fmtTime(s: number) {
  const m = Math.floor(s / 60);
  return m > 0 ? `${m}:${(s % 60).toString().padStart(2, "0")}` : `${s}`;
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function fmtDuration(ms: number): string {
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

type DropWithSource = { memory: Memory; source: string };
type ExpeditionResult = {
  total: number;
  duration: number;
  expeditionNumber: number;
  drops: DropWithSource[];
  coreEvolved: boolean;
  newRankLabel: string | null;
};

function DreamRealm() {
  const navigate = useNavigate();
  const { state, logWorkout, addCustomDay, removeCustomDay } = useGame();

  // Block access until the First Nightmare is complete
  if (!state.aspect) {
    return (
      <div className="min-h-screen pb-24 max-w-md mx-auto flex flex-col">
        <header className="px-5 pt-6 pb-3">
          <button onClick={() => navigate({ to: "/dreamrealm" })} className="text-[10px] text-muted-foreground uppercase tracking-widest">← Dreamrealm</button>
          <h1 className="font-display text-lg text-gold tracking-[0.2em] text-glow mt-3">DREAM EXPEDITIONS</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-4xl mb-5">🔒</p>
          <p className="font-display text-sm text-destructive tracking-[0.15em] mb-2">SEALED</p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            The Dream Realm is locked until you complete your First Nightmare.
            Return home and face the trial to unlock expeditions.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="border border-rune px-6 py-2.5 font-display text-xs tracking-[0.15em] text-muted-foreground hover:border-gold/30 hover:text-foreground transition-all"
          >
            RETURN HOME
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }
  const currentUser = getCurrentUser();

  // ── Cohort expedition session ─────────────────────────────────────────────
  // Load the session this user is in (if any) — initiated from Friends → Cohort tab.
  const [sessionId] = useState<string | null>(
    () => currentUser ? (getActiveCohortSessionForUser(currentUser)?.id ?? null) : null
  );
  // Live session state, polled every 5 s
  const [session, setSession] = useState<CohortExpeditionSession | null>(
    () => sessionId ? getCohortExpeditionSession(sessionId) : null
  );
  // Live shards earned THIS expedition per member — sourced from session.liveShards
  const [cohortMemberShards, setCohortMemberShards] = useState<Record<string, number>>(() => {
    if (!sessionId) return {};
    const s = getCohortExpeditionSession(sessionId);
    return s ? { ...(s.liveShards ?? {}) } : {};
  });
  // Whether this user has already clicked "Request to End"
  const [exitRequested, setExitRequested] = useState(false);
  // Guard against calling finish() twice (e.g. from polling + manual)
  const hasFinished = useRef(false);
  // Always-current reference to finish() so the polling interval never holds a stale closure
  const finishRef = useRef<() => void>(() => {});

  // Poll session state + member shards every 5 s
  useEffect(() => {
    if (!sessionId) return;
    function poll() {
      const s = getCohortExpeditionSession(sessionId!);
      setSession(s);
      if (!s) return;
      // Read live shards written by each member on every set — no need to wait for finish()
      setCohortMemberShards({ ...(s.liveShards ?? {}) });
      // Auto-finish when ALL accepted members have requested exit
      if (
        s.acceptedMembers.length > 0 &&
        s.acceptedMembers.every(m => s.exitRequests.includes(m)) &&
        !hasFinished.current
      ) {
        hasFinished.current = true;
        deleteCohortExpeditionSession(sessionId!);
        finishRef.current();
      }
    }
    poll();
    const id = setInterval(poll, 5_000);
    return () => clearInterval(id);
  }, [sessionId]);

  // Derived cohort values
  const cohortAccepted      = session?.acceptedMembers.filter(m => m !== currentUser) ?? [];
  const cohortMemberCount   = cohortAccepted.length;
  const cohortShardBonusPct   = cohortMemberCount * 8;
  const cohortMemoryBonusFlat = cohortMemberCount * 5;

  const mult = currentMultiplier(state.totalShards);
  const core = currentCoreInfo(state.totalShards);

  const equippedMemories = state.memories.filter(m => state.equippedMemoryIds.includes(m.id));
  const memoryEffects = equippedMemories.map(getMemoryEffect);
  const strongest = strongestMuscleFromBaselines(state.baselines, state.firstNightmareSets);
  const ctx = computeBonuses(state.flaw ?? null, state.trueName ?? null, memoryEffects, strongest);

  // Per-channel memory drop chances — each channel capped independently at 80%
  // Formula: (base + flat + cohort flat) × (doublers >= 1 ? 2 : 1) + max(0, doublers − 1) × 10, capped at 80
  function channelChance(basePct: number): number {
    const d = ctx.memoryDoubleCount;
    return Math.min(80, (basePct + ctx.memoryDropChancePct + cohortMemoryBonusFlat) * (d >= 1 ? 2 : 1) + Math.max(0, d - 1) * 10);
  }
  const prChance    = channelChance(30);
  const shardChance = channelChance(15);

  // Restore any in-progress expedition that was interrupted (navigated away without finishing)
  const [draft] = useState<ExpeditionDraft | null>(() => loadDraft());
  const [isResumed] = useState(() => (draft?.sets?.length ?? 0) > 0);

  const [day, setDay] = useState(draft?.day ?? DAYS[0]);
  const [muscle, setMuscle] = useState<MuscleGroup>("Back");
  const [exercise, setExercise] = useState(EXERCISES["Back"][0]);
  const bodyWeight = state.profile?.weight ?? 70;
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");
  const [addWeight, setAddWeight] = useState(false);
  const [extraWeight, setExtraWeight] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [sets, setSets] = useState<Array<SetLog & { shards: number; isPR: boolean }>>(draft?.sets ?? []);
  const [prExercises, setPrExercises] = useState<Set<string>>(new Set(draft?.prExercises ?? []));
  const [startTime] = useState(() => draft?.startTime ?? Date.now());
  const [result, setResult] = useState<ExpeditionResult | null>(null);
  // Fractional shard carry — accumulates sub-1 remainders across sets so they aren't lost
  const shardCarry = useRef(draft?.shardCarry ?? 0);
  const [floaters, setFloaters] = useState<Array<{ id: number; val: number }>>([]);
  const [showAwakening, setShowAwakening] = useState(false);
  const [awakeningDrops, setAwakeningDrops] = useState<Memory[]>([]);

  // Custom day creator
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customDayInput, setCustomDayInput]   = useState("");

  // ── Rest timer
  const [restDuration, setRestDuration] = useState<number | null>(getSavedRestDuration);
  const [showSetTimer, setShowSetTimer]   = useState(false);
  const [tempDuration, setTempDuration]   = useState("90");
  const [timerActive,  setTimerActive]    = useState(false);
  const [timerEnd,     setTimerEnd]       = useState<number | null>(null);
  const [timerDone,    setTimerDone]      = useState(false);
  const [timerRemaining, setTimerRemaining] = useState(0);
  const longPressRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);

  // Persist expedition draft whenever sets/day change so we can resume after accidental exit
  useEffect(() => {
    if (sets.length === 0) return;
    saveDraft({ sets, day, startTime, prExercises: [...prExercises], shardCarry: shardCarry.current });
  }, [sets, day, startTime, prExercises]);

  // Timer countdown tick
  useEffect(() => {
    if (!timerActive || !timerEnd) return;
    const id = setInterval(() => {
      const rem = Math.ceil((timerEnd - Date.now()) / 1000);
      if (rem <= 0) {
        setTimerRemaining(0);
        setTimerActive(false);
        setTimerEnd(null);
        setTimerDone(true);
      } else {
        setTimerRemaining(rem);
      }
    }, 100);
    return () => clearInterval(id);
  }, [timerActive, timerEnd]);

  function startTimer(duration?: number) {
    const secs = duration ?? restDuration;
    if (!secs) { setShowSetTimer(true); return; }
    const end = Date.now() + secs * 1000;
    setTimerEnd(end);
    setTimerRemaining(secs);
    setTimerDone(false);
    setTimerActive(true);
  }

  function endTimer() {
    setTimerActive(false);
    setTimerEnd(null);
    setTimerRemaining(0);
    setTimerDone(false);
  }

  function confirmDuration() {
    const secs = Math.max(5, Math.min(600, Number(tempDuration) || 90));
    setRestDuration(secs);
    saveRestDuration(secs);
    setShowSetTimer(false);
    startTimer(secs);
  }

  function handleRestPointerDown() {
    longPressTriggered.current = false;
    longPressRef.current = setTimeout(() => {
      longPressTriggered.current = true;
      setTempDuration(String(restDuration ?? 90));
      setShowSetTimer(true);
    }, 600);
  }

  function handleRestPointerUp() {
    if (longPressRef.current) clearTimeout(longPressRef.current);
    if (!longPressTriggered.current) {
      if (!restDuration) { setShowSetTimer(true); }
      else startTimer();
    }
  }

  function addSet() {
    const isBW = BODYWEIGHT_EXERCISES.has(exercise);
    const effectiveWeight = isBW ? bodyWeight + Number(extraWeight || 0) : Number(weight);
    const r = Number(reps);
    if (!effectiveWeight || !r) return;
    const set: SetLog = { exercise, muscle, weight: effectiveWeight, reps: r };
    const weightBaseline = state.baselines[exercise];
    const repBaseline = state.repBaselines?.[exercise];
    const isPR = weightBaseline !== undefined && (
      effectiveWeight > weightBaseline ||
      (effectiveWeight >= weightBaseline && repBaseline !== undefined && r >= repBaseline + 2)
    );
    // Use first-nightmare weight as the fixed shard-rate baseline; fall back to best-ever for new exercises
    const nm1Weight = state.firstNightmareSets?.find(s => s.exercise === exercise)?.weight
      ?? state.baselines[exercise]
      ?? effectiveWeight;
    // calcShards returns a raw float; fold in the running carry so fractional parts aren't lost
    const baseShards = calcShards(set, nm1Weight, mult, ctx, state.aspect, isPR);
    const rawShards  = cohortShardBonusPct > 0
      ? baseShards * (1 + cohortShardBonusPct / 100)
      : baseShards;
    const withCarry = rawShards + shardCarry.current;
    const shards = Math.floor(withCarry);
    shardCarry.current = withCarry - shards; // remainder rolls into the next set

    // Track each exercise that had a PR — rolled once per exercise at expedition end
    if (isPR) {
      setPrExercises(prev => { const n = new Set(prev); n.add(exercise); return n; });
    }

    setSets(prev => [...prev, { ...set, shards, isPR }]);
    // Publish live shard count into the shared session so other members see it immediately
    if (sessionId && currentUser) {
      updateCohortLiveShards(sessionId, currentUser, totalShards + shards);
    }
    const floatId = Date.now();
    setFloaters(prev => [...prev, { id: floatId, val: shards }]);
    setTimeout(() => setFloaters(prev => prev.filter(f => f.id !== floatId)), 1100);
    setWeight(""); setReps(""); setExtraWeight(""); setAddWeight(false);
    setShowAdd(false);
  }

  // Keep finishRef always pointing to the latest version so the polling interval
  // can call it without capturing a stale closure.
  useEffect(() => { finishRef.current = finish; });

  function finish() {
    if (sets.length === 0) return;
    const total = sets.reduce((s, x) => s + x.shards, 0);
    const duration = Date.now() - startTime;
    const expeditionNumber = state.workouts.length + 1;

    // One independent roll per unique exercise that had a PR this session
    const dropsWithSource: DropWithSource[] = [];
    for (const ex of prExercises) {
      const drop = rollPRMemoryDrop(ctx.memoryRankBoost, prChance);
      if (drop) dropsWithSource.push({ memory: drop, source: `${ex} PR` });
    }

    // One independent roll for reaching 110+ shards
    if (total > 110) {
      const expDrop = rollExpeditionMemoryDrop(ctx.memoryRankBoost, shardChance);
      if (expDrop) dropsWithSource.push({ memory: expDrop, source: "Shard Count" });
    }

    const allDrops = dropsWithSource.map(d => d.memory);

    // Snapshot values BEFORE logWorkout mutates the module-level state.
    // After logWorkout, the component's 'state' still points to the old render snapshot,
    // so we derive post-workout totals manually to avoid stale reads.
    const isAwakening = state.nightmaresPassed === 1 && state.workouts.length === 4;
    const shardsBeforeWorkout = state.totalShards;
    const coreBefore = currentCoreInfo(shardsBeforeWorkout);

    const w: Workout = {
      id: crypto.randomUUID(),
      date: Date.now(),
      day,
      sets: sets.map(({ shards: _s, isPR: _p, ...s }) => s),
      shardsEarned: total,
      drops: allDrops,
    };
    logWorkout(w);
    clearDraft(); // expedition is done — remove the saved draft

    // Compute post-workout core info from the known new total (not from the stale snapshot).
    const shardsAfterWorkout = shardsBeforeWorkout + total;
    const coreAfter = currentCoreInfo(shardsAfterWorkout);
    const coreEvolved = coreAfter.completed > coreBefore.completed;
    // workouts.length hasn't updated in the component snapshot yet — add 1 manually.
    const rank = computeRank(state.nightmaresPassed, state.workouts.length + 1);
    const coreName = coreAfter.name.replace(" (Max)", "");
    const newRankLabel = coreEvolved ? `${rank} ${coreName}` : null;

    if (isAwakening) {
      setAwakeningDrops(allDrops);
      setShowAwakening(true);
    } else {
      setResult({ total, duration, expeditionNumber, drops: dropsWithSource, coreEvolved, newRankLabel });
    }
  }

  if (showAwakening) {
    return (
      <AwakeningScreen
        name={state.profile?.name ?? "Aspirant"}
        drops={awakeningDrops}
        onContinue={() => navigate({ to: "/" })}
      />
    );
  }

  if (result) {
    return <ResultsScreen result={result} onContinue={() => navigate({ to: "/" })} />;
  }

  const grouped = sets.reduce<Record<string, { sets: typeof sets; muscle: MuscleGroup; total: number }>>((acc, s) => {
    if (!acc[s.exercise]) acc[s.exercise] = { sets: [], muscle: s.muscle, total: 0 };
    acc[s.exercise].sets.push(s);
    acc[s.exercise].total += s.shards;
    return acc;
  }, {});

  const totalShards = sets.reduce((s, x) => s + x.shards, 0);
  const prCount = sets.filter(s => s.isPR).length;

  type BonusChip = { label: string; kind?: "gold" | "purple" | "red" };
  const bonusChips: BonusChip[] = [];

  // ── Cohort bonuses (purple) — only show when at least one member has accepted
  if (session && cohortMemberCount > 0) {
    bonusChips.push({ label: `⚔ Cohort: +${cohortShardBonusPct}% shards`, kind: "purple" });
    bonusChips.push({ label: `⚔ Cohort: +${cohortMemoryBonusFlat}% memory drops`, kind: "purple" });
  }

  // ── Aspect abilities (gold)
  for (const ab of (state.aspect?.abilities ?? [])) {
    bonusChips.push({ label: ab.description, kind: "gold" });
  }

  // ── True name (gold — show what it does, not just the name)
  if (state.trueName) {
    bonusChips.push({ label: `✦ ${state.trueName.description}`, kind: "gold" });
  }

  // ── Bonus weight per muscle from equipped memories (purple)
  for (const [m, kg] of Object.entries(ctx.bonusWeightByMuscle)) {
    if ((kg as number) > 0) bonusChips.push({ label: `+${kg}kg/rep ${m}`, kind: "purple" });
  }

  // ── Memory drop bonuses (purple)
  if (ctx.memoryDoubleCount >= 1) bonusChips.push({ label: "2× all memory drop channels", kind: "purple" });
  if (ctx.memoryDoubleCount >= 2) bonusChips.push({ label: `+${(ctx.memoryDoubleCount - 1) * 10}% per extra doubler`, kind: "purple" });
  if (ctx.memoryDropChancePct > 0) bonusChips.push({ label: `+${ctx.memoryDropChancePct}% all drop channels`, kind: "purple" });
  // Show computed channel chances only when they differ from the base
  if (prChance !== 30 || shardChance !== 15) {
    bonusChips.push({ label: `PR drop: ${prChance}%  ·  Shard drop: ${shardChance}%`, kind: "purple" });
  }

  // ── Aggregate % / flat bonuses from ctx (true name + memories combined)
  if (ctx.allPct)             bonusChips.push({ label: `+${ctx.allPct}% all sets` });
  if (ctx.prPct)              bonusChips.push({ label: `+${ctx.prPct}% PR sets` });
  if (ctx.prFlatPerRep)       bonusChips.push({ label: `+${ctx.prFlatPerRep}/rep PRs` });
  if (ctx.legFlatPerRep)      bonusChips.push({ label: `+${ctx.legFlatPerRep}/rep Legs` });
  if (ctx.shoulderFlatPerRep) bonusChips.push({ label: `+${ctx.shoulderFlatPerRep}/rep Shoulders` });
  if (ctx.flatPerSet)         bonusChips.push({ label: `+${ctx.flatPerSet}/set` });
  if (ctx.nmLossReduction)    bonusChips.push({ label: `-${ctx.nmLossReduction}% NM loss` });
  if (ctx.nmThreshold < 0.20) bonusChips.push({ label: `NM threshold ${Math.round(ctx.nmThreshold * 100)}%` });

  // ── Per-muscle % bonuses (positive from memories/trueName, negative from flaw)
  for (const [m, pct] of Object.entries(ctx.musclePct)) {
    const p = pct as number;
    if (p > 0) bonusChips.push({ label: `+${p}% ${m}` });
    if (p < 0) bonusChips.push({ label: `${p}% ${m}`, kind: "red" });
  }

  // ── Flaw name (red — individual penalties already shown above via musclePct)
  if (state.flaw) {
    bonusChips.push({ label: `⚠ Flaw: ${state.flaw.name}`, kind: "red" });
  }

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto">
      <header className="px-5 pt-6 pb-3">
        <h1 className="font-display text-lg text-gold tracking-[0.2em]">EXPEDITION</h1>
        <p className="text-xs text-muted-foreground tracking-wider mt-1">Log your dream realm conquest</p>
      </header>

      {/* Resume banner — shown when an interrupted expedition was restored */}
      {isResumed && (
        <div className="mx-4 mb-2 px-3.5 py-2.5 bg-gold/8 border border-gold/30 flex items-center gap-2.5">
          <span className="text-gold text-sm select-none">↩</span>
          <div>
            <p className="text-[11px] text-gold font-display tracking-wide">Expedition Resumed</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {sets.length} set{sets.length === 1 ? "" : "s"} restored from your last session
            </p>
          </div>
        </div>
      )}

      <div className="px-4 space-y-4">
        {/* Shards earned */}
        <div
          className="border-rune p-4 flex items-center justify-between relative"
          style={{ background: "linear-gradient(135deg, rgba(123,94,167,0.15), rgba(201,168,76,0.06))" }}
        >
          {floaters.map(f => (
            <div key={f.id} className="shard-float text-sm" style={{ bottom: "100%" }}>
              +{f.val} ✦
            </div>
          ))}
          <div>
            <p className="font-display text-2xl text-gold text-glow">+{totalShards} ✦</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Shards earned · {prCount} PR{prCount === 1 ? "" : "s"}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-purple-bright">×{mult.toFixed(2)} multiplier</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{core.name} Core active</p>
          </div>
        </div>

        {/* Cohort expedition live panel */}
        {session && (
          <div className="bg-surface-2 border border-purple-bright/40 px-3.5 py-2.5 space-y-2">
            {/* Header */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-[0.15em] text-purple-bright">
                ⚔ {session.cohortName} Expedition
              </p>
              {session.pendingMembers.length > 0 && (
                <p className="text-[9px] text-muted-foreground">
                  {session.pendingMembers.length} pending invite{session.pendingMembers.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>

            {/* Per-member shard rows */}
            <div className="space-y-1.5">
              {/* Current user */}
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-gold">
                  {currentUser}
                  <span className="text-[9px] text-muted-foreground ml-1">(you)</span>
                  {exitRequested && <span className="text-[9px] text-destructive ml-1">· wants to end</span>}
                </p>
                <p className="font-display text-sm text-gold">+{totalShards} ✦</p>
              </div>
              {/* Other accepted members */}
              {session.acceptedMembers.filter(m => m !== currentUser).map(m => {
                const earned    = cohortMemberShards[m] ?? 0;
                const wantsExit = session.exitRequests.includes(m);
                return (
                  <div key={m} className="flex items-center justify-between">
                    <p className="text-[11px] text-foreground/80">
                      {m}
                      {wantsExit && <span className="text-[9px] text-destructive ml-1">· wants to end</span>}
                    </p>
                    <p className="font-display text-sm text-purple-bright">+{earned} ✦</p>
                  </div>
                );
              })}
              {/* Pending members (greyed out) */}
              {session.pendingMembers.map(m => (
                <div key={m} className="flex items-center justify-between opacity-40">
                  <p className="text-[11px] text-muted-foreground">{m} <span className="text-[9px]">· invited</span></p>
                  <p className="text-[11px] text-muted-foreground">— ✦</p>
                </div>
              ))}
            </div>

            {/* Exit controls */}
            <div className="pt-1 border-t border-rune">
              {!exitRequested ? (
                <button
                  onClick={() => {
                    if (!sessionId || !currentUser) return;
                    requestCohortExit(sessionId, currentUser);
                    setExitRequested(true);
                  }}
                  className="w-full py-1.5 border border-destructive/40 text-[10px] font-display tracking-[0.12em] text-destructive hover:bg-destructive/10 transition-colors"
                >
                  REQUEST TO END EXPEDITION
                </button>
              ) : (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-muted-foreground text-center">
                    Waiting for {session.acceptedMembers.filter(m => m !== currentUser && !session.exitRequests.includes(m)).join(", ")} to agree…
                  </p>
                  <button
                    onClick={() => {
                      if (!sessionId || !currentUser) return;
                      cancelCohortExitRequest(sessionId, currentUser);
                      setExitRequested(false);
                    }}
                    className="w-full py-1.5 border border-rune text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Active bonuses */}
        {bonusChips.length > 0 && (
          <div className="bg-surface-2 border-rune px-3.5 py-2.5 flex flex-wrap gap-1.5">
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground w-full mb-1">Active Bonuses</p>
            {bonusChips.map((chip, i) => (
              <span
                key={i}
                className={`px-2 py-0.5 text-[10px] border ${
                  chip.kind === "gold"
                    ? "bg-gold/10 border-gold/30 text-gold"
                    : chip.kind === "purple"
                    ? "bg-purple-bright/10 border-purple-bright/30 text-purple-bright"
                    : chip.kind === "red"
                    ? "bg-destructive/10 border-destructive/30 text-destructive"
                    : "bg-surface-3 border-rune text-foreground/70"
                }`}
              >
                {chip.label}
              </span>
            ))}
          </div>
        )}

        {/* Day pills — presets + custom days + creator */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
          {/* Preset days */}
          {DAYS.map(d => (
            <button
              key={d}
              onClick={() => { setDay(d); setShowCustomInput(false); }}
              className={`px-4 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all ${
                day === d ? "bg-gold/15 border-gold text-gold" : "bg-surface-2 border-rune text-muted-foreground"
              }`}
            >
              {d}
            </button>
          ))}

          {/* Custom days */}
          {state.customDays.map(d => (
            <button
              key={d}
              onClick={() => { setDay(d); setShowCustomInput(false); }}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all flex items-center gap-1.5 ${
                day === d
                  ? "bg-purple-bright/15 border-purple-bright text-purple-bright"
                  : "bg-surface-2 border-purple-bright/30 text-muted-foreground hover:border-purple-bright/60"
              }`}
            >
              {d}
              {/* Delete button — only visible on the active custom day */}
              {day === d && (
                <span
                  role="button"
                  aria-label={`Delete ${d}`}
                  onClick={e => {
                    e.stopPropagation();
                    removeCustomDay(d);
                    setDay(DAYS[0]);
                  }}
                  className="text-[10px] opacity-50 hover:opacity-100 transition-opacity leading-none"
                >
                  ×
                </span>
              )}
            </button>
          ))}

          {/* Add custom day button */}
          <button
            onClick={() => { setShowCustomInput(v => !v); setCustomDayInput(""); }}
            className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition-all ${
              showCustomInput
                ? "bg-purple-bright/15 border-purple-bright text-purple-bright"
                : "bg-surface-2 border-purple-bright/30 text-purple-bright/70 hover:border-purple-bright/60 hover:text-purple-bright"
            }`}
          >
            + Custom
          </button>
        </div>

        {/* Custom day creator — inline, appears below pills */}
        {showCustomInput && (
          <div className="bg-surface-2 border border-purple-bright/30 p-3 flex gap-2 items-center">
            <input
              autoFocus
              value={customDayInput}
              onChange={e => setCustomDayInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  const name = customDayInput.trim();
                  if (name && !DAYS.includes(name) && !state.customDays.includes(name)) {
                    addCustomDay(name);
                    setDay(name);
                    setShowCustomInput(false);
                    setCustomDayInput("");
                  }
                }
                if (e.key === "Escape") { setShowCustomInput(false); setCustomDayInput(""); }
              }}
              placeholder="Day name (e.g. Bro Split, PPL A…)"
              maxLength={28}
              className="flex-1 bg-surface-3 border border-rune px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-purple-bright/50"
            />
            <button
              onClick={() => {
                const name = customDayInput.trim();
                if (name && !DAYS.includes(name) && !state.customDays.includes(name)) {
                  addCustomDay(name);
                  setDay(name);
                }
                setShowCustomInput(false);
                setCustomDayInput("");
              }}
              disabled={!customDayInput.trim()}
              className="px-3 py-1.5 text-xs font-display tracking-[0.12em] bg-purple-bright/20 border border-purple-bright/50 text-purple-bright disabled:opacity-30 hover:bg-purple-bright/30 transition-all"
            >
              CREATE
            </button>
            <button
              onClick={() => { setShowCustomInput(false); setCustomDayInput(""); }}
              className="text-muted-foreground text-xs hover:text-foreground transition-colors px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Last session of this day type */}
        {(() => {
          const last = state.workouts.find(w => w.day === day && !w.id.startsWith("dev-"));
          if (!last) return null;
          const date = new Date(last.date);
          const label = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
          const exMap: Record<string, { muscle: string; sets: SetLog[] }> = {};
          for (const s of last.sets) {
            if (!exMap[s.exercise]) exMap[s.exercise] = { muscle: s.muscle, sets: [] };
            exMap[s.exercise].sets.push(s);
          }
          return (
            <div className="border-rune bg-surface-2">
              <div className="px-3.5 py-2 flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Last {day} · {label}</p>
                <p className="text-[10px] text-gold">✦ {last.shardsEarned}</p>
              </div>
              <div className="px-3.5 pb-3 space-y-2">
                {Object.entries(exMap).map(([ex, info]) => (
                  <div key={ex}>
                    <div className="flex items-baseline justify-between mb-1">
                      <p className="text-xs text-foreground/80">{ex}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{info.muscle}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {info.sets.map((s, i) => (
                        <span key={i} className="px-2 py-0.5 text-[10px] bg-surface-3 text-muted-foreground border border-rune">
                          {s.weight}kg × {s.reps}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Logged sets */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-2">Logged Sets</p>
          {Object.entries(grouped).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              No sets yet. Add an exercise below.
            </p>
          )}
          {Object.entries(grouped).map(([ex, info]) => (
            <div key={ex} className="bg-surface-2 border-rune mb-2.5">
              <div className="px-3.5 py-2.5 flex justify-between items-center">
                <div>
                  <p className="text-sm">{ex}</p>
                  <p className="text-[10px] text-muted-foreground tracking-[0.1em] uppercase mt-0.5">{info.muscle}</p>
                </div>
                <p className="text-xs text-gold">✦ {info.total}</p>
              </div>
              <div className="px-3.5 pb-3 flex gap-2 flex-wrap">
                {info.sets.map((s, i) => (
                  <div
                    key={i}
                    className={`px-2.5 py-1 text-[11px] ${
                      s.isPR
                        ? "border border-gold text-gold bg-gold/5"
                        : "bg-surface-3 text-muted-foreground"
                    }`}
                  >
                    {s.weight}kg{(ctx.bonusWeightByMuscle[s.muscle] ?? 0) > 0 && <span className="text-purple-bright"> +{ctx.bonusWeightByMuscle[s.muscle]}kg/rep</span>} × {s.reps}{s.isPR && " ✦ PR"}
                  </div>
                ))}
              </div>
            </div>
          ))}

          {showAdd ? (
            <div className="bg-surface-2 border-rune p-3.5 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={muscle}
                  onChange={e => {
                    const m = e.target.value as MuscleGroup;
                    setMuscle(m);
                    setExercise(EXERCISES[m][0]);
                    setWeight(""); setAddWeight(false); setExtraWeight("");
                  }}
                  className="bg-surface-3 border-rune px-3 py-2 text-sm"
                >
                  {MUSCLE_GROUPS.map(m => <option key={m}>{m}</option>)}
                </select>
                <select
                  value={exercise}
                  onChange={e => {
                    setExercise(e.target.value);
                    setWeight(""); setAddWeight(false); setExtraWeight("");
                  }}
                  className="bg-surface-3 border-rune px-3 py-2 text-sm"
                >
                  {EXERCISES[muscle].map(ex => (
                    <option key={ex} value={ex}>{ex}{UNILATERAL_EXERCISES.has(ex) ? " (single)" : ""}</option>
                  ))}
                </select>
              </div>
              {BODYWEIGHT_EXERCISES.has(exercise) ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer select-none whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={addWeight}
                        onChange={e => { setAddWeight(e.target.checked); setExtraWeight(""); }}
                        className="accent-gold"
                      />
                      Add weight
                    </label>
                    {addWeight ? (
                      <input
                        type="number"
                        inputMode="decimal"
                        placeholder="+kg"
                        value={extraWeight}
                        onChange={e => setExtraWeight(e.target.value)}
                        className="flex-1 bg-surface-3 border-rune px-3 py-2 text-sm"
                      />
                    ) : (
                      <span className="text-[11px] text-muted-foreground">{bodyWeight}kg bodyweight</span>
                    )}
                  </div>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Reps"
                    value={reps}
                    onChange={e => setReps(e.target.value)}
                    className="w-full bg-surface-3 border-rune px-3 py-2 text-sm"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    inputMode="decimal"
                    placeholder="Weight (kg)"
                    value={weight}
                    onChange={e => setWeight(e.target.value)}
                    className="bg-surface-3 border-rune px-3 py-2 text-sm"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="Reps"
                    value={reps}
                    onChange={e => setReps(e.target.value)}
                    className="bg-surface-3 border-rune px-3 py-2 text-sm"
                  />
                </div>
              )}
              {reps && (BODYWEIGHT_EXERCISES.has(exercise) || weight) && (
                <div className="text-[10px] text-muted-foreground px-1">
                  {(() => {
                    const isBW = BODYWEIGHT_EXERCISES.has(exercise);
                    const effectiveWeight = isBW ? bodyWeight + Number(extraWeight || 0) : Number(weight);
                    const weightBaseline2 = state.baselines[exercise];
                    const repBaseline2 = state.repBaselines?.[exercise];
                    const isPR = weightBaseline2 !== undefined && (
                      effectiveWeight > weightBaseline2 ||
                      (effectiveWeight >= weightBaseline2 && repBaseline2 !== undefined && Number(reps) >= repBaseline2 + 2)
                    );
                    const nm1Weight2 = state.firstNightmareSets?.find(s => s.exercise === exercise)?.weight
                      ?? state.baselines[exercise]
                      ?? effectiveWeight;
                    const preview = calcShards(
                      { exercise, muscle, weight: effectiveWeight, reps: Number(reps) },
                      nm1Weight2, mult, ctx, state.aspect, isPR
                    );
                    return <span>Preview: <span className="text-gold">+{Math.floor(preview + shardCarry.current)} ✦</span>{isPR ? " · PR!" : ""}</span>;
                  })()}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowAdd(false)}
                  className="flex-1 py-2 text-xs text-muted-foreground border border-rune"
                >
                  Cancel
                </button>
                <button
                  onClick={addSet}
                  className="flex-1 bg-gradient-to-br from-gold-dim to-gold text-background font-display py-2 text-xs tracking-[0.15em]"
                >
                  SLAY
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAdd(true)}
              className="w-full py-3.5 text-sm text-gold border border-dashed border-gold/40"
            >
              + Add Exercise
            </button>
          )}
        </div>

        {sets.length > 0 && (
          session ? (
            // In a cohort expedition — use the exit-request flow in the live panel above.
            // The "RETURN FROM THE REALM" button is replaced by cohort-aware controls.
            !exitRequested ? (
              <button
                onClick={() => {
                  if (!sessionId || !currentUser) return;
                  // If solo (everyone else declined/no accepted members), finish directly
                  if (session.acceptedMembers.length <= 1) {
                    if (!hasFinished.current) { hasFinished.current = true; deleteCohortExpeditionSession(sessionId); finish(); }
                    return;
                  }
                  requestCohortExit(sessionId, currentUser);
                  setExitRequested(true);
                }}
                className="w-full bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-3.5"
              >
                RETURN FROM THE REALM
              </button>
            ) : (
              <div className="w-full py-3.5 border border-destructive/40 text-center">
                <p className="font-display text-xs tracking-[0.15em] text-destructive">WAITING FOR COHORT TO AGREE…</p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {session.acceptedMembers.filter(m => !session.exitRequests.includes(m)).join(", ")} must agree to end
                </p>
              </div>
            )
          ) : (
            <button
              onClick={finish}
              className="w-full bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-3.5"
            >
              RETURN FROM THE REALM
            </button>
          )
        )}
      </div>

      {/* Floating rest timer button */}
      <button
        onPointerDown={handleRestPointerDown}
        onPointerUp={handleRestPointerUp}
        onPointerLeave={() => { if (longPressRef.current) clearTimeout(longPressRef.current); }}
        className="fixed z-20 flex flex-col items-center justify-center gap-0.5 select-none"
        style={{ bottom: "110px", right: "16px", width: "52px", height: "52px", borderRadius: "50%", background: "rgba(10,10,14,0.92)", border: "1px solid rgba(201,168,76,0.35)", boxShadow: "0 0 12px rgba(201,168,76,0.15)" }}
      >
        <span style={{ fontSize: "18px", lineHeight: 1 }}>⏱</span>
        {restDuration && (
          <span style={{ fontSize: "9px", color: "rgba(201,168,76,0.7)", letterSpacing: "0.05em" }}>
            {fmtTime(restDuration)}
          </span>
        )}
      </button>

      {/* Full-screen timer overlay */}
      {(timerActive || timerDone) && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center cursor-pointer select-none"
          style={{ background: "rgba(4,4,6,0.97)" }}
          onClick={endTimer}
        >
          {timerDone ? (
            <>
              <p className="font-display text-2xl text-gold tracking-[0.3em] text-glow-strong mb-3">REST OVER</p>
              <p className="text-sm text-muted-foreground">Tap to continue</p>
            </>
          ) : (
            <>
              <p className="text-[11px] uppercase tracking-[0.4em] text-muted-foreground mb-6">Rest Timer</p>
              <p className="font-display text-gold text-glow-strong" style={{ fontSize: "96px", lineHeight: 1 }}>
                {fmtTime(timerRemaining)}
              </p>
              <p className="text-sm text-muted-foreground mt-8">Tap to dismiss early</p>
            </>
          )}
        </div>
      )}

      {/* Set duration modal */}
      {showSetTimer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(4,4,6,0.88)" }}>
          <div className="bg-surface-2 border-rune p-5 w-full max-w-xs">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">Set Rest Duration</p>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {REST_PRESETS.map(s => (
                <button
                  key={s}
                  onClick={() => setTempDuration(String(s))}
                  className={`py-2 text-sm font-display tracking-wider border ${
                    tempDuration === String(s)
                      ? "border-gold text-gold bg-gold/10"
                      : "border-rune text-muted-foreground bg-surface-3"
                  }`}
                >
                  {fmtTime(s)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 mb-4">
              <input
                type="number"
                inputMode="numeric"
                placeholder="Custom (seconds)"
                value={tempDuration}
                onChange={e => setTempDuration(e.target.value)}
                className="flex-1 bg-surface-3 border-rune px-3 py-2 text-sm"
              />
              <span className="text-xs text-muted-foreground">sec</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSetTimer(false)}
                className="flex-1 py-2 text-xs text-muted-foreground border border-rune"
              >
                Cancel
              </button>
              <button
                onClick={confirmDuration}
                className="flex-1 bg-gradient-to-br from-gold-dim to-gold text-background font-display py-2 text-xs tracking-[0.15em]"
              >
                START
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}

function AwakeningScreen({
  name, drops, onContinue,
}: {
  name: string; drops: Memory[]; onContinue: () => void;
}) {
  return (
    <div className="min-h-screen px-6 py-12 max-w-md mx-auto flex flex-col items-center text-center">
      <p className="text-[10px] uppercase tracking-[0.5em] text-gold mb-6">Rank Attained</p>

      <h1 className="font-display text-3xl text-gold text-glow-strong mb-4 leading-snug">
        You have Awakened.
      </h1>
      <p className="text-sm text-muted-foreground mb-10 leading-relaxed max-w-xs">
        Five expeditions into the dream realm, {name}. The shadow stirs within you.
        You are no longer merely a dreamer — the Nightmare has taken notice.
      </p>

      <div className="w-full space-y-3 mb-8">
        <div
          className="p-5 text-left border-l-2 border-l-gold"
          style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.10), rgba(201,168,76,0.02))" }}
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-gold mb-1">Rank · Awakened</p>
          <p className="text-sm text-foreground/80 leading-relaxed">
            Your soul has been recognized by the Nightmare. The path ahead grows darker —
            and with darkness comes power. Continue your expeditions and face the next trial when you are ready.
          </p>
        </div>

        <div className="bg-surface-2 border-rune p-4 text-left">
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">What's Next</p>
          <p className="text-xs text-foreground/70 leading-relaxed">
            Return to the Dreamrealm and challenge further Nightmares to ascend beyond Awakened.
            Each nightmare conquered forges your Aspect — and your destiny.
          </p>
        </div>
      </div>

      {drops.length > 0 && (
        <div className="w-full mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent mb-3">Memories Obtained</p>
          <div className="space-y-2">
            {drops.map(m => (
              <div key={m.id} className="bg-surface-2 border-rune p-3 flex justify-between items-center">
                <div>
                  <p className={`font-display text-sm ${RANK_COLOR[m.rank]}`}>{m.name}</p>
                  <p className={`text-[10px] tracking-wider mt-0.5 ${RANK_COLOR[m.rank]}`}>{m.rank} · Tier {m.tier}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{m.attribute}</p>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-4"
      >
        EMBRACE THE SPELL
      </button>
    </div>
  );
}

function ResultsScreen({
  result,
  onContinue,
}: {
  result: ExpeditionResult;
  onContinue: () => void;
}) {
  const article = /^[AEIOU]/i.test(result.newRankLabel ?? "") ? "an" : "a";
  return (
    <div className="min-h-screen px-5 py-10 max-w-md mx-auto flex flex-col pb-12">
      {/* Header */}
      <p className="text-[10px] uppercase tracking-[0.5em] text-muted-foreground text-center mb-1">
        {ordinal(result.expeditionNumber)} Expedition
      </p>
      <h1 className="font-display text-2xl text-gold text-glow text-center mb-7">
        EXPEDITION COMPLETE
      </h1>

      {/* Stats row */}
      <div
        className="border-rune p-4 mb-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, rgba(123,94,167,0.12), rgba(201,168,76,0.06))" }}
      >
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Shards Earned</p>
          <p className="font-display text-2xl text-gold text-glow">+{result.total} ✦</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Duration</p>
          <p className="font-display text-lg text-foreground">{fmtDuration(result.duration)}</p>
        </div>
      </div>

      {/* Core evolution */}
      {result.coreEvolved && result.newRankLabel && (
        <div
          className="border border-gold/50 p-4 mb-4 text-center"
          style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.12), rgba(201,168,76,0.03))" }}
        >
          <p className="text-[10px] uppercase tracking-[0.4em] text-gold mb-2">Core Evolved</p>
          <p className="font-display text-lg text-gold text-glow leading-snug">
            You are now {article} {result.newRankLabel}
          </p>
        </div>
      )}

      {/* Memories */}
      {result.drops.length > 0 ? (
        <div className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent mb-3">
            {result.drops.length === 1 ? "Memory Recovered" : `${result.drops.length} Memories Recovered`}
          </p>
          <div className="space-y-3">
            {result.drops.map((d, i) => (
              <div key={i} className="border-rune bg-surface-2 p-3">
                <div className="flex items-baseline justify-between mb-1">
                  <div>
                    <p className={`font-display text-sm ${RANK_COLOR[d.memory.rank]}`}>{d.memory.name}</p>
                    <p className={`text-[10px] tracking-wider ${RANK_COLOR[d.memory.rank]}`}>
                      {d.memory.rank} · Tier {d.memory.tier}
                    </p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{d.memory.type}</span>
                </div>
                <p className="text-xs text-purple-bright mt-1">{d.memory.attribute}</p>
                <p className="text-[11px] text-muted-foreground italic mt-1">"{d.memory.flavor}"</p>
                <p className="text-[10px] text-muted-foreground/50 mt-2 tracking-wider uppercase">
                  from {d.source}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-surface-2 border-rune p-4 mb-6 text-center">
          <p className="text-xs text-muted-foreground">No memories recovered this expedition.</p>
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-4 mt-auto"
      >
        RETURN HOME
      </button>
    </div>
  );
}
