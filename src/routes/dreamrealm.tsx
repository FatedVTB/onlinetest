import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useGame } from "@/lib/store";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/dreamrealm")({
  component: DreamRealmHub,
  head: () => ({ meta: [{ title: "Dreamrealm — Shadow Slave" }] }),
});

function DreamRealmHub() {
  const navigate = useNavigate();
  const { state } = useGame();

  // Locked until the First Nightmare is complete
  const locked = !state.aspect;

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto flex flex-col">
      <header className="px-5 pt-6 pb-3">
        <h1 className="font-display text-lg text-gold tracking-[0.2em] text-glow">DREAMREALM</h1>
        <p className="text-xs text-muted-foreground tracking-wider mt-1">Choose your path, Aspirant</p>
      </header>

      {locked && (
        <div className="mx-4 mb-2 px-4 py-3 border border-destructive/40 bg-destructive/8">
          <p className="font-display text-xs text-destructive tracking-[0.15em] mb-0.5">SEALED</p>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Complete your First Nightmare on the Home screen to unlock the Dream Realm.
          </p>
        </div>
      )}

      <div className="px-4 flex-1 flex flex-col justify-center gap-4 -mt-12">
        <button
          disabled={locked}
          onClick={() => !locked && navigate({ to: "/expedition" })}
          className={`w-full p-6 bg-surface-2 text-left transition-all ${
            locked
              ? "border-rune opacity-40 cursor-not-allowed"
              : "border-rune hover:border-gold/40 active:scale-[0.98]"
          }`}
          style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.08), rgba(201,168,76,0.02))" }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="font-display text-xl text-gold tracking-[0.2em] text-glow">DREAM EXPEDITIONS</p>
            {locked && <span className="text-muted-foreground text-lg">🔒</span>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Enter the dream realm. Log your training, earn soul shards, and recover memories from the slain.
          </p>
        </button>

        <button
          disabled={locked}
          onClick={() => !locked && navigate({ to: "/nightmarehub" })}
          className={`w-full p-6 bg-surface-2 text-left transition-all ${
            locked
              ? "border-danger-rune opacity-40 cursor-not-allowed"
              : "border-danger-rune hover:border-destructive/60 active:scale-[0.98]"
          }`}
          style={{ background: "linear-gradient(135deg, rgba(180,30,30,0.10), rgba(180,30,30,0.02))" }}
        >
          <div className="flex items-center justify-between mb-1">
            <p className="font-display text-xl text-destructive tracking-[0.2em]">NIGHTMARES</p>
            {locked && <span className="text-muted-foreground text-lg">🔒</span>}
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Face the nightmare. View your history, track your progress, and challenge the next trial.
          </p>
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
