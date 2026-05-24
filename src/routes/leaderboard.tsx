import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/lib/store";
import { getCurrentUser, listAccounts } from "@/lib/auth";
import {
  CLASS_NAMES,
  classIndexForShards, classShards, classCost,
  getAllPublicProfiles, getFriendUsernames, getCohortByMember,
  type PublicProfile,
} from "@/lib/social";
import { rankFromCores, currentCoreInfo } from "@/lib/game";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
  head: () => ({ meta: [{ title: "The Hierarchy — Shadow Slave" }] }),
});

type BoardTab = "class" | "friends" | "cohort";

const CLASS_COLORS: Record<number, { tab: string; badge: string }> = {
  0: { tab: "text-foreground/80",  badge: "text-foreground/60"  },
  1: { tab: "text-green-400",      badge: "text-green-400/70"   },
  2: { tab: "text-red-400",        badge: "text-red-400/70"     },
  3: { tab: "text-orange-400",     badge: "text-orange-400/70"  },
  4: { tab: "text-purple-bright",  badge: "text-purple-bright/70" },
  5: { tab: "text-blue-400",       badge: "text-blue-400/70"    },
  6: { tab: "text-gold",           badge: "text-gold/70"        },
  7: { tab: "text-gold",           badge: "text-gold"           },
};

type Entry = {
  name: string;
  username?: string;
  shards: number;
  rank: string;
  isMe: boolean;
  isReal: boolean;
};

function LeaderboardPage() {
  const { state } = useGame();
  const currentUser = getCurrentUser();

  const core       = currentCoreInfo(state.totalShards);
  const myClassIdx = classIndexForShards(state.totalShards);
  const myRank     = rankFromCores(core.completed + 1);

  const [boardTab, setBoardTab] = useState<BoardTab>("class");

  // ── Real players — only show accounts that still exist ────────────────
  const registeredSet = new Set(listAccounts());
  const allProfiles   = getAllPublicProfiles().filter(p => registeredSet.has(p.username));
  const friendNames   = currentUser && currentUser !== "__guest__"
    ? new Set(getFriendUsernames(currentUser)) : new Set<string>();
  const myCohort      = currentUser && currentUser !== "__guest__"
    ? getCohortByMember(currentUser) : null;
  const cohortMembers = myCohort ? new Set(myCohort.members.filter(m => m !== currentUser)) : new Set<string>();

  // Map profile to leaderboard entry
  function profileToEntry(p: PublicProfile): Entry {
    const isMe = p.username === currentUser;
    return {
      name:     isMe ? `${p.username} (you)` : p.username,
      username: p.username,
      shards:   p.totalShards,
      rank:     p.rank,
      isMe,
      isReal:   true,
    };
  }

  // ── Class board — real players only ───────────────────────────────────
  // "selected === -1" means Global (all classes)
  const [selected, setSelected] = useState<number>(-1);

  // All real players as entries, sorted by total shards descending
  const allRealEntries: Entry[] = allProfiles
    .map(profileToEntry)
    .sort((a, b) => b.shards - a.shards);

  // Add current user if they have a profile but haven't published yet
  const meAlreadyInAll = allRealEntries.some(e => e.isMe);
  if (state.profile && !meAlreadyInAll) {
    allRealEntries.push({
      name:   `${state.profile.name} (you)`,
      shards: state.totalShards,
      rank:   myRank,
      isMe:   true,
      isReal: true,
    });
    allRealEntries.sort((a, b) => b.shards - a.shards);
  }

  // Filter by class when a specific class tab is selected
  const classEntries: Entry[] = selected === -1
    ? allRealEntries
    : allRealEntries.filter(e => classIndexForShards(e.shards) === selected);

  const myClassIndex = classEntries.findIndex(e => e.isMe);
  const classTop     = classEntries.slice(0, 20);
  const showBelow    = myClassIndex > 19 && myClassIndex !== -1;

  const meEntry = allRealEntries.find(e => e.isMe) ?? null;

  // ── Friends board ──────────────────────────────────────────────────────
  const friendEntries: Entry[] = [
    ...(meEntry ? [meEntry] : []),
    ...allRealEntries.filter(e => !e.isMe && friendNames.has(e.username ?? "")),
  ].sort((a, b) => b.shards - a.shards);

  // ── Cohort board ───────────────────────────────────────────────────────
  const cohortEntries: Entry[] = [
    ...(meEntry ? [meEntry] : []),
    ...allRealEntries.filter(e => !e.isMe && cohortMembers.has(e.username ?? "")),
  ].sort((a, b) => b.shards - a.shards);


  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto">
      <header className="px-5 pt-6 pb-3">
        <h1 className="font-display text-lg text-gold tracking-[0.2em]">THE HIERARCHY</h1>
        <p className="text-xs text-muted-foreground tracking-wider mt-1">
          Your class:{" "}
          <span className={CLASS_COLORS[myClassIdx].tab}>{CLASS_NAMES[myClassIdx]}</span>
        </p>
      </header>

      {/* Board type switcher */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-3 border border-rune overflow-hidden">
          {(["class", "friends", "cohort"] as BoardTab[]).map(t => (
            <button
              key={t}
              onClick={() => setBoardTab(t)}
              className={`py-2 text-[10px] uppercase tracking-[0.15em] transition-all ${
                boardTab === t
                  ? "bg-gold/15 text-gold border-b-2 border-b-gold"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "class" ? "Class" : t === "friends" ? "Friends" : "Cohort"}
            </button>
          ))}
        </div>
      </div>

      {/* ── CLASS board ─────────────────────────────────────────────────── */}
      {boardTab === "class" && (
        <>
          {/* Class filter tabs — tap to filter by class, tap again to show all */}
          <div className="px-4 mb-3">
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {CLASS_NAMES.map((cls, i) => {
                const isActive  = i === selected;
                const isMyClass = i === myClassIdx;
                const col       = CLASS_COLORS[i];
                return (
                  <button
                    key={cls}
                    onClick={() => setSelected(isActive ? -1 : i)}
                    className={`flex-shrink-0 px-2.5 py-2 text-[11px] tracking-wider border transition-colors whitespace-nowrap ${
                      isActive
                        ? `bg-gold/15 border-gold/50 ${col.tab}`
                        : `bg-surface-2 border-rune ${col.badge} hover:border-gold/30`
                    }`}
                  >
                    {cls}
                    {isMyClass && !isActive && <span className="ml-1 text-[8px] text-gold">◆</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Info strip */}
          <div className="px-4 mb-3">
            <div className="bg-surface-2 border-rune p-3 flex items-center justify-between">
              <div>
                {selected === -1 ? (
                  <>
                    <p className="font-display text-sm tracking-[0.15em] text-gold">ALL ASPIRANTS</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {allRealEntries.length} registered aspirant{allRealEntries.length !== 1 ? "s" : ""} · tap a class to filter
                    </p>
                  </>
                ) : (
                  <>
                    <p className={`font-display text-sm tracking-[0.15em] ${CLASS_COLORS[selected].tab}`}>
                      {CLASS_NAMES[selected].toUpperCase()} CLASS
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {classEntries.length} player{classEntries.length !== 1 ? "s" : ""} · tap class again to show all
                    </p>
                  </>
                )}
              </div>
              {selected !== -1 && myClassIdx !== selected && state.profile && (
                <button
                  onClick={() => setSelected(myClassIdx)}
                  className="text-[10px] text-gold border border-gold/40 px-2.5 py-1 ml-3 flex-shrink-0"
                >
                  My Class
                </button>
              )}
            </div>
          </div>

          {/* Rows */}
          <div className="px-4 space-y-2">
            {classEntries.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-sm text-muted-foreground">No players in this class yet.</p>
                <p className="text-[11px] text-muted-foreground/60 mt-1">Be the first to reach it!</p>
              </div>
            ) : (
              <>
                {classTop.map((p, i) => (
                  <Row
                    key={`${p.name}-${i}`}
                    position={i + 1}
                    entry={p}
                    classIndex={classIndexForShards(p.shards)}
                    showClass={selected === -1}
                  />
                ))}
                {showBelow && (
                  <>
                    <div className="h-px bg-gold/20 my-2" />
                    <Row
                      position={myClassIndex + 1}
                      entry={classEntries[myClassIndex]}
                      classIndex={classIndexForShards(classEntries[myClassIndex].shards)}
                      showClass={selected === -1}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* ── FRIENDS board ───────────────────────────────────────────────── */}
      {boardTab === "friends" && (
        <div className="px-4 space-y-2">
          {!currentUser || currentUser === "__guest__" ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              Create an account to see a friends leaderboard.
            </p>
          ) : friendEntries.length <= 1 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              Add friends to see them here.
            </p>
          ) : (
            friendEntries.map((p, i) => (
              <Row key={`${p.name}-${i}`} position={i + 1} entry={p} classIndex={classIndexForShards(p.shards)} showClass />
            ))
          )}
        </div>
      )}

      {/* ── COHORT board ────────────────────────────────────────────────── */}
      {boardTab === "cohort" && (
        <div className="px-4 space-y-2">
          {!myCohort ? (
            <div className="text-center py-10">
              <p className="text-sm text-muted-foreground mb-2">You're not in a cohort.</p>
              <p className="text-[11px] text-muted-foreground/60">Create or join one in the Friends tab.</p>
            </div>
          ) : cohortEntries.length <= 1 ? (
            <p className="text-center text-sm text-muted-foreground py-10">
              No other cohort members have published profiles yet.
            </p>
          ) : (
            <>
              <div className="bg-surface-2 border-rune p-3 mb-1">
                <p className="font-display text-sm text-gold">{myCohort.name}</p>
                <p className="text-[10px] text-muted-foreground">{myCohort.members.length} members</p>
              </div>
              {cohortEntries.map((p, i) => (
                <Row key={`${p.name}-${i}`} position={i + 1} entry={p} classIndex={classIndexForShards(p.shards)} showClass />
              ))}
            </>
          )}
        </div>
      )}

      <BottomNav />
    </div>
  );
}

// ── Row component ─────────────────────────────────────────────────────────────

function Row({
  position,
  entry,
  classIndex,
  showClass,
}: {
  position: number;
  entry: Entry;
  classIndex: number;
  showClass?: boolean;
}) {
  const posColor =
    position === 1 ? "text-gold"
    : position === 2 ? "text-foreground/70"
    : position === 3 ? "text-[#8B5E3C]"
    : "text-muted-foreground";

  const cs = classShards(entry.shards, classIndex);
  const cc = classCost(classIndex);
  const isMaxTitan = classIndex === 7;
  const fillPct = isMaxTitan ? 0 : Math.min(100, (cs / cc) * 100);

  return (
    <div
      className={`relative flex items-center gap-3 p-3 border overflow-hidden ${
        entry.isMe ? "bg-gold/10 border-gold/50" : "bg-surface-2 border-rune"
      }`}
    >
      {!isMaxTitan && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            width: `${fillPct}%`,
            background: entry.isMe ? "rgba(201,168,76,0.07)" : "rgba(123,94,167,0.06)",
          }}
        />
      )}

      <div className={`relative font-display text-lg w-6 text-center flex-shrink-0 ${entry.isMe ? "text-gold" : posColor}`}>
        {position}
      </div>

      <div className="relative flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-sm truncate">{entry.name}</p>
          {entry.isReal && !entry.isMe && (
            <span className="text-[8px] text-accent border border-accent/30 px-1 py-px flex-shrink-0">LIVE</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[11px] text-purple-bright">{entry.rank}</p>
          {showClass && (
            <p className="text-[10px] text-muted-foreground">{CLASS_NAMES[classIndex]}</p>
          )}
        </div>
      </div>

      <div className="relative text-right flex-shrink-0">
        <p className={`font-display text-sm ${isMaxTitan ? "text-gold" : ""}`}>
          {cs.toLocaleString()}
          <span className="text-[10px] text-muted-foreground">/{cc.toLocaleString()}</span>
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">fragments</p>
      </div>
    </div>
  );
}
