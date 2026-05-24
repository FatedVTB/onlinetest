import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useSyncRefresh } from "@/lib/supabase";
import { useGame } from "@/lib/store";
import { NIGHTMARE_UNLOCK_AT } from "@/lib/game";
import { BottomNav } from "@/components/BottomNav";
import { getCurrentUser } from "@/lib/auth";
import {
  getPendingCohortNightmareInvites, acceptCohortNightmareInvite,
  declineCohortNightmareInvite, getActiveCohortNightmareSession,
} from "@/lib/social";

export const Route = createFileRoute("/nightmarehub")({
  component: NightmareHub,
  head: () => ({ meta: [{ title: "Nightmares — Shadow Slave" }] }),
});

function ord(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

const MAX_NM = NIGHTMARE_UNLOCK_AT.length - 1; // 7

function NightmareHub() {
  const navigate = useNavigate();
  const { state } = useGame();
  const currentUser = getCurrentUser();
  const [, forceUpdate] = useState(0);
  useSyncRefresh(); // re-render when Supabase sync brings in new invites

  const pendingNmInvites  = currentUser ? getPendingCohortNightmareInvites(currentUser) : [];
  const activeNmSession   = currentUser ? getActiveCohortNightmareSession(currentUser) : null;

  // Block until First Nightmare is done — user must face it from the Home screen
  if (!state.aspect && state.nightmarePostponed) {
    return (
      <div className="min-h-screen pb-24 max-w-md mx-auto flex flex-col">
        <header className="px-5 pt-6 pb-4">
          <Link to="/dreamrealm" className="text-[10px] text-muted-foreground uppercase tracking-widest">← Dreamrealm</Link>
          <h1 className="font-display text-lg text-gold tracking-[0.2em] mt-3">NIGHTMARES</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <p className="text-4xl mb-5">🔒</p>
          <p className="font-display text-sm text-destructive tracking-[0.15em] mb-2">SEALED</p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            Nightmares are locked until you complete your First Trial.
            Return home to face the First Nightmare and unlock everything.
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

  const passed      = state.nightmaresPassed;
  const expeditions = state.workouts.length;
  const nextNM      = passed + 1;

  const nextUnlockAt = NIGHTMARE_UNLOCK_AT[nextNM] ?? 9999;
  const nextUnlocked = expeditions >= nextUnlockAt;

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto">
      <header className="px-5 pt-6 pb-4">
        <Link to="/dreamrealm" className="text-[10px] text-muted-foreground uppercase tracking-widest">← Dreamrealm</Link>
        <h1 className="font-display text-lg text-gold tracking-[0.2em] mt-3">NIGHTMARES</h1>
        <p className="text-xs text-muted-foreground mt-1">
          {passed} Nightmare{passed === 1 ? "" : "s"} Conquered · {expeditions} Expedition{expeditions === 1 ? "" : "s"} Completed
        </p>
      </header>

      {/* Active cohort nightmare — rejoin */}
      {activeNmSession && (
        <div className="mx-4 mb-3 bg-destructive/10 border border-destructive/40 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.15em] text-destructive">☠ Active Cohort Nightmare</p>
          <p className="text-[11px] text-foreground/80">
            NM{activeNmSession.nightmareNumber} with {activeNmSession.acceptedMembers.filter(m => m !== currentUser).join(", ")} in {activeNmSession.cohortName}.
          </p>
          <button
            onClick={() => navigate({ to: "/nightmare" })}
            className="w-full py-1.5 bg-destructive/20 border border-destructive/60 font-display text-[10px] tracking-[0.12em] text-destructive hover:bg-destructive/30 transition-colors"
          >
            REJOIN NIGHTMARE
          </button>
        </div>
      )}

      {/* Pending cohort nightmare invites */}
      {pendingNmInvites.map(session => (
        <div key={session.id} className="mx-4 mb-3 bg-destructive/10 border border-destructive/50 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.15em] text-destructive">☠ Cohort Nightmare Invite</p>
          <p className="text-[11px] text-foreground/90">
            <span className="text-gold">{session.initiator}</span> is challenging{" "}
            <span className="text-destructive">NM{session.nightmareNumber}</span> in{" "}
            <span className="text-gold">{session.cohortName}</span>.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const lastSets = state.lastNightmareSets ?? state.firstNightmareSets ?? [];
                acceptCohortNightmareInvite(session.id, currentUser!, lastSets);
                navigate({ to: "/nightmare" });
              }}
              className="flex-1 py-1.5 bg-destructive/20 border border-destructive/60 font-display text-[10px] tracking-[0.12em] text-destructive hover:bg-destructive/30 transition-colors"
            >
              JOIN
            </button>
            <button
              onClick={() => { declineCohortNightmareInvite(session.id, currentUser!); forceUpdate(n => n + 1); }}
              className="flex-1 py-1.5 border border-rune text-[10px] text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-colors"
            >
              DECLINE
            </button>
          </div>
        </div>
      ))}

      <div className="px-4 space-y-3">
        {Array.from({ length: MAX_NM }, (_, i) => i + 1).map(nmNum => {
          const isCompleted = nmNum <= passed;
          const isNext      = nmNum === nextNM;
          const unlockAt    = NIGHTMARE_UNLOCK_AT[nmNum] ?? 9999;
          const record      = state.nightmareHistory.find(h => h.nm === nmNum);

          if (isCompleted) {
            return (
              <div key={nmNum} className="bg-surface-2 border-rune p-4">
                <div className="flex items-start justify-between mb-2">
                  <p className="font-display text-sm text-gold">{nmNum}{ord(nmNum)} Nightmare</p>
                  <span className="text-[10px] text-accent tracking-[0.15em] mt-0.5">✓ CONQUERED</span>
                </div>
                {nmNum === 1 ? (
                  <p className="text-xs text-muted-foreground">Awakening Trial — Aspect and Flaw forged from the first trial.</p>
                ) : record ? (
                  <div className="flex gap-5 mt-1">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Required</p>
                      <p className="text-sm font-display text-foreground/80">{record.requiredPct.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Achieved</p>
                      <p className="text-sm font-display text-accent">{record.achievedPct.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Margin</p>
                      <p className="text-sm font-display text-gold">+{(record.achievedPct - record.requiredPct).toFixed(1)}%</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Completed before records were kept.</p>
                )}
              </div>
            );
          }

          if (isNext) {
            const progressPct = Math.min(100, (expeditions / unlockAt) * 100);
            return (
              <div key={nmNum} className="bg-surface-2 border-danger-rune p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-display text-sm">{nmNum}{ord(nmNum)} Nightmare</p>
                    <p className={`text-[11px] mt-0.5 tracking-wider ${nextUnlocked ? "text-destructive" : "text-muted-foreground"}`}>
                      {nextUnlocked ? "CHALLENGE AVAILABLE" : `${expeditions} / ${unlockAt} expeditions`}
                    </p>
                  </div>
                  <button
                    disabled={!nextUnlocked}
                    onClick={() => navigate({ to: "/nightmare" })}
                    className="px-4 py-2 font-display text-[11px] tracking-[0.1em] border border-destructive/50 text-destructive bg-destructive/10 disabled:opacity-35 disabled:border-border disabled:text-muted-foreground disabled:bg-transparent"
                  >
                    {nextUnlocked ? "ENTER" : "LOCKED"}
                  </button>
                </div>
                {!nextUnlocked && (
                  <div className="h-0.5 bg-surface-3 overflow-hidden mt-1">
                    <div
                      className="h-full transition-all"
                      style={{ width: `${progressPct}%`, background: "rgba(180,30,30,0.5)" }}
                    />
                  </div>
                )}
              </div>
            );
          }

          // Future — don't show expedition counts since counting hasn't started
          return (
            <div key={nmNum} className="bg-surface-2 border-rune p-4 opacity-35">
              <p className="font-display text-sm text-muted-foreground">{nmNum}{ord(nmNum)} Nightmare</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Complete the {nextNM}{ord(nextNM)} Nightmare to unlock.
              </p>
            </div>
          );
        })}
      </div>

      <BottomNav />
    </div>
  );
}
