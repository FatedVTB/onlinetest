import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useLocation,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useGame } from "@/lib/store";
import {
  currentCoreInfo, computeRank, RANKS, CORES, EXERCISES, MUSCLE_GROUPS,
  type Rank, type Aspect, type Flaw, type SetLog,
} from "@/lib/game";
import { rollGuaranteedMemoryDrop } from "@/lib/memories";

import appCss from "../styles.css?url";

// Rainbow arc: orbs spread across the top half, peaking at the centre like a rainbow.
// x goes 5 % → 95 %, y follows an inverted parabola so the middle orb sits highest.
function getArcPositions(count: number): Array<{ x: number; y: number }> {
  if (count === 1) return [{ x: 50, y: 14 }];
  return Array.from({ length: count }, (_, i) => {
    const t = i / (count - 1);          // 0 → 1 left to right
    const x = 5 + t * 90;              // 5 % → 95 % horizontal
    const u = 2 * t - 1;               // −1 → 1  (0 at centre)
    const y = 12 + 26 * u * u;         // 12 % at peak, ~38 % at edges
    return { x, y };
  });
}

function OrbBackground() {
  const { pathname } = useLocation();
  const { state } = useGame();

  // Orbs are only visible on the Soul page
  if (pathname !== "/soul") return null;

  const core      = currentCoreInfo(state.totalShards);
  const rank      = computeRank(state.nightmaresPassed, state.workouts.length);

  const orbCount  = Math.min(core.completed + 1, 7);
  const rankIndex = Math.max(0, RANKS.indexOf(rank));
  const positions = getArcPositions(orbCount);

  // Scale everything linearly from Sleeper (0) → Divine (7)
  const t          = rankIndex / 7;
  const diameter   = 55  + t * 145;   // 55 px → 200 px
  const innerOp    = 0.18 + t * 0.70; // 0.18 → 0.88
  const midOp      = 0.07 + t * 0.32; // 0.07 → 0.39
  const outerOp    = 0.03 + t * 0.15; // 0.03 → 0.18
  const glowRadius = 50  + t * 140;   // 50 px → 190 px

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
      aria-hidden
    >
      {positions.map((pos, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: `${pos.x}%`,
            top:  `${pos.y}%`,
            width:  `${diameter}px`,
            height: `${diameter}px`,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: `radial-gradient(circle at center,
              rgba(255, 255, 255, ${innerOp}) 0%,
              rgba(220, 228, 255, ${midOp})   42%,
              rgba(170, 185, 255, ${outerOp}) 70%,
              transparent 100%)`,
            boxShadow: `
              0 0 ${glowRadius}px      ${glowRadius * 0.45}px rgba(200, 215, 255, ${outerOp * 1.7}),
              0 0 ${glowRadius * 2}px  ${glowRadius * 0.9}px  rgba(140, 160, 255, ${outerOp * 0.55})
            `,
            animation: `sun-breathe ${8 + i * 2.3}s ease-in-out ${-i * 1.5}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ── Dev cheat menu (visible only when profile name === "Dev") ──────────────

const RANK_NM: Record<Rank, number> = {
  Sleeper: 0, Dormant: 1, Awakened: 1,
  Ascended: 2, Transcended: 3, Supreme: 4, Sacred: 5, Divine: 6,
};

// Cumulative shard thresholds to enter each core tier
const CORE_SHARDS: Record<string, number> = {
  Beast: 0, Monster: 1000, Demon: 3000, Devil: 6000,
  Tyrant: 10000, Terror: 15000, Titan: 21000,
};

const DEV_ASPECT: Aspect = {
  name: "Shadow's Architect",
  description: "Dev aspect — +50% shards on all exercises.",
  rank: "Divine",
  exercise: EXERCISES.Chest[0],
  bonusKind: "pct",
  bonusValue: 50,
};

const DEV_FLAW: Flaw = {
  name: "Glass Canon",
  description: "Dev flaw — no real penalty.",
  effect: {},
};

const DEV_FIRST_NM_SETS: SetLog[] = MUSCLE_GROUPS.map(muscle => ({
  muscle,
  exercise: EXERCISES[muscle][0],
  weight: 60,
  reps: 10,
}));

function DevMenu() {
  const { state, devOverride } = useGame();
  const [open, setOpen] = useState(false);

  if (state.profile?.name !== "Dev") return null;

  const currentRank     = computeRank(state.nightmaresPassed, state.workouts.length);
  const currentCore     = currentCoreInfo(state.totalShards);
  const currentCoreName = currentCore.name.replace(" (Max)", "");

  function applyRank(rank: Rank) {
    const nm      = RANK_NM[rank];
    const patches: Parameters<typeof devOverride>[0] = { nightmaresPassed: nm };

    // Awakened requires ≥ 10 workouts — pad with empty dev entries
    if (rank === "Awakened" && state.workouts.length < 10) {
      patches.workouts = [
        ...Array.from({ length: 10 - state.workouts.length }, (_, i) => ({
          id: `dev-pad-${i}`,
          date: Date.now() - i * 86400000,
          day: "Full Body",
          sets: [] as SetLog[],
          shardsEarned: 0,
        })),
        ...state.workouts,
      ];
    }

    // If no aspect yet, inject dev defaults so the dashboard renders
    if (nm > 0 && !state.aspect) {
      patches.aspect             = DEV_ASPECT;
      patches.flaw               = DEV_FLAW;
      patches.firstNightmareSets = DEV_FIRST_NM_SETS;
    }

    devOverride(patches);
  }

  function applyCore(name: string) {
    devOverride({ totalShards: CORE_SHARDS[name] ?? 0 });
  }

  return (
    <div className="fixed bottom-20 right-3 z-[200]">
      {open && (
        <div className="mb-2 w-52 border border-yellow-400/50 bg-surface-2 p-3 shadow-2xl">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-widest text-yellow-400">
              ⚙ Dev Panel
            </span>
            <button
              onClick={() => setOpen(false)}
              className="text-xs leading-none text-muted-foreground hover:text-foreground"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <p className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                Rank <span className="text-yellow-400/70">({currentRank})</span>
              </p>
              <select
                value={currentRank}
                onChange={e => applyRank(e.target.value as Rank)}
                className="w-full border border-yellow-400/30 bg-surface-3 px-2 py-1.5 text-xs text-foreground"
              >
                {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            <div>
              <p className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                Core <span className="text-yellow-400/70">({currentCoreName})</span>
              </p>
              <select
                value={currentCoreName}
                onChange={e => applyCore(e.target.value)}
                className="w-full border border-yellow-400/30 bg-surface-3 px-2 py-1.5 text-xs text-foreground"
              >
                {CORES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-3 space-y-1.5">
            <p className="mb-1 text-[9px] uppercase tracking-wider text-muted-foreground">
              Memories <span className="text-yellow-400/70">({state.memories.length})</span>
            </p>
            <button
              onClick={() => {
                const m = rollGuaranteedMemoryDrop(false);
                devOverride({ memories: [m, ...state.memories] });
              }}
              className="w-full border border-yellow-400/30 bg-surface-3 px-2 py-1.5 text-xs text-yellow-400 hover:bg-yellow-400/10 transition-colors text-left"
            >
              + Roll random memory
            </button>
            <button
              onClick={() => devOverride({ memories: [], equippedMemoryIds: [] })}
              className="w-full border border-yellow-400/20 bg-surface-3 px-2 py-1.5 text-xs text-muted-foreground hover:text-yellow-400/70 hover:border-yellow-400/30 transition-colors text-left"
            >
              ✕ Clear all memories
            </button>
          </div>

          <p className="mt-3 text-[8px] leading-relaxed text-muted-foreground opacity-50">
            Core sets total shards to tier threshold. Changes are instant &amp; saved.
          </p>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        className="ml-auto block border border-yellow-400/40 bg-yellow-400/10 px-2.5 py-1 font-mono text-[10px] tracking-wider text-yellow-400 hover:bg-yellow-400/20 transition-colors"
      >
        {open ? "✕ DEV" : "⚙ DEV"}
      </button>
    </div>
  );
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Workout Game Demo" },
      { name: "description", content: "WIP Very Early Days Testing" },
      { name: "author", content: "Lovable" },
      { property: "og:title", content: "Workout Game Demo" },
      { property: "og:description", content: "WIP Very Early Days Testing" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:site", content: "@Lovable" },
      { name: "twitter:title", content: "Workout Game Demo" },
      { name: "twitter:description", content: "WIP Very Early Days Testing" },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a101165d-e541-4b15-9ce5-517878aaaacd/id-preview-2d03f31d--77a3e429-e5b1-4549-871c-f29c0688031d.lovable.app-1778467197147.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/a101165d-e541-4b15-9ce5-517878aaaacd/id-preview-2d03f31d--77a3e429-e5b1-4549-871c-f29c0688031d.lovable.app-1778467197147.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cinzel:wght@400;500;700&family=Raleway:wght@300;400;500;600&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <OrbBackground />
      {/* z-index: 1 keeps all page content above the orb layer (z: 0) */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <Outlet />
      </div>
      <DevMenu />
    </QueryClientProvider>
  );
}
