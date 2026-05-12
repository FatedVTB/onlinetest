import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/lib/store";
import { generateNPCs, generateCode, codeToSeed } from "@/lib/social";
import { rankFromCores, currentCoreInfo } from "@/lib/game";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/cohorts")({
  component: CohortsPage,
  head: () => ({ meta: [{ title: "Sect — Shadow Slave" }] }),
});

function CohortsPage() {
  const { state, joinCohort } = useGame();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  if (state.cohort) return <CohortView />;

  function handleCreate() {
    if (!name.trim()) { setError("Name your Sect."); return; }
    joinCohort({ code: generateCode(), name: name.trim(), joinedAt: Date.now() });
  }
  function handleJoin() {
    const c = code.trim().toUpperCase();
    if (c.length < 4) { setError("Enter an invite sigil."); return; }
    joinCohort({ code: c, name: `Sect ${c}`, joinedAt: Date.now() });
  }

  return (
    <div className="min-h-screen px-5 py-8 max-w-md mx-auto pb-32">
      <Link to="/soul" className="text-xs text-muted-foreground uppercase tracking-widest">← Soul</Link>
      <p className="text-xs uppercase tracking-[0.4em] text-accent mt-4 text-center">Bonds</p>
      <h1 className="font-display text-2xl text-glow text-center mt-1 mb-1">Sects</h1>
      <p className="text-center text-xs text-muted-foreground mb-8">
        Aspirants who train together ascend together.
      </p>

      <div className="bg-card border-rune rounded-2xl p-5 shadow-card mb-5">
        <p className="text-xs uppercase tracking-widest text-accent mb-3">Forge a Sect</p>
        <input
          value={name}
          onChange={e => { setName(e.target.value); setError(""); }}
          placeholder="Sect name (e.g. The Duskborn)"
          className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm mb-3"
        />
        <button
          onClick={handleCreate}
          className="w-full bg-spell text-primary-foreground font-display py-2.5 rounded-lg tracking-widest text-sm shadow-spell"
        >
          Forge
        </button>
      </div>

      <div className="bg-card border-rune rounded-2xl p-5 shadow-card mb-5">
        <p className="text-xs uppercase tracking-widest text-accent mb-3">Join with Sigil</p>
        <input
          value={code}
          onChange={e => { setCode(e.target.value.toUpperCase()); setError(""); }}
          placeholder="ABC123"
          maxLength={8}
          className="w-full bg-input border border-border rounded-lg px-3 py-2 text-sm mb-3 tracking-widest text-center font-display"
        />
        <button
          onClick={handleJoin}
          className="w-full bg-accent text-accent-foreground font-display py-2.5 rounded-lg tracking-widest text-sm"
        >
          Enter the Sect
        </button>
      </div>

      {error && <p className="text-destructive text-xs text-center">{error}</p>}
      <BottomNav />
    </div>
  );
}

function CohortView() {
  const { state, leaveCohort } = useGame();
  const cohort = state.cohort!;
  const npcs = generateNPCs(codeToSeed(cohort.code), 11);
  const core = currentCoreInfo(state.totalShards);
  const myRank = rankFromCores(core.completed + 1);
  const me = { name: state.profile?.name ?? "You", shards: state.totalShards, rank: myRank, isMe: true as const };
  const all = [...npcs.map(n => ({ ...n, isMe: false as const })), me].sort((a, b) => b.shards - a.shards);
  const myIndex = all.findIndex(x => x.isMe);

  return (
    <div className="min-h-screen px-5 py-8 max-w-md mx-auto pb-32">
      <Link to="/soul" className="text-xs text-muted-foreground uppercase tracking-widest">← Soul</Link>
      <p className="text-xs uppercase tracking-[0.4em] text-accent mt-4 text-center">Your Sect</p>
      <h1 className="font-display text-2xl text-glow text-center mt-1">{cohort.name}</h1>
      <p className="text-center text-xs text-muted-foreground mb-1">Sigil</p>
      <p className="text-center font-display text-lg text-ember text-glow-ember tracking-[0.3em] mb-6">
        {cohort.code}
      </p>

      <div className="bg-rank border-rune rounded-2xl p-4 mb-5 text-center shadow-card">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Standing</p>
        <p className="font-display text-2xl text-glow mt-1">#{myIndex + 1} of {all.length}</p>
      </div>

      <div className="space-y-2 mb-6">
        {all.map((p, i) => (
          <div
            key={`${p.name}-${i}`}
            className={`flex items-center justify-between rounded-xl p-3 border ${
              p.isMe ? "bg-spell border-transparent shadow-glow" : "bg-card border-border"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className={`font-display w-6 text-center ${p.isMe ? "text-primary-foreground" : "text-muted-foreground"}`}>
                {i + 1}
              </span>
              <div>
                <p className={`font-display text-sm ${p.isMe ? "text-primary-foreground" : ""}`}>
                  {p.name}{p.isMe && " (you)"}
                </p>
                <p className={`text-[10px] uppercase tracking-widest ${p.isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {p.rank}
                </p>
              </div>
            </div>
            <span className={`font-display ${p.isMe ? "text-primary-foreground" : "text-ember text-glow-ember"}`}>
              {p.shards.toLocaleString()}
            </span>
          </div>
        ))}
      </div>

      <button
        onClick={leaveCohort}
        className="w-full text-destructive text-xs underline"
      >
        Leave the Sect
      </button>
      <BottomNav />
    </div>
  );
}
