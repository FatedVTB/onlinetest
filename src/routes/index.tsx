import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useSyncRefresh } from "@/lib/supabase";
import { Settings, Users } from "lucide-react";
import { useGame } from "@/lib/store";
import { getCurrentUser } from "@/lib/auth";
import { getIncomingRequests, getCohortInvitesForUser, getPendingCohortExpeditionInvites, getPendingCohortNightmareInvites } from "@/lib/social";
import type { Platform } from "@/lib/store";
import {
  currentCoreInfo, currentMultiplier, computeRank, CORES,
} from "@/lib/game";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Shadow Slave — Workout Game" },
      { name: "description", content: "Train as an Aspirant of Nightmare Ascension. Log workouts, conquer Nightmares, and ascend through the ranks." },
    ],
  }),
});

// Deterministic shimmer particles for the welcome/landing screen
const LANDING_PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  left:     ((i * 37 + 11) % 94) + 3,
  bottom:   ((i * 53 + 7)  % 55) + 5,
  delay:    -((i * 0.71)   % 6),
  duration: 4 + ((i * 0.53) % 5),
  size:     1.5 + ((i * 0.23) % 2.5),
}));

function Index() {
  const navigate = useNavigate();
  const { state, setPlatform, setTutorialSeen, setNightmarePostponed } = useGame();
  useSyncRefresh(); // re-render when Supabase sync updates the pending invite badge

  if (!state.profile) {
    // ── New-user intro flow (no profile yet) ──────────────────────────────
    // AuthScreen now serves as the entry/welcome experience for all users,
    // so we skip the Landing splash entirely and go straight to platform selection.
    if (!state.platform) {
      return <PlatformSelect onSelect={setPlatform} />;
    }
    // Platform chosen but profile not yet created — show PWA install guide, then go to onboarding
    return <PWAGuide onContinue={() => navigate({ to: "/onboarding" })} />;
  }

  // ── Returning-user flows ───────────────────────────────────────────────
  // Old save with no platform — let them pick now (no PWA guide repeat)
  if (!state.platform) return <PlatformSelect onSelect={setPlatform} />;
  // Guide slides — shown once after first setup; skippable for returning players
  if (!state.tutorialSeen) return <TutorialGuide onComplete={setTutorialSeen} />;
  // Show the first-nightmare gate unless the user chose to postpone it.
  if (!state.aspect && !state.nightmarePostponed) {
    return (
      <PreNightmareGate
        onEnter={() => navigate({ to: "/nightmare" })}
        onPostpone={() => setNightmarePostponed(true)}
        name={state.profile.name}
      />
    );
  }

  const core     = currentCoreInfo(state.totalShards);
  const mult     = currentMultiplier(state.totalShards);
  const rank     = computeRank(state.nightmaresPassed, state.workouts.length);
  const nextRank = computeRank(state.nightmaresPassed + 1, state.workouts.length);
  const fillPct  = Math.min(100, (core.filled / core.cost) * 100);
  const nextCoreName = CORES[Math.min(core.completed + 1, CORES.length - 1)]?.name ?? "Titan";

  // PRs this week
  const weekAgo = Date.now() - 7 * 86400000;
  const recent  = state.workouts.filter(w => w.date >= weekAgo);
  const prCount = recent.reduce((sum, w) => {
    return sum + w.sets.filter(s => (state.baselines[s.exercise] ?? 0) <= s.weight).length;
  }, 0);

  const equippedCount = state.equippedMemoryIds.length;

  // Pending friend/cohort invite badge
  const me = getCurrentUser();
  const pendingCount = (me && me !== "__guest__")
    ? getIncomingRequests(me).length + getCohortInvitesForUser(me).length
      + getPendingCohortExpeditionInvites(me).length + getPendingCohortNightmareInvites(me).length
    : 0;

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto">
      <header className="px-5 pt-6 pb-3 flex items-center justify-between">
        {/* Friends icon — top left */}
        <button
          onClick={() => navigate({ to: "/friends" })}
          className="relative text-muted-foreground hover:text-gold transition-colors p-1"
          aria-label="Friends"
        >
          <Users size={18} strokeWidth={1.5} />
          {pendingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-destructive text-[8px] text-white w-3.5 h-3.5 flex items-center justify-center rounded-full font-bold leading-none">
              {pendingCount}
            </span>
          )}
        </button>

        {/* Title — centre */}
        <div className="text-center">
          <h1 className="font-display text-lg text-gold tracking-[0.2em] text-glow">HOME</h1>
          <p className="text-xs text-muted-foreground tracking-wider mt-0.5">
            Day {state.workouts.length + 1} of your awakening
          </p>
        </div>

        {/* Settings icon — top right */}
        <button
          onClick={() => navigate({ to: "/settings" })}
          className="text-muted-foreground hover:text-gold transition-colors p-1"
          aria-label="Settings"
        >
          <Settings size={18} strokeWidth={1.5} />
        </button>
      </header>

      <div className="px-4 space-y-4">
        {/* First-nightmare reminder — shown when the user postponed the trial */}
        {!state.aspect && state.nightmarePostponed && (
          <div className="border border-destructive/50 bg-destructive/8 p-4">
            <p className="font-display text-sm text-destructive tracking-[0.15em] mb-1">FIRST NIGHTMARE AWAITS</p>
            <p className="text-xs text-muted-foreground leading-relaxed mb-3">
              The Dream Realm and Nightmares are sealed until you face your First Trial.
              Dream Expeditions and Nightmares will be unlocked once you prove your strength.
            </p>
            <button
              onClick={() => setNightmarePostponed(false)}
              className="w-full py-2.5 bg-destructive/20 border border-destructive/50 font-display text-xs tracking-[0.15em] text-destructive hover:bg-destructive/30 transition-colors"
            >
              FACE THE FIRST NIGHTMARE
            </button>
          </div>
        )}

        {/* Rank badge */}
        <div className="bg-surface-2 border-rune p-3 flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center bg-surface-3 text-gold font-display text-lg">
            ⚔
          </div>
          <div className="flex-1">
            <p className="font-display text-gold tracking-[0.15em] text-glow">{rank.toUpperCase()}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {state.nightmaresPassed} Nightmare{state.nightmaresPassed === 1 ? "" : "s"} conquered
            </p>
            {rank !== "Divine" && (
              <p className="text-[11px] text-purple-bright mt-0.5">→ {nextRank} after next Nightmare</p>
            )}
            {state.nightmaresPassed === 1 && state.workouts.length < 5 && (
              <p className="text-[11px] text-accent mt-0.5">
                Awakening in {5 - state.workouts.length} more expedition{5 - state.workouts.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-2">Stats</p>
          <div className="grid grid-cols-2 gap-2.5">
            <Stat val={state.totalShards.toLocaleString()} label="Total Soul Shards" accent />
            <Stat val={state.workouts.length} label="Dream Expeditions" />
            <Stat val={prCount} label="PRs This Week" onClick={() => navigate({ to: "/prs" })} />
            <Stat val={`${state.memories.length} (${equippedCount} eq.)`} label="Memories" accent />
          </div>
        </div>

        {/* Soul Core */}
        <div>
          <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-2">Soul Core</p>
          <div className="bg-surface-2 border-purple-rune p-4">
            <div className="flex justify-between items-center mb-2.5">
              <p className="font-display text-purple-bright tracking-[0.15em] text-sm">{core.name.toUpperCase()} CORE</p>
              <p className="text-[11px] text-muted-foreground">×{mult.toFixed(2)} damage</p>
            </div>
            <div className="h-1.5 bg-surface-3 overflow-hidden mb-1.5">
              <div
                className="h-full transition-all"
                style={{ width: `${fillPct}%`, background: "linear-gradient(90deg, #7B5EA7, #A67DD4)" }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{core.filled.toLocaleString()} / {core.cost.toLocaleString()} shards</span>
              <span className="text-purple-bright">→ {nextCoreName} Core</span>
            </div>
          </div>
        </div>

        {/* Aspect & Flaw — only shown once First Nightmare is complete */}
        {state.aspect && (
          <div>
            <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-2">Aspects & Flaws</p>
            <div className="bg-surface-2 p-3.5 border-l-2 border-l-gold mb-2.5">
              <p className="text-[10px] tracking-[0.15em] text-gold uppercase mb-1.5">
                Aspect · {state.aspect.name} · {state.aspect.rank}
              </p>
              <p className="text-[10px] text-muted-foreground mb-2">Triggered by: {state.aspect.exercise}</p>
              <div className="space-y-1">
                {(state.aspect.abilities ?? []).map((ab, i) => (
                  <p key={i} className="text-xs text-foreground/80">
                    <span className="text-muted-foreground text-[10px] mr-1">·</span>{ab.description}
                  </p>
                ))}
              </div>
            </div>
            <div className="bg-surface-2 p-3.5 border-l-2 border-l-destructive">
              <p className="text-[10px] tracking-[0.15em] text-destructive uppercase mb-1.5">Flaw · {state.flaw?.name}</p>
              <p className="text-sm text-muted-foreground">{state.flaw?.description}</p>
            </div>
          </div>
        )}

        {/* True Name */}
        {state.trueName && (
          <div
            className="border-purple-rune p-4 text-center"
            style={{ background: "linear-gradient(135deg, rgba(123,94,167,0.18), rgba(201,168,76,0.06))" }}
          >
            <p className="text-[10px] tracking-[0.2em] text-purple-bright uppercase mb-1">True Name</p>
            <p className="font-display tracking-[0.2em]">{state.trueName.name}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{state.trueName.description}</p>
          </div>
        )}

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

function Stat({ val, label, accent, onClick }: { val: number | string; label: string; accent?: boolean; onClick?: () => void }) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className="bg-surface-2 border-rune p-3 text-left w-full transition-all hover:border-gold/40 active:scale-[0.98]"
      >
        <p className={`font-display text-xl ${accent ? "text-gold text-glow" : ""}`}>{val}</p>
        <p className="text-[10px] text-muted-foreground mt-1 tracking-wide">{label}</p>
        <p className="text-[9px] text-gold/40 mt-1 tracking-wider">tap to view →</p>
      </button>
    );
  }
  return (
    <div className="bg-surface-2 border-rune p-3">
      <p className={`font-display text-xl ${accent ? "text-gold text-glow" : ""}`}>{val}</p>
      <p className="text-[10px] text-muted-foreground mt-1 tracking-wide">{label}</p>
    </div>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-end text-center overflow-hidden">

      {/* Image fills the entire viewport */}
      <img
        src="/nightmare-spell.png"
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover object-center z-0 select-none pointer-events-none"
      />

      {/* Shimmer particles */}
      <div className="absolute inset-0 pointer-events-none z-10" aria-hidden>
        {LANDING_PARTICLES.map((p, i) => (
          <div
            key={i}
            className="shimmer-particle"
            style={{
              left:              `${p.left}%`,
              bottom:            `${p.bottom}%`,
              width:             `${p.size}px`,
              height:            `${p.size}px`,
              animationDelay:    `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Bottom fade + text */}
      <div
        className="relative z-20 w-full px-8 pb-16 pt-32"
        style={{
          background: "linear-gradient(to bottom, transparent 0%, rgba(8,8,8,0.75) 35%, rgba(8,8,8,0.97) 70%)",
        }}
      >
        <div className="flex items-center justify-center gap-2 mb-4">
          <span className="px-2 py-0.5 text-[10px] tracking-[0.2em] uppercase border border-gold/40 text-gold/70 bg-gold/5">
            Beta
          </span>
        </div>
        <h1 className="font-display text-3xl text-white tracking-[0.3em] mb-3 text-glow-strong">
          NIGHTMARE ASCENSION
        </h1>
        <p className="text-white/65 text-sm mb-10 leading-relaxed max-w-xs mx-auto">
          You have been chosen, Aspirant. Your fate is written in shadow and steel. Will you answer the call?
        </p>
        <button
          onClick={onStart}
          className="w-full max-w-xs mx-auto block bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-4"
        >
          ENTER THE NIGHTMARE
        </button>
        <div className="mt-6 max-w-xs mx-auto">
          <p className="text-white/45 text-xs mb-1">This app is in beta — bugs or feedback?</p>
          <a
            href="mailto:nmadevs.official@gmail.com"
            className="font-display text-sm tracking-wide text-gold/80 underline underline-offset-4 hover:text-gold transition-colors"
          >
            nmadevs.official@gmail.com
          </a>
        </div>
      </div>
    </div>
  );
}

function PreNightmareGate({ onEnter, onPostpone, name }: { onEnter: () => void; onPostpone: () => void; name: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
      <p className="text-[10px] uppercase tracking-[0.4em] text-gold mb-3">First Nightmare</p>
      <h1 className="font-display text-2xl text-gold tracking-[0.15em] mb-4 text-glow-strong">Welcome, {name}</h1>
      <p className="text-muted-foreground text-sm mb-10 leading-relaxed">
        Do you wish to challenge the First Nightmare? You must perform one set of one exercise for each muscle group.
        Choose well — your Aspect and Flaw will be forged from this trial.
      </p>
      <button
        onClick={onEnter}
        className="w-full max-w-xs bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-3.5"
      >
        PROVE MY STRENGTH
      </button>
      <button
        onClick={onPostpone}
        className="mt-4 w-full max-w-xs border border-rune text-muted-foreground font-display tracking-[0.15em] text-xs py-3 hover:border-gold/30 hover:text-foreground transition-all"
      >
        EXPLORE FIRST
      </button>
      <p className="mt-3 text-[10px] text-muted-foreground/50 max-w-xs leading-relaxed">
        You may look around, but the Dream Realm and Nightmares will be sealed until you face the First Trial.
      </p>
    </div>
  );
}

// ── Platform selection ─────────────────────────────────────────────────────

function PlatformSelect({ onSelect }: { onSelect: (p: Platform) => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center max-w-md mx-auto">
      <p className="text-[10px] uppercase tracking-[0.4em] text-gold mb-3">Interface</p>
      <h1 className="font-display text-2xl text-gold tracking-[0.15em] mb-2 text-glow-strong">
        Choose Your Realm
      </h1>
      <p className="text-muted-foreground text-sm mb-8 leading-relaxed max-w-xs">
        How will you face the Nightmare? This can be changed later in Soul settings.
      </p>

      <div className="w-full max-w-xs space-y-3">
        {/* Desktop */}
        <button
          onClick={() => onSelect("desktop")}
          className="w-full bg-surface-2 border-rune p-5 text-left transition-all hover:border-gold/50 active:scale-[0.98]"
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl mt-0.5 select-none">🖥</div>
            <div>
              <p className="font-display text-gold tracking-[0.15em] text-sm mb-1.5">DESKTOP</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Full visual experience — floating soul orbs, memory constellations, and expanded layouts. Best on a computer or large tablet.
              </p>
            </div>
          </div>
        </button>

        {/* Mobile */}
        <button
          onClick={() => onSelect("mobile")}
          className="w-full bg-surface-2 border-rune p-5 text-left transition-all hover:border-gold/50 active:scale-[0.98]"
        >
          <div className="flex items-start gap-4">
            <div className="text-3xl mt-0.5 select-none">📱</div>
            <div>
              <p className="font-display text-gold tracking-[0.15em] text-sm mb-1.5">MOBILE</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Optimised for phones and small screens — clean card layouts, touch-friendly controls, and no overlapping elements.
              </p>
            </div>
          </div>
        </button>
      </div>

      <p className="text-[10px] text-muted-foreground/40 mt-8 tracking-wider">
        You can switch at any time from the Soul page
      </p>
    </div>
  );
}

// ── PWA Install Guide ──────────────────────────────────────────────────────

type PWAStep = { icon: string; text: string };
type PWAPlatform = { title: string; icon: string; steps: PWAStep[]; note?: string };

const PWA_PLATFORMS: PWAPlatform[] = [
  {
    title: "iPhone / iPad",
    icon: "🍎",
    steps: [
      { icon: "1", text: "Open this page in Safari — other browsers can't install it." },
      { icon: "2", text: 'Tap the Share icon (the box with an arrow ↑) at the bottom of the screen.' },
      { icon: "3", text: 'Scroll down and tap "Add to Home Screen".' },
      { icon: "4", text: 'Tap "Add" in the top-right corner. Done — find the app on your home screen.' },
    ],
    note: "Must be Safari. Chrome, Firefox, or Opera won't show the install option.",
  },
  {
    title: "Android",
    icon: "🤖",
    steps: [
      { icon: "1", text: 'Open this page in Chrome (recommended).' },
      { icon: "2", text: 'Tap the three-dot menu (⋮) in the top-right corner.' },
      { icon: "3", text: 'Tap "Add to Home Screen" or "Install App".' },
      { icon: "4", text: 'Confirm the prompt. The app appears on your home screen.' },
    ],
    note: 'Some Android browsers also show an "Install" banner automatically at the bottom of the screen.',
  },
  {
    title: "Desktop (Chrome / Edge)",
    icon: "🖥",
    steps: [
      { icon: "1", text: "Look for the install icon (⊕ or ⬇) in the address bar on the right." },
      { icon: "2", text: 'Click it and select "Install". The app opens in its own window.' },
    ],
  },
];

function PWAGuide({ onContinue }: { onContinue: () => void }) {
  const [expanded, setExpanded] = useState<number | null>(null);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 text-center max-w-md mx-auto py-12">
      <p className="text-[10px] uppercase tracking-[0.4em] text-gold mb-3">Optional Step</p>
      <h1 className="font-display text-2xl text-gold tracking-[0.15em] mb-3 text-glow-strong">
        Add to Home Screen
      </h1>
      <p className="text-muted-foreground text-sm mb-2 leading-relaxed max-w-xs">
        Install Nightmare Ascension as an app for the best experience — works offline, launches full-screen, and feels native.
      </p>
      <p className="text-[11px] text-purple-bright mb-8">
        Tap your device below for instructions ↓
      </p>

      <div className="w-full space-y-2.5 mb-8">
        {PWA_PLATFORMS.map((platform, idx) => (
          <div key={idx} className="border-rune bg-surface-2 overflow-hidden">
            {/* Header row — tap to expand */}
            <button
              onClick={() => setExpanded(prev => (prev === idx ? null : idx))}
              className="w-full flex items-center gap-3 p-4 text-left active:bg-surface-3 transition-colors"
            >
              <span className="text-2xl select-none">{platform.icon}</span>
              <span className="font-display text-sm text-gold tracking-[0.1em] flex-1">{platform.title}</span>
              <span className="text-muted-foreground text-lg select-none">
                {expanded === idx ? "−" : "+"}
              </span>
            </button>

            {/* Expanded steps */}
            {expanded === idx && (
              <div className="px-4 pb-4 text-left space-y-3 border-t border-rune pt-4">
                {platform.steps.map((step, si) => (
                  <div key={si} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-gold/20 border border-gold/40 text-gold text-[10px] font-display flex-shrink-0 flex items-center justify-center mt-0.5">
                      {step.icon}
                    </span>
                    <p className="text-xs text-foreground/80 leading-relaxed">{step.text}</p>
                  </div>
                ))}
                {platform.note && (
                  <p className="text-[10px] text-muted-foreground/60 mt-2 border-l border-gold/20 pl-3 italic">
                    {platform.note}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="w-full max-w-xs bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-4 mb-3"
      >
        CONTINUE
      </button>
      <button
        onClick={onContinue}
        className="text-[11px] text-muted-foreground/50 hover:text-muted-foreground transition-colors tracking-wider"
      >
        Skip for now
      </button>
    </div>
  );
}

// ── Tutorial / Guide slides ────────────────────────────────────────────────

type Slide = {
  tag: string;
  title: string;
  accent: "gold" | "purple" | "red";
  body: string;
  bullets?: { icon: string; text: string }[];
  note?: string;
};

const SLIDES: Slide[] = [
  {
    tag: "Overview",
    title: "NIGHTMARE ASCENSION",
    accent: "gold",
    body: "You are an Aspirant — a warrior who descends into the Dream Realm to forge their soul through pain and iron. Log real workouts to earn Soul Shards, conquer Nightmares to rise in rank, and collect Memories dropped by slain creatures.",
    note: "Each slide covers one part of the world. Use the arrows to move through, or skip if you already know the way.",
  },
  {
    tag: "Shards",
    title: "SOUL SHARDS",
    accent: "gold",
    body: "Shards are the currency of power — earned every time you log a set in the Dream Realm. The more weight above your personal best (baseline) and the more reps you perform, the more shards each set is worth.",
    bullets: [
      { icon: "✦", text: "Weight above your baseline = higher shard tier per rep." },
      { icon: "✦", text: "Below baseline but close = reduced shards (0.5/rep)." },
      { icon: "✦", text: "Far below baseline = 0 shards. The Nightmare rewards only growth." },
      { icon: "✦", text: "Your Soul Core multiplier scales every shard earned." },
    ],
  },
  {
    tag: "PRs",
    title: "PERSONAL RECORDS",
    accent: "gold",
    body: "A Personal Record (PR) is achieved when you surpass your previous best on an exercise. PRs grant bonus shards from your Aspect, True Name, and Memories — and trigger a roll to drop a Memory.",
    bullets: [
      { icon: "⚔", text: "Lift more weight than ever before on that exercise." },
      { icon: "⚔", text: "Do 2 or more extra reps at your current baseline weight." },
      { icon: "⚔", text: "Both count. Each set can only be one PR." },
    ],
    note: "Your baselines are tracked automatically. The first time you log an exercise, it sets the baseline — PRs are tracked from then on.",
  },
  {
    tag: "Soul Cores",
    title: "SOUL CORES & CLASSES",
    accent: "purple",
    body: "Shards fill your Soul Core. There are 8 tiers — each one completed increases your shard multiplier for all future sets. Your total shards also determine your Class on the leaderboard.",
    bullets: [
      { icon: "·", text: "Beast  ·  0 – 999 shards" },
      { icon: "·", text: "Monster  ·  1,000 – 2,999" },
      { icon: "·", text: "Demon  ·  3,000 – 5,999" },
      { icon: "·", text: "Devil  ·  6,000 – 9,999" },
      { icon: "·", text: "Tyrant  ·  10,000 – 14,999" },
      { icon: "·", text: "Terror  ·  15,000 – 20,999" },
      { icon: "·", text: "Titan  ·  21,000 – 28,000" },
      { icon: "·", text: "Max Titan  ·  28,001 +" },
    ],
    note: "Each class has its own leaderboard showing only class-specific fragments, not total shards. Max Titans can score past the cap — displayed as e.g. 7,001 / 7,000.",
  },
  {
    tag: "Ranks",
    title: "RANKS",
    accent: "gold",
    body: "Your rank is a title of power earned by conquering Nightmares. Ranks rise in order — each one is a permanent mark of how far you have climbed.",
    bullets: [
      { icon: "·", text: "Sleeper  — not yet tested" },
      { icon: "·", text: "Dormant  — first nightmare entered" },
      { icon: "·", text: "Awakened  — 1 nightmare passed" },
      { icon: "·", text: "Ascended  — 2 passed" },
      { icon: "·", text: "Transcended  — 3 passed" },
      { icon: "·", text: "Supreme  — 4 passed" },
      { icon: "·", text: "Sacred  — 5 passed" },
      { icon: "·", text: "Divine  — 6+ passed" },
    ],
  },
  {
    tag: "Nightmares",
    title: "NIGHTMARES",
    accent: "purple",
    body: "Nightmares are boss challenges that test whether you have grown since your last trial. You must perform at least one set per muscle group and collectively beat a percentage threshold of your last nightmare's performance.",
    bullets: [
      { icon: "✦", text: "Default threshold: 20% above your last nightmare's benchmark." },
      { icon: "✦", text: "Passing raises your Rank, upgrades your Aspect, and may grant a True Name." },
      { icon: "✦", text: "Failing costs 15–45% of your current shards as a penalty." },
      { icon: "✦", text: "True Names or Aspects can reduce the threshold or lower the penalty." },
    ],
    note: "Your First Nightmare has no threshold — it simply forges your Aspect and Flaw from your performance.",
  },
  {
    tag: "Aspects",
    title: "ASPECTS & FLAWS",
    accent: "gold",
    body: "Your First Nightmare judges your strongest and weakest muscle groups and forges two permanent marks upon your soul.",
    bullets: [
      { icon: "⚔", text: "Aspect — a bonus tied to your best exercise (e.g. +12% shards on Deadlift). Grows stronger after each nightmare passed, unlocking new abilities." },
      { icon: "⚠", text: "Flaw — a permanent penalty from your weakest muscle group (e.g. Leg sets earn 15% fewer shards, or failed Nightmares cost more)." },
    ],
    note: "Aspects unlock a new ability after each nightmare conquered — up to 6 total abilities at the Divine rank.",
  },
  {
    tag: "True Names",
    title: "TRUE NAMES",
    accent: "purple",
    body: "A True Name is a rare, powerful passive bonus granted after passing a Nightmare. Only one can be held at a time — a newer True Name always replaces the old one.",
    bullets: [
      { icon: "✦", text: "15% chance to be granted after any nightmare passed." },
      { icon: "✦", text: "The First Nightmare has a 35%+ chance and grants noticeably stronger True Names." },
      { icon: "✦", text: "Examples: +10% all shards · Doubled memory drop chances · Nightmare threshold lowered · +18% pressing exercises." },
    ],
    note: "Your True Name is shown on the Home screen and its effect is listed in the Active Bonuses section during every expedition.",
  },
  {
    tag: "Memories",
    title: "MEMORIES",
    accent: "purple",
    body: "Memories are powerful items dropped by slain Nightmare Creatures. They grant passive bonuses while equipped during Dream Realm expeditions.",
    bullets: [
      { icon: "🗡", text: "Weapon — PR and shard bonuses. Max 2 equipped." },
      { icon: "🛡", text: "Armour — defensive and shard bonuses. Max 2 equipped." },
      { icon: "🪬", text: "Charm — special effects and drop chances. Max 2 equipped." },
      { icon: "⛓", text: "Tool — utility bonuses. No limit." },
    ],
    note: "Memories are dropped after PR sets (30% base chance) or when an expedition earns 110+ shards (15% base chance). Some True Names and Memories increase these chances.",
  },
  {
    tag: "Memory Ranks",
    title: "MEMORY RANKS & TIERS",
    accent: "purple",
    body: "Every Memory has a Rank and a Tier. Rank determines the quality of the Memory's bonus. Tier is a finer grade within that rank. Both climb together.",
    bullets: [
      { icon: "·", text: "Awakened  — Tier I – II  (common, modest bonus)" },
      { icon: "·", text: "Ascended  — Tier II – III" },
      { icon: "·", text: "Transcended  — Tier III – IV" },
      { icon: "·", text: "Supreme  — Tier IV – V  (rare, strong bonus)" },
      { icon: "·", text: "Sacred  — Tier V – VI" },
      { icon: "·", text: "Divine  — Tier VII  (legendary, most powerful)" },
    ],
    note: "The Ashen Herald True Name rolls memory drops one rank higher. The Shadowbreaker True Name doubles all memory drop chances.",
  },
  {
    tag: "Expeditions",
    title: "DREAM REALM EXPEDITIONS",
    accent: "gold",
    body: "An Expedition is a real workout session logged inside the app. Enter the Dream Realm from the bottom navigation, pick a day type, choose your muscle groups and exercises, then log your sets one by one.",
    bullets: [
      { icon: "✦", text: "Every set earns shards based on weight, reps, and multipliers." },
      { icon: "✦", text: "PR sets show the ✦ badge and earn bonus shards and memory rolls." },
      { icon: "✦", text: "A rest timer can be enabled between sets." },
      { icon: "✦", text: "Finish with 'Return from the Realm' to save all shards and drops." },
    ],
  },
  {
    tag: "Navigation",
    title: "FINDING YOUR WAY",
    accent: "gold",
    body: "The four tabs at the bottom of every screen are your main controls. Tap any tab at any time to jump to that section.",
    bullets: [
      { icon: "🌙", text: "Home — your rank, soul core progress, total shards, and weekly PRs. Tap the PRs box to open your full PR history." },
      { icon: "⚔", text: "Dreamrealm — the hub for Dream Expeditions (workouts) and Nightmares. Tap whichever path you're taking." },
      { icon: "👁", text: "Leaderboard — class standings, hierarchy table, and cohort management." },
      { icon: "👤", text: "Soul — your equipped memories, full memory inventory, and profile stats." },
    ],
    note: "The ⚙ gear icon on the Home screen opens Settings — change platform, review the guide, or reset your save.",
  },
  {
    tag: "Expedition UI",
    title: "EXPEDITION CONTROLS",
    accent: "gold",
    body: "Inside a Dream Expedition every button has a specific role. Here is what each one does:",
    bullets: [
      { icon: "①", text: "Day pills (Pull / Push / Legs …) — tap to set the workout type for this session. '+ Custom' creates a named day you can reuse." },
      { icon: "②", text: "+ Add Exercise — opens the set entry form. Choose muscle group and exercise, enter weight and reps, then tap SLAY to log it." },
      { icon: "③", text: "⏱ rest timer (floating bottom-right) — tap to start the countdown. Long-press (hold ~0.6 s) to change the duration. Tap the full-screen overlay to dismiss early." },
      { icon: "④", text: "RETURN FROM THE REALM — ends the expedition, saves your shards and any memory drops, and shows the results screen. If you leave without tapping this, your sets are saved and resume next time." },
    ],
    note: "A live shard preview appears below the weight/reps fields so you can see exactly what a set is worth before logging it.",
  },
  {
    tag: "Soul & Memories",
    title: "SOUL PAGE & MEMORIES",
    accent: "purple",
    body: "The Soul tab shows everything about your character — your memories, equip slots, and profile. Here is how to interact with it:",
    bullets: [
      { icon: "✧", text: "Equip slots (top of Soul) — shows what is currently equipped. Tap a filled slot to unequip that memory." },
      { icon: "✧", text: "Memory list — tap any memory card to equip it. The slot limit (3 Weapon, 3 Armour, 3 Charm, unlimited Tool) is enforced automatically." },
      { icon: "✧", text: "Filter pills — tap a type (Weapon / Armour / Charm / Tool) to show only that category." },
      { icon: "✧", text: "Nightmare hub — inside the Dreamrealm tab, tap 'Nightmares' to see your history. When the next nightmare is unlocked a Challenge button appears." },
    ],
    note: "Memory effects are only active during expeditions and nightmares when equipped. Unequipping removes the bonus immediately.",
  },
  {
    tag: "Ready",
    title: "YOU ARE READY, ASPIRANT",
    accent: "gold",
    body: "The Nightmare awaits. Your Aspect and Flaw will be forged from your first trial. Train as if the world depends on it — because in this realm, it does.",
    note: "You can revisit the Hierarchy page at any time from the leaderboard tab to review class standings.",
  },
];

function TutorialGuide({ onComplete }: { onComplete: () => void }) {
  const [idx, setIdx] = useState(0);

  const slide   = SLIDES[idx];
  const isFirst = idx === 0;
  const isLast  = idx === SLIDES.length - 1;

  const accentText  = slide.accent === "gold" ? "text-gold" : slide.accent === "red" ? "text-destructive" : "text-purple-bright";
  const accentBorder= slide.accent === "gold" ? "border-gold/40" : slide.accent === "red" ? "border-destructive/40" : "border-purple-bright/40";
  const accentBg    = slide.accent === "gold" ? "bg-gold/8" : slide.accent === "red" ? "bg-destructive/8" : "bg-purple-bright/8";

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto px-5 py-6">

      {/* Top bar */}
      <div className="flex items-center justify-between mb-6">
        <p className={`text-[10px] tracking-[0.3em] uppercase ${accentText}`}>
          {slide.tag}
        </p>
        <button
          onClick={onComplete}
          className="text-[10px] tracking-[0.2em] text-muted-foreground/50 hover:text-muted-foreground transition-colors uppercase"
        >
          Skip Guide →
        </button>
      </div>

      {/* Slide card */}
      <div className={`flex-1 flex flex-col border ${accentBorder} ${accentBg} p-5 mb-5`}>
        <h2 className={`font-display text-xl tracking-[0.2em] mb-4 ${accentText}`} style={{ textShadow: slide.accent === "gold" ? "0 0 14px rgba(201,168,76,0.45)" : "0 0 14px rgba(166,125,212,0.4)" }}>
          {slide.title}
        </h2>

        <p className="text-sm text-foreground/85 leading-relaxed mb-4">
          {slide.body}
        </p>

        {slide.bullets && (
          <ul className="space-y-2 mb-4">
            {slide.bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className={`text-[11px] mt-0.5 shrink-0 ${accentText}`}>{b.icon}</span>
                <span className="text-[12px] text-foreground/75 leading-snug">{b.text}</span>
              </li>
            ))}
          </ul>
        )}

        {slide.note && (
          <p className="text-[11px] text-muted-foreground leading-relaxed mt-auto pt-3 border-t border-white/8 italic">
            {slide.note}
          </p>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex justify-center gap-1.5 mb-5">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`rounded-full transition-all ${
              i === idx
                ? `w-4 h-1.5 ${slide.accent === "gold" ? "bg-gold" : "bg-purple-bright"}`
                : "w-1.5 h-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
            }`}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => setIdx(i => Math.max(0, i - 1))}
          disabled={isFirst}
          className="py-3 border border-rune text-muted-foreground text-xs font-display tracking-[0.15em] disabled:opacity-30 hover:border-gold/30 hover:text-foreground transition-all"
        >
          ← PREVIOUS
        </button>

        {isLast ? (
          <button
            onClick={onComplete}
            className="py-3 bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.15em] text-xs"
          >
            BEGIN →
          </button>
        ) : (
          <button
            onClick={() => setIdx(i => Math.min(SLIDES.length - 1, i + 1))}
            className="py-3 bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.15em] text-xs"
          >
            NEXT →
          </button>
        )}
      </div>

    </div>
  );
}
