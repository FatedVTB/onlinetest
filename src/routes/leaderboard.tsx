import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/lib/store";
import { generateNPCs, codeToSeed } from "@/lib/social";
import { rankFromCores, currentCoreInfo } from "@/lib/game";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
  head: () => ({ meta: [{ title: "The Hierarchy — Shadow Slave" }] }),
});

type Tab = "Global" | "Cohort" | "Friends";

function LeaderboardPage() {
  const { state } = useGame();
  const [tab, setTab] = useState<Tab>("Global");

  const seed = tab === "Cohort" && state.cohort ? codeToSeed(state.cohort.code) : 42;
  const count = tab === "Friends" ? 8 : tab === "Cohort" ? 11 : 24;
  const npcs = tab === "Cohort" && !state.cohort ? [] : generateNPCs(seed, count);

  const core = currentCoreInfo(state.totalShards);
  const myRank = rankFromCores(core.completed + 1);
  const me = state.profile
    ? { name: `You · ${state.profile.name}`, shards: state.totalShards, rank: myRank, isMe: true as const, coreName: core.name }
    : null;

  const all = [
    ...npcs.map(n => {
      const ci = currentCoreInfo(n.shards);
      return { ...n, isMe: false as const, coreName: ci.name };
    }),
    ...(me ? [me] : []),
  ].sort((a, b) => b.shards - a.shards);

  const myIndex = me ? all.findIndex(x => x.isMe) : -1;
  const top = all.slice(0, 4);
  const showMeBelow = myIndex > 3;

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto">
      <header className="px-5 pt-6 pb-3">
        <h1 className="font-display text-lg text-gold tracking-[0.2em]">THE HIERARCHY</h1>
        <p className="text-xs text-muted-foreground tracking-wider mt-1">Where do you stand among shadows?</p>
      </header>

      <div className="px-4">
        {/* Tabs */}
        <div className="flex border border-rune mb-4">
          {(["Global", "Cohort", "Friends"] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-xs tracking-wider transition-colors ${
                tab === t ? "bg-gold/15 text-gold" : "text-muted-foreground"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === "Cohort" && !state.cohort ? (
          <div className="bg-surface-2 border-rune p-5 text-center text-xs text-muted-foreground">
            Join a Sect from the Soul tab to see your cohort hierarchy.
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {top.map((p, i) => (
                <Row key={`${p.name}-${i}`} index={i + 1} entry={p} />
              ))}
            </div>

            {showMeBelow && me && (
              <>
                <div className="h-px bg-gold/20 my-3" />
                <Row index={myIndex + 1} entry={all[myIndex]} />
              </>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
}

function Row({
  index,
  entry,
}: {
  index: number;
  entry: { name: string; shards: number; rank: string; isMe: boolean; coreName: string };
}) {
  const rankColor =
    index === 1 ? "text-gold" : index === 2 ? "text-foreground/70" : index === 3 ? "text-[#8B5E3C]" : "text-muted-foreground";

  return (
    <div
      className={`flex items-center gap-3 p-3 border ${
        entry.isMe ? "bg-gold/10 border-gold/40" : "bg-surface-2 border-rune"
      }`}
    >
      <div className={`font-display text-lg w-6 text-center ${entry.isMe ? "text-gold" : rankColor}`}>
        {index}
      </div>
      <div className="flex-1">
        <p className="text-sm">{entry.name}</p>
        <p className="text-[11px] text-purple-bright mt-0.5">{entry.rank}</p>
      </div>
      <div className="text-right">
        <p className="font-display text-gold text-sm">{entry.coreName}</p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {entry.shards.toLocaleString()}
        </p>
      </div>
    </div>
  );
}
