import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useCallback, useEffect } from "react";
import { Search, Users, Clock, Swords, ChevronDown, ChevronUp } from "lucide-react";
import { getCurrentUser, listAccounts } from "@/lib/auth";
import { useGame } from "@/lib/store";
import { NIGHTMARE_UNLOCK_AT } from "@/lib/game";
import {
  getPublicProfile, getAllPublicProfiles,
  getFriendUsernames, areFriends, removeFriendship,
  sendFriendRequest, getIncomingRequests, getOutgoingRequests,
  acceptFriendRequest, declineFriendRequest, cancelFriendRequest,
  getCohortByMember, createSocialCohort, leaveSocialCohort, disbandCohort,
  sendCohortInvite, getCohortInvitesForUser, acceptCohortInvite, declineCohortInvite,
  createCohortExpeditionSession, getPendingCohortExpeditionInvites,
  acceptCohortExpeditionInvite, declineCohortExpeditionInvite,
  getActiveCohortSessionForUser,
  createCohortNightmareSession, getPendingCohortNightmareInvites,
  acceptCohortNightmareInvite, declineCohortNightmareInvite,
  getActiveCohortNightmareSession,
  CLASS_NAMES, classIndexForShards,
  type PublicProfile, type SocialCohort, type FriendRequest, type CohortInvite,
  type CohortExpeditionSession, type CohortNightmareSession,
} from "@/lib/social";
import { BottomNav } from "@/components/BottomNav";

// Only show profiles for accounts that still exist — deleted accounts are filtered out.
function getLiveProfiles(): PublicProfile[] {
  const registered = new Set(listAccounts());
  return getAllPublicProfiles().filter(p => registered.has(p.username));
}

export const Route = createFileRoute("/friends")({
  component: FriendsPage,
  head: () => ({ meta: [{ title: "Friends — Shadow Slave" }] }),
});

type Tab = "friends" | "find" | "pending" | "cohort";

// ── Shared helpers ─────────────────────────────────────────────────────────

function classLabel(shards: number) {
  return CLASS_NAMES[classIndexForShards(shards)] ?? "Beast";
}

function RankBadge({ rank }: { rank: string }) {
  return <span className="text-[10px] text-purple-bright tracking-wider">{rank}</span>;
}

function ProfileCard({
  profile,
  actions,
  expanded,
  onToggle,
}: {
  profile: PublicProfile;
  actions?: React.ReactNode;
  expanded?: boolean;
  onToggle?: () => void;
}) {
  return (
    <div className="bg-surface-2 border-rune">
      <div className="p-3 flex items-start gap-3">
        {/* Avatar letter */}
        <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-surface-3 font-display text-gold text-sm border border-rune">
          {profile.username[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="font-display text-sm text-gold tracking-wide">{profile.username}</p>
            {profile.displayName && profile.displayName !== profile.username && (
              <p className="text-[10px] text-muted-foreground">"{profile.displayName}"</p>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <RankBadge rank={profile.rank} />
            <span className="text-[10px] text-muted-foreground">{classLabel(profile.totalShards)} Class</span>
            <span className="text-[10px] text-muted-foreground">{profile.totalShards.toLocaleString()} shards</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {profile.nightmaresPassed} NM · {profile.workoutsCount} expeditions
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {actions}
          {onToggle && (
            <button onClick={onToggle} className="text-muted-foreground hover:text-gold p-1 transition-colors">
              {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-3 pb-3 space-y-2 border-t border-rune pt-3">
          {profile.aspect ? (
            <div className="bg-surface-3 p-2.5 border-l-2 border-l-gold">
              <p className="text-[10px] text-gold tracking-wider uppercase mb-1">
                Aspect · {profile.aspect.name} · {profile.aspect.rank}
              </p>
              <p className="text-[10px] text-muted-foreground">Triggered by: {profile.aspect.exercise}</p>
              {(profile.aspect.abilities ?? []).map((ab, i) => (
                <p key={i} className="text-[11px] text-foreground/80 mt-1">· {ab.description}</p>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground italic">No aspect forged yet.</p>
          )}
          {profile.flaw && (
            <div className="bg-surface-3 p-2.5 border-l-2 border-l-destructive">
              <p className="text-[10px] text-destructive tracking-wider uppercase mb-1">
                Flaw · {profile.flaw.name}
              </p>
              <p className="text-[11px] text-muted-foreground">{profile.flaw.description}</p>
            </div>
          )}
          {profile.trueName && (
            <div className="bg-surface-3 p-2.5 border-l-2 border-l-purple-400">
              <p className="text-[10px] text-purple-bright tracking-wider uppercase mb-1">True Name</p>
              <p className="text-[11px] text-foreground/80">{profile.trueName.name}</p>
              <p className="text-[11px] text-muted-foreground">{profile.trueName.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab: Friends ────────────────────────────────────────────────────────────

function FriendsTab({ currentUser }: { currentUser: string }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const registered     = new Set(listAccounts());
  // Only show friends whose accounts still exist
  const friendNames    = getFriendUsernames(currentUser).filter(u => registered.has(u));
  const friendsWithProfile = friendNames.map(u => ({
    username: u,
    profile: getPublicProfile(u),
  }));

  if (friendNames.length === 0) {
    return (
      <div className="px-4 py-12 text-center">
        <Users size={32} className="mx-auto text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">No friends yet.</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">Search for other aspirants in Find Friends.</p>
      </div>
    );
  }

  return (
    <div className="px-4 space-y-2">
      {friendsWithProfile.map(({ username, profile }) => {
        const isExpanded = expandedId === username;
        if (!profile) {
          return (
            <div key={username} className="bg-surface-2 border-rune p-3 flex items-center justify-between">
              <div>
                <p className="font-display text-sm text-gold">{username}</p>
                <p className="text-[10px] text-muted-foreground">No profile published yet</p>
              </div>
              <button
                onClick={() => { removeFriendship(currentUser, username); refresh(); }}
                className="text-[10px] text-muted-foreground border border-rune px-2 py-1 hover:border-destructive/50 hover:text-destructive transition-colors"
              >
                Remove
              </button>
            </div>
          );
        }
        return (
          <ProfileCard
            key={username}
            profile={profile}
            expanded={isExpanded}
            onToggle={() => setExpandedId(isExpanded ? null : username)}
            actions={
              <button
                onClick={() => { removeFriendship(currentUser, username); refresh(); }}
                className="text-[10px] text-muted-foreground border border-rune px-2 py-1 hover:border-destructive/50 hover:text-destructive transition-colors"
              >
                Remove
              </button>
            }
          />
        );
      })}
    </div>
  );
}

// ── Tab: Find Friends ───────────────────────────────────────────────────────

function FindFriendsTab({ currentUser }: { currentUser: string }) {
  const [query, setQuery] = useState("");
  const [sent, setSent]   = useState<Record<string, string>>({});
  const [, forceUpdate]   = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const allAccounts   = listAccounts().filter(u => u !== currentUser);
  const allProfiles   = getLiveProfiles();
  const profileMap    = Object.fromEntries(allProfiles.map(p => [p.username, p]));
  const outgoing      = getOutgoingRequests(currentUser);
  const outgoingSet   = new Set(outgoing.map(r => r.to));
  const outgoingIdMap = Object.fromEntries(outgoing.map(r => [r.to, r.id]));

  const filtered = allAccounts.filter(u =>
    !query.trim() || u.toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <div className="px-4 space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by username…"
          className="w-full bg-surface-2 border border-rune pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/40"
        />
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">No aspirants found.</p>
      )}

      {filtered.map(username => {
        const profile  = profileMap[username];
        const isFriend = areFriends(currentUser, username);
        const hasSent  = outgoingSet.has(username) || !!sent[username];

        return (
          <div key={username} className="bg-surface-2 border-rune p-3 flex items-start gap-3">
            <div className="w-9 h-9 flex-shrink-0 flex items-center justify-center bg-surface-3 font-display text-gold text-sm border border-rune">
              {username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-display text-sm text-gold">{username}</p>
              {profile ? (
                <div className="flex gap-3 mt-0.5 flex-wrap">
                  <RankBadge rank={profile.rank} />
                  <span className="text-[10px] text-muted-foreground">{classLabel(profile.totalShards)} Class</span>
                  <span className="text-[10px] text-muted-foreground">{profile.totalShards.toLocaleString()} shards</span>
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground">No profile published yet</p>
              )}
            </div>
            <div className="flex-shrink-0">
              {isFriend ? (
                <span className="text-[10px] text-accent tracking-wider">✓ Friends</span>
              ) : hasSent ? (
                <button
                  onClick={() => {
                    const reqId = outgoingIdMap[username] ?? sent[username];
                    if (reqId) cancelFriendRequest(reqId, currentUser);
                    setSent(s => { const n = { ...s }; delete n[username]; return n; });
                    refresh();
                  }}
                  className="text-[10px] text-muted-foreground border border-rune px-2 py-1 hover:border-destructive/50 hover:text-destructive transition-colors"
                >
                  Cancel
                </button>
              ) : (
                <button
                  onClick={() => {
                    const res = sendFriendRequest(currentUser, username);
                    if (res.success) {
                      const newReqs = getOutgoingRequests(currentUser);
                      const newReq  = newReqs.find(r => r.to === username);
                      if (newReq) setSent(s => ({ ...s, [username]: newReq.id }));
                    }
                  }}
                  className="text-[10px] text-gold border border-gold/40 px-2 py-1 hover:bg-gold/10 transition-colors"
                >
                  + Add
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Tab: Pending ────────────────────────────────────────────────────────────

function PendingTab({ currentUser }: { currentUser: string }) {
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const incoming        = getIncomingRequests(currentUser);
  const outgoing        = getOutgoingRequests(currentUser);
  const cohortInvites   = getCohortInvitesForUser(currentUser);
  const profileMap      = Object.fromEntries(getLiveProfiles().map(p => [p.username, p]));

  const empty = incoming.length === 0 && outgoing.length === 0 && cohortInvites.length === 0;

  return (
    <div className="px-4 space-y-4">
      {/* Friend requests — incoming */}
      {incoming.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Friend Requests</p>
          <div className="space-y-2">
            {incoming.map(req => {
              const p = profileMap[req.from];
              return (
                <div key={req.id} className="bg-surface-2 border-rune p-3 flex items-center gap-3">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-surface-3 font-display text-gold text-xs border border-rune">
                    {req.from[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-display text-gold">{req.from}</p>
                    {p && <p className="text-[10px] text-muted-foreground">{p.rank} · {classLabel(p.totalShards)}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => { acceptFriendRequest(req.id, currentUser); refresh(); }}
                      className="text-[10px] text-accent border border-accent/40 px-2 py-1 hover:bg-accent/10 transition-colors"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => { declineFriendRequest(req.id, currentUser); refresh(); }}
                      className="text-[10px] text-muted-foreground border border-rune px-2 py-1 hover:border-destructive/50 hover:text-destructive transition-colors"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Cohort invites */}
      {cohortInvites.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Cohort Invites</p>
          <div className="space-y-2">
            {cohortInvites.map(inv => (
              <div key={inv.id} className="bg-surface-2 border-rune p-3 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display text-gold">{inv.cohortName}</p>
                  <p className="text-[10px] text-muted-foreground">Invited by {inv.from}</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => { acceptCohortInvite(inv.id, currentUser); refresh(); }}
                    className="text-[10px] text-accent border border-accent/40 px-2 py-1 hover:bg-accent/10 transition-colors"
                  >
                    Join
                  </button>
                  <button
                    onClick={() => { declineCohortInvite(inv.id, currentUser); refresh(); }}
                    className="text-[10px] text-muted-foreground border border-rune px-2 py-1 hover:border-destructive/50 hover:text-destructive transition-colors"
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent friend requests */}
      {outgoing.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Sent Requests</p>
          <div className="space-y-2">
            {outgoing.map(req => (
              <div key={req.id} className="bg-surface-2 border-rune p-3 flex items-center gap-3">
                <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-surface-3 font-display text-gold text-xs border border-rune">
                  {req.to[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-display text-gold">{req.to}</p>
                  <p className="text-[10px] text-muted-foreground">Pending…</p>
                </div>
                <button
                  onClick={() => { cancelFriendRequest(req.id, currentUser); refresh(); }}
                  className="text-[10px] text-muted-foreground border border-rune px-2 py-1 hover:border-destructive/50 hover:text-destructive transition-colors"
                >
                  Cancel
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {empty && (
        <div className="py-12 text-center">
          <Clock size={32} className="mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No pending requests.</p>
        </div>
      )}
    </div>
  );
}

// ── Tab: Cohort ─────────────────────────────────────────────────────────────

function CohortTab({ currentUser }: { currentUser: string }) {
  const navigate = useNavigate();
  const [, forceUpdate] = useState(0);
  const refresh = () => forceUpdate(n => n + 1);

  const myCohort   = getCohortByMember(currentUser);
  const myFriends  = getFriendUsernames(currentUser);
  const profileMap = Object.fromEntries(getLiveProfiles().map(p => [p.username, p]));
  const isLeader   = myCohort?.leader === currentUser;

  // Pending expedition invites
  const pendingExpeditions = getPendingCohortExpeditionInvites(currentUser);
  // Pending nightmare invites
  const pendingNightmares  = getPendingCohortNightmareInvites(currentUser);
  const { state: gameState } = useGame();

  return (
    <div className="space-y-4">
      {/* Pending expedition invites */}
      {pendingExpeditions.map(session => (
        <div key={session.id} className="mx-4 bg-purple-bright/10 border border-purple-bright/50 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.15em] text-purple-bright">⚔ Cohort Expedition Invite</p>
          <p className="text-[11px] text-foreground/90">
            <span className="text-gold">{session.initiator}</span> has started a{" "}
            <span className="text-gold">{session.cohortName}</span> expedition and invited you.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const myShards = getPublicProfile(currentUser)?.totalShards ?? 0;
                acceptCohortExpeditionInvite(session.id, currentUser, myShards);
                navigate({ to: "/expedition" });
              }}
              className="flex-1 py-1.5 bg-purple-bright/20 border border-purple-bright/60 font-display text-[10px] tracking-[0.12em] text-purple-bright hover:bg-purple-bright/30 transition-colors"
            >
              JOIN
            </button>
            <button
              onClick={() => { declineCohortExpeditionInvite(session.id, currentUser); refresh(); }}
              className="flex-1 py-1.5 border border-rune font-display text-[10px] tracking-[0.12em] text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-colors"
            >
              DECLINE
            </button>
          </div>
        </div>
      ))}

      {/* Pending nightmare invites */}
      {pendingNightmares.map(session => (
        <div key={session.id} className="mx-4 bg-destructive/10 border border-destructive/50 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-[0.15em] text-destructive">☠ Cohort Nightmare Invite</p>
          <p className="text-[11px] text-foreground/90">
            <span className="text-gold">{session.initiator}</span> is challenging the{" "}
            <span className="text-destructive">NM{session.nightmareNumber}</span> Nightmare in{" "}
            <span className="text-gold">{session.cohortName}</span>.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const lastSets = gameState.lastNightmareSets ?? gameState.firstNightmareSets ?? [];
                acceptCohortNightmareInvite(session.id, currentUser, lastSets);
                navigate({ to: "/nightmare" });
              }}
              className="flex-1 py-1.5 bg-destructive/20 border border-destructive/60 font-display text-[10px] tracking-[0.12em] text-destructive hover:bg-destructive/30 transition-colors"
            >
              JOIN
            </button>
            <button
              onClick={() => { declineCohortNightmareInvite(session.id, currentUser); refresh(); }}
              className="flex-1 py-1.5 border border-rune font-display text-[10px] tracking-[0.12em] text-muted-foreground hover:border-destructive/40 hover:text-destructive transition-colors"
            >
              DECLINE
            </button>
          </div>
        </div>
      ))}

      {myCohort ? (
        <CohortView cohort={myCohort} currentUser={currentUser} isLeader={isLeader} myFriends={myFriends} profileMap={profileMap} onRefresh={refresh} />
      ) : (
        <CreateCohortView currentUser={currentUser} onRefresh={refresh} />
      )}
    </div>
  );
}

function CreateCohortView({ currentUser, onRefresh }: { currentUser: string; onRefresh: () => void }) {
  const [name, setName]        = useState("");
  const [desc, setDesc]        = useState("");
  const [error, setError]      = useState<string | null>(null);
  const cohortInvites          = getCohortInvitesForUser(currentUser);

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Cohort name is required."); return; }
    if (name.trim().length < 3) { setError("Name must be at least 3 characters."); return; }
    createSocialCohort(name, desc, currentUser);
    onRefresh();
  }

  return (
    <div className="px-4 space-y-4">
      {cohortInvites.length > 0 && (
        <div className="bg-surface-2 border-rune p-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
            Cohort Invites ({cohortInvites.length})
          </p>
          <p className="text-[11px] text-muted-foreground">Check the Pending tab to accept or decline cohort invites.</p>
        </div>
      )}

      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">Found a Cohort</p>
        <form onSubmit={handleCreate} className="space-y-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Cohort Name</p>
            <input
              type="text"
              value={name}
              onChange={e => { setName(e.target.value); setError(null); }}
              maxLength={30}
              placeholder="Enter a cohort name…"
              className="w-full bg-surface-2 border border-rune px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/40"
            />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Description (optional)</p>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              maxLength={120}
              rows={3}
              placeholder="What is your cohort about?"
              className="w-full bg-surface-2 border border-rune px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/40 resize-none"
            />
          </div>
          {error && <p className="text-[11px] text-destructive">{error}</p>}
          <button
            type="submit"
            className="w-full bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-3.5"
          >
            FOUND COHORT
          </button>
        </form>
      </div>
    </div>
  );
}

function CohortView({
  cohort, currentUser, isLeader, myFriends, profileMap, onRefresh,
}: {
  cohort: SocialCohort;
  currentUser: string;
  isLeader: boolean;
  myFriends: string[];
  profileMap: Record<string, PublicProfile>;
  onRefresh: () => void;
}) {
  const navigate = useNavigate();
  const { state } = useGame();
  const [showInvite, setShowInvite]             = useState(false);
  const [expandedId, setExpandedId]             = useState<string | null>(null);
  const [inviteMsg, setInviteMsg]               = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave]         = useState(false);
  const [showExpedition, setShowExpedition]     = useState(false);
  const [showNightmare, setShowNightmare]       = useState(false);
  const [selectedMembers, setSelectedMembers]   = useState<Set<string>>(new Set());
  const [nmSelectedMembers, setNmSelectedMembers] = useState<Set<string>>(new Set());

  const nonMembers = myFriends.filter(f => !cohort.members.includes(f));

  return (
    <div className="px-4 space-y-4">
      {/* Cohort info */}
      <div className="bg-surface-2 border-rune p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <p className="font-display text-base text-gold tracking-[0.15em]">{cohort.name}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Code: <span className="text-foreground font-mono">{cohort.code}</span>
              {" · "}{cohort.members.length} member{cohort.members.length !== 1 ? "s" : ""}
              {" · "}Led by <span className="text-gold">{cohort.leader}</span>
            </p>
          </div>
          {isLeader && (
            <span className="text-[10px] text-gold border border-gold/30 px-2 py-0.5 flex-shrink-0">Leader</span>
          )}
        </div>
        {cohort.description && (
          <p className="text-[11px] text-muted-foreground leading-relaxed">{cohort.description}</p>
        )}
      </div>

      {/* Invite friends (leader only) */}
      {isLeader && (
        <div>
          <button
            onClick={() => setShowInvite(v => !v)}
            className="w-full py-2.5 border border-gold/40 font-display text-xs tracking-[0.15em] text-gold hover:bg-gold/10 transition-colors"
          >
            {showInvite ? "CANCEL" : "INVITE FRIENDS"}
          </button>

          {showInvite && (
            <div className="mt-2 space-y-2">
              {inviteMsg && <p className="text-[11px] text-accent">{inviteMsg}</p>}
              {nonMembers.length === 0 ? (
                <p className="text-[11px] text-muted-foreground text-center py-4">All friends are already in the cohort.</p>
              ) : (
                nonMembers.map(f => {
                  const p = profileMap[f];
                  return (
                    <div key={f} className="bg-surface-2 border-rune p-3 flex items-center gap-3">
                      <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-surface-3 font-display text-gold text-xs border border-rune">
                        {f[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-display text-gold">{f}</p>
                        {p && <p className="text-[10px] text-muted-foreground">{p.rank}</p>}
                      </div>
                      <button
                        onClick={() => {
                          const res = sendCohortInvite(cohort.code, currentUser, f);
                          setInviteMsg(res.success ? `Invite sent to ${f}!` : (res.error ?? "Failed"));
                          setTimeout(() => setInviteMsg(null), 3000);
                        }}
                        className="text-[10px] text-gold border border-gold/40 px-2 py-1 hover:bg-gold/10 transition-colors"
                      >
                        Invite
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* Cohort Dream Expedition launcher */}
      {(() => {
        // If user is already in an active session, show a "Rejoin" button instead
        const activeSession = getActiveCohortSessionForUser(currentUser);
        if (activeSession) {
          return (
            <div className="bg-purple-bright/10 border border-purple-bright/40 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-purple-bright">Active Expedition</p>
              <p className="text-[11px] text-foreground/80">
                You have an ongoing cohort expedition with{" "}
                {activeSession.acceptedMembers.filter(m => m !== currentUser).join(", ") || "no one yet"}.
              </p>
              <button
                onClick={() => navigate({ to: "/expedition" })}
                className="w-full py-2 bg-purple-bright/20 border border-purple-bright/60 font-display text-xs tracking-[0.15em] text-purple-bright hover:bg-purple-bright/30 transition-colors"
              >
                REJOIN EXPEDITION
              </button>
            </div>
          );
        }

        const others = cohort.members.filter(m => m !== currentUser);
        const count  = selectedMembers.size;
        const shardBonus  = count * 8;
        const memoryBonus = count * 5;

        return (
          <div>
            <button
              onClick={() => { setShowExpedition(v => !v); setSelectedMembers(new Set()); }}
              className={`w-full py-2.5 border font-display text-xs tracking-[0.15em] transition-colors ${
                showExpedition
                  ? "bg-purple-bright/15 border-purple-bright text-purple-bright"
                  : "bg-surface-2 border-purple-bright/40 text-purple-bright hover:bg-purple-bright/10"
              }`}
            >
              {showExpedition ? "CANCEL" : "⚔ START COHORT EXPEDITION"}
            </button>

            {showExpedition && (
              <div className="mt-2 bg-surface-2 border border-purple-bright/30 p-3 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1">
                    Invite members — they'll need to accept before joining
                  </p>
                  {others.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground py-2">No other members yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {others.map(m => {
                        const p = profileMap[m];
                        const checked = selectedMembers.has(m);
                        return (
                          <button
                            key={m}
                            onClick={() => setSelectedMembers(prev => {
                              const next = new Set(prev);
                              if (next.has(m)) next.delete(m); else next.add(m);
                              return next;
                            })}
                            className={`w-full flex items-center gap-3 p-2.5 border transition-colors text-left ${
                              checked
                                ? "border-purple-bright/50 bg-purple-bright/10"
                                : "border-rune hover:border-purple-bright/30"
                            }`}
                          >
                            <div className={`w-4 h-4 flex-shrink-0 border flex items-center justify-center text-[10px] ${
                              checked ? "border-purple-bright bg-purple-bright/20 text-purple-bright" : "border-rune"
                            }`}>
                              {checked ? "✓" : ""}
                            </div>
                            <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-surface-3 font-display text-gold text-xs border border-rune">
                              {m[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-display text-foreground">{m}</p>
                              {p && <p className="text-[10px] text-muted-foreground">{p.rank} · {p.totalShards.toLocaleString()} ✦</p>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Bonus preview */}
                {count > 0 && (
                  <div className="bg-surface-3 border border-gold/20 px-3 py-2 space-y-0.5">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-gold mb-1">Cohort Bonuses (if they accept)</p>
                    <p className="text-[11px] text-foreground/80">+{shardBonus}% shards ({count} × 8%)</p>
                    <p className="text-[11px] text-foreground/80">+{memoryBonus}% memory drop chance ({count} × 5%)</p>
                  </div>
                )}

                <button
                  onClick={() => {
                    const myStartShards = getPublicProfile(currentUser)?.totalShards ?? 0;
                    createCohortExpeditionSession(
                      cohort.code,
                      cohort.name,
                      currentUser,
                      [...selectedMembers],
                      myStartShards,
                    );
                    navigate({ to: "/expedition" });
                  }}
                  className="w-full py-2.5 bg-purple-bright/20 border border-purple-bright/60 font-display text-xs tracking-[0.15em] text-purple-bright hover:bg-purple-bright/30 transition-colors"
                >
                  {count > 0 ? `INVITE ${count} & BEGIN` : "BEGIN SOLO EXPEDITION"}
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Cohort Nightmare Challenge launcher */}
      {(() => {
        // Check for an active nightmare session
        const activeNmSession = getActiveCohortNightmareSession(currentUser);
        if (activeNmSession) {
          return (
            <div className="bg-destructive/10 border border-destructive/40 p-3 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.15em] text-destructive">Active Cohort Nightmare</p>
              <p className="text-[11px] text-foreground/80">
                NM{activeNmSession.nightmareNumber} with{" "}
                {activeNmSession.acceptedMembers.filter(m => m !== currentUser).join(", ") || "no one yet"}.
              </p>
              <button
                onClick={() => navigate({ to: "/nightmare" })}
                className="w-full py-2 bg-destructive/20 border border-destructive/60 font-display text-xs tracking-[0.15em] text-destructive hover:bg-destructive/30 transition-colors"
              >
                REJOIN NIGHTMARE
              </button>
            </div>
          );
        }

        // Current user nightmare eligibility
        const myNextNM     = state.nightmaresPassed + 1;
        const myWorkouts   = state.workouts.length;
        const myUnlockAt   = NIGHTMARE_UNLOCK_AT[myNextNM] ?? 9999;
        const myUnlocked   = myWorkouts >= myUnlockAt && myNextNM >= 2; // NM1 not available as cohort
        const others       = cohort.members.filter(m => m !== currentUser);

        // For each other member, check if they're on the same NM and have it unlocked
        const eligibleMembers = others.filter(m => {
          const p = profileMap[m];
          if (!p) return false;
          if (p.nightmaresPassed !== state.nightmaresPassed) return false; // must be same NM
          const unlockAt = NIGHTMARE_UNLOCK_AT[p.nightmaresPassed + 1] ?? 9999;
          return p.workoutsCount >= unlockAt;
        });

        if (!myUnlocked) return null; // current user not eligible — hide the section entirely

        const nmCount    = nmSelectedMembers.size;
        const thresholdBonus = nmCount * 3;   // -3 percentage points per member
        const memoryBonus    = nmCount * 10;  // +10% memory drops per member

        return (
          <div>
            <button
              onClick={() => { setShowNightmare(v => !v); setNmSelectedMembers(new Set()); }}
              className={`w-full py-2.5 border font-display text-xs tracking-[0.15em] transition-colors ${
                showNightmare
                  ? "bg-destructive/15 border-destructive text-destructive"
                  : "bg-surface-2 border-destructive/40 text-destructive hover:bg-destructive/10"
              }`}
            >
              {showNightmare ? "CANCEL" : "☠ CHALLENGE NIGHTMARE WITH COHORT"}
            </button>

            {showNightmare && (
              <div className="mt-2 bg-surface-2 border border-destructive/30 p-3 space-y-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-0.5">
                    {myNextNM}th Nightmare — select eligible members
                  </p>
                  <p className="text-[9px] text-muted-foreground/60 mb-2">
                    Only members on the same nightmare with it unlocked can join.
                  </p>
                  {others.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground py-2">No other members yet.</p>
                  ) : eligibleMembers.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground py-2">
                      No members are currently eligible for your next nightmare.
                    </p>
                  ) : (
                    <div className="space-y-1.5">
                      {others.map(m => {
                        const p = profileMap[m];
                        const eligible = eligibleMembers.includes(m);
                        const checked  = nmSelectedMembers.has(m);
                        return (
                          <button
                            key={m}
                            disabled={!eligible}
                            onClick={() => {
                              if (!eligible) return;
                              setNmSelectedMembers(prev => {
                                const next = new Set(prev);
                                if (next.has(m)) next.delete(m); else next.add(m);
                                return next;
                              });
                            }}
                            className={`w-full flex items-center gap-3 p-2.5 border transition-colors text-left ${
                              !eligible ? "border-rune opacity-35 cursor-not-allowed" :
                              checked ? "border-destructive/50 bg-destructive/10" :
                              "border-rune hover:border-destructive/30"
                            }`}
                          >
                            <div className={`w-4 h-4 flex-shrink-0 border flex items-center justify-center text-[10px] ${
                              checked ? "border-destructive bg-destructive/20 text-destructive" : "border-rune"
                            }`}>
                              {checked ? "✓" : ""}
                            </div>
                            <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center bg-surface-3 font-display text-gold text-xs border border-rune">
                              {m[0].toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-display text-foreground">{m}</p>
                              {p ? (
                                <p className="text-[10px] text-muted-foreground">
                                  {eligible ? `NM${p.nightmaresPassed + 1} unlocked` : "Not eligible"}
                                </p>
                              ) : (
                                <p className="text-[10px] text-muted-foreground/50">No profile</p>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {nmCount > 0 && (
                  <div className="bg-surface-3 border border-destructive/20 px-3 py-2 space-y-0.5">
                    <p className="text-[10px] uppercase tracking-[0.15em] text-destructive mb-1">Cohort Bonuses</p>
                    <p className="text-[11px] text-foreground/80">−{thresholdBonus}% required threshold ({nmCount} × 3%)</p>
                    <p className="text-[11px] text-foreground/80">+{memoryBonus}% memory drop chance ({nmCount} × 10%)</p>
                    <p className="text-[11px] text-foreground/80">Combined Kgs — all members' volumes pooled</p>
                  </div>
                )}

                <button
                  disabled={eligibleMembers.length === 0}
                  onClick={() => {
                    const threshold = 0.10 + Math.random() * 0.20; // rolled by initiator
                    const lastSets = state.lastNightmareSets ?? state.firstNightmareSets ?? [];
                    createCohortNightmareSession(
                      cohort.code,
                      cohort.name,
                      currentUser,
                      [...nmSelectedMembers],
                      myNextNM,
                      threshold,
                      lastSets,
                    );
                    navigate({ to: "/nightmare" });
                  }}
                  className="w-full py-2.5 bg-destructive/20 border border-destructive/60 font-display text-xs tracking-[0.15em] text-destructive hover:bg-destructive/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  {nmCount > 0 ? `CHALLENGE WITH ${nmCount} MEMBER${nmCount > 1 ? "S" : ""}` : "CHALLENGE SOLO (NM RULES)"}
                </button>
                {nmCount === 0 && eligibleMembers.length > 0 && (
                  <p className="text-[9px] text-muted-foreground/60 text-center">Select at least one member for cohort bonuses</p>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* Members */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">Members</p>
        <div className="space-y-2">
          {cohort.members.map(username => {
            const profile   = profileMap[username];
            const isMe      = username === currentUser;
            const isExpanded = expandedId === username;
            if (!profile) {
              return (
                <div key={username} className="bg-surface-2 border-rune p-3 flex items-center gap-3">
                  <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center bg-surface-3 font-display text-gold text-xs border border-rune">
                    {username[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-display text-sm text-gold">{username}{isMe ? " (you)" : ""}</p>
                    <p className="text-[10px] text-muted-foreground">No profile yet</p>
                  </div>
                  {isLeader && !isMe && (
                    <button
                      onClick={() => {
                        const all = cohort.members.filter(m => m !== username);
                        // Directly update cohort members
                        leaveSocialCohort(cohort.code, username);
                        onRefresh();
                      }}
                      className="text-[10px] text-muted-foreground border border-rune px-2 py-1 hover:border-destructive/50 hover:text-destructive transition-colors"
                    >
                      Kick
                    </button>
                  )}
                </div>
              );
            }
            return (
              <ProfileCard
                key={username}
                profile={{ ...profile, username: isMe ? `${username} (you)` : username }}
                expanded={isExpanded}
                onToggle={() => setExpandedId(isExpanded ? null : username)}
                actions={
                  isLeader && !isMe ? (
                    <button
                      onClick={() => { leaveSocialCohort(cohort.code, username); onRefresh(); }}
                      className="text-[10px] text-muted-foreground border border-rune px-2 py-1 hover:border-destructive/50 hover:text-destructive transition-colors"
                    >
                      Kick
                    </button>
                  ) : undefined
                }
              />
            );
          })}
        </div>
      </div>

      {/* Leave / Disband */}
      <div className="pt-2 border-t border-rune">
        {!confirmLeave ? (
          <button
            onClick={() => setConfirmLeave(true)}
            className="w-full py-2.5 border border-destructive/40 font-display text-xs tracking-[0.15em] text-destructive hover:bg-destructive/10 transition-colors"
          >
            {isLeader ? "DISBAND COHORT" : "LEAVE COHORT"}
          </button>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-destructive text-center">
              {isLeader ? "This will permanently dissolve the cohort for all members." : "You will leave this cohort."}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmLeave(false)}
                className="flex-1 py-2 border border-rune text-xs text-muted-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (isLeader) disbandCohort(cohort.code, currentUser);
                  else leaveSocialCohort(cohort.code, currentUser);
                  onRefresh();
                }}
                className="flex-1 py-2 border border-destructive/60 text-xs text-destructive hover:bg-destructive/10 transition-colors"
              >
                {isLeader ? "Disband" : "Leave"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────

function FriendsPage() {
  const navigate    = useNavigate();
  const currentUser = getCurrentUser();
  const [tab, setTab] = useState<Tab>("friends");
  const [, forceUpdate] = useState(0);

  if (!currentUser || currentUser === "__guest__") {
    return (
      <div className="min-h-screen pb-24 max-w-md mx-auto flex flex-col">
        <header className="px-5 pt-6 pb-3">
          <button onClick={() => navigate({ to: "/" })} className="text-[10px] text-muted-foreground uppercase tracking-widest">← Home</button>
          <h1 className="font-display text-lg text-gold tracking-[0.2em] text-glow mt-3">FRIENDS</h1>
        </header>
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <Users size={36} className="text-muted-foreground/40 mb-4" />
          <p className="font-display text-sm text-gold tracking-wider mb-2">Account Required</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Create an account to add friends, join cohorts, and appear on the real leaderboard.
          </p>
          <button
            onClick={() => navigate({ to: "/" })}
            className="mt-6 border border-rune px-6 py-2.5 font-display text-xs tracking-[0.15em] text-muted-foreground hover:border-gold/30 hover:text-gold transition-all"
          >
            RETURN HOME
          </button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const pendingCount = getIncomingRequests(currentUser).length + getCohortInvitesForUser(currentUser).length;

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "friends", label: "Friends",   icon: <Users size={13} /> },
    { id: "find",    label: "Find",      icon: <Search size={13} /> },
    { id: "pending", label: "Pending",   icon: <Clock size={13} /> },
    { id: "cohort",  label: "Cohort",    icon: <Swords size={13} /> },
  ];

  return (
    <div className="min-h-screen pb-24 max-w-md mx-auto">
      <header className="px-5 pt-6 pb-3">
        <button onClick={() => navigate({ to: "/" })} className="text-[10px] text-muted-foreground uppercase tracking-widest">← Home</button>
        <h1 className="font-display text-lg text-gold tracking-[0.2em] text-glow mt-3">FRIENDS</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Signed in as <span className="text-gold">{currentUser}</span>
        </p>
      </header>

      {/* Tab bar */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-4 border border-rune overflow-hidden">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative flex flex-col items-center gap-1 py-2.5 text-[10px] tracking-[0.1em] uppercase transition-all ${
                tab === t.id
                  ? "bg-gold/15 text-gold border-b-2 border-b-gold"
                  : "bg-surface-2 text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.icon}
              {t.label}
              {t.id === "pending" && pendingCount > 0 && (
                <span className="absolute top-1 right-1 bg-destructive text-[8px] text-white w-4 h-4 flex items-center justify-center rounded-full font-bold">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div key={tab}>
        {tab === "friends" && <FriendsTab currentUser={currentUser} />}
        {tab === "find"    && <FindFriendsTab currentUser={currentUser} />}
        {tab === "pending" && <PendingTab currentUser={currentUser} />}
        {tab === "cohort"  && <CohortTab currentUser={currentUser} />}
      </div>

      <BottomNav />
    </div>
  );
}
