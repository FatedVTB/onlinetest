import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useGame } from "@/lib/store";
import type { Platform } from "@/lib/store";
import { getCurrentUser, logout, deleteAccount } from "@/lib/auth";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
  head: () => ({ meta: [{ title: "Settings — Shadow Slave" }] }),
});

// Must match the CONSTITUTIONS list in onboarding.tsx exactly
const CONSTITUTIONS = [
  "Ectomorph", "Skinny Fat", "Lean", "Average",
  "Athletic", "Muscular", "Aesthetic", "Stocky",
  "Powerbuilt", "Big & Strong", "Overweight", "Obese",
] as const;

const TRAINING = [
  "Bodybuilding", "Powerlifting", "Calisthenics", "CrossFit", "Athletic", "General",
] as const;

// ── Shared helpers ─────────────────────────────────────────────────────────

const inp =
  "w-full bg-surface-3 border border-rune px-3 py-2.5 text-sm text-foreground " +
  "focus:outline-none focus:border-gold/50 transition-colors";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">{label}</p>
      {children}
    </div>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] tracking-[0.2em] text-muted-foreground uppercase mb-2">{children}</p>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

function SettingsPage() {
  const navigate  = useNavigate();
  const { state, setProfile, setPlatform, reset } = useGame();

  // ── Biometrics form state (seeded from saved profile) ──────────────────
  const [name,          setName]          = useState(state.profile?.name          ?? "");
  const [height,        setHeight]        = useState(String(state.profile?.height       ?? ""));
  const [weight,        setWeight]        = useState(String(state.profile?.weight       ?? ""));
  const [trainingType,  setTrainingType]  = useState(state.profile?.trainingType  ?? TRAINING[0]);
  const [yearsTraining, setYearsTraining] = useState(String(state.profile?.yearsTraining ?? ""));
  const [constitution,  setConstitution]  = useState(state.profile?.constitution  ?? CONSTITUTIONS[0]);

  // ── UI state ───────────────────────────────────────────────────────────
  const [bioSaved,      setBioSaved]      = useState(false);
  const [confirmErase,  setConfirmErase]  = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // ── Fullscreen ─────────────────────────────────────────────────────────
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== "undefined" && !!document.fullscreenElement
  );

  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!(document.fullscreenElement ?? (document as any).webkitFullscreenElement));
    }
    document.addEventListener("fullscreenchange",       onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange);
    return () => {
      document.removeEventListener("fullscreenchange",       onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange);
    };
  }, []);

  // iOS Safari doesn't expose the Fullscreen API for arbitrary elements
  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone = typeof navigator !== "undefined" && !!(navigator as any).standalone;
  const fullscreenAvailable =
    typeof document !== "undefined" &&
    (document.fullscreenEnabled || !!(document as any).webkitFullscreenEnabled);

  function toggleFullscreen() {
    const doc = document as any;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      (doc.exitFullscreen ?? doc.webkitExitFullscreen).call(document);
    } else {
      const el = document.documentElement as any;
      (el.requestFullscreen ?? el.webkitRequestFullscreen).call(el);
    }
  }

  if (!state.profile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <p className="text-muted-foreground text-sm text-center">
          Begin your journey first — no profile found.
        </p>
      </div>
    );
  }

  const isMobile = state.platform === "mobile";

  // ── Handlers ───────────────────────────────────────────────────────────

  function saveBiometrics() {
    if (!name.trim()) return;
    setProfile({
      name:          name.trim(),
      height:        Number(height)        || state.profile!.height,
      weight:        Number(weight)        || state.profile!.weight,
      trainingType,
      yearsTraining: Number(yearsTraining) || 0,
      constitution,
    });
    setBioSaved(true);
    setTimeout(() => setBioSaved(false), 2200);
  }

  function handleErase() {
    reset();
    navigate({ to: "/" });
  }

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen pb-16 max-w-md mx-auto">

      {/* Header */}
      <header className="px-5 pt-6 pb-4 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/" })}
          className="text-muted-foreground hover:text-gold transition-colors text-lg leading-none"
          aria-label="Back to Home"
        >
          ←
        </button>
        <h1 className="font-display text-lg text-gold tracking-[0.2em]">SETTINGS</h1>
      </header>

      <div className="px-4 space-y-6">

        {/* ── Biometrics ─────────────────────────────────────────────────── */}
        <section>
          <SectionHeading>Biometrics</SectionHeading>
          <div className="bg-surface-2 border-rune p-4 space-y-4">

            <Field label="Aspirant Name">
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className={inp}
                placeholder="Your name"
                maxLength={32}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Height (cm)">
                <input
                  type="number"
                  value={height}
                  onChange={e => setHeight(e.target.value)}
                  className={inp}
                  min={100}
                  max={250}
                />
              </Field>
              <Field label="Weight (kg)">
                <input
                  type="number"
                  value={weight}
                  onChange={e => setWeight(e.target.value)}
                  className={inp}
                  min={30}
                  max={300}
                />
              </Field>
            </div>

            <Field label="Training Style">
              <select
                value={trainingType}
                onChange={e => setTrainingType(e.target.value)}
                className={inp}
              >
                {TRAINING.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <Field label="Years Training">
              <input
                type="number"
                step="0.5"
                value={yearsTraining}
                onChange={e => setYearsTraining(e.target.value)}
                className={inp}
                placeholder="0"
                min={0}
                max={60}
              />
            </Field>

            <Field label="Body Constitution">
              <div className="flex flex-wrap gap-2">
                {CONSTITUTIONS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setConstitution(c)}
                    className={`px-3 py-2 text-[11px] border transition-all leading-tight whitespace-nowrap ${
                      constitution === c
                        ? "bg-gold/15 border-gold/60 text-gold font-display tracking-wide"
                        : "bg-surface-3 border-rune text-muted-foreground hover:border-gold/30"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Field>

            {/* Save button */}
            <button
              onClick={saveBiometrics}
              disabled={!name.trim()}
              className={`w-full py-3 font-display tracking-[0.15em] text-sm transition-all ${
                bioSaved
                  ? "bg-surface-3 border border-gold/30 text-gold"
                  : "bg-gradient-to-br from-gold-dim to-gold text-background hover:opacity-90 disabled:opacity-40"
              }`}
            >
              {bioSaved ? "✓ CHANGES SAVED" : "SAVE CHANGES"}
            </button>

          </div>
        </section>

        {/* ── Interface ──────────────────────────────────────────────────── */}
        <section>
          <SectionHeading>Interface</SectionHeading>
          <div className="bg-surface-2 border-rune p-4">
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Switch how the app looks and behaves. Changes take effect immediately across all screens.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <InterfaceCard
                emoji="🖥"
                label="DESKTOP"
                description="Full visual experience"
                active={!isMobile}
                onClick={() => setPlatform("desktop")}
              />
              <InterfaceCard
                emoji="📱"
                label="MOBILE"
                description="Optimised for phones"
                active={isMobile}
                onClick={() => setPlatform("mobile")}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/50 mt-3 text-center">
              Currently: <span className={isMobile ? "text-gold" : "text-foreground/60"}>
                {isMobile ? "Mobile" : "Desktop"}
              </span>
            </p>

            {/* ── Fullscreen ──────────────────────────────────────── */}
            <div className="mt-4 pt-4 border-t border-rune">
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
                Fullscreen
              </p>

              {fullscreenAvailable ? (
                <button
                  onClick={toggleFullscreen}
                  className={`w-full py-3 font-display tracking-[0.15em] text-sm border transition-all ${
                    isFullscreen
                      ? "bg-gold/12 border-gold/55 text-gold"
                      : "bg-surface-3 border-rune text-muted-foreground hover:border-gold/30 hover:text-foreground"
                  }`}
                >
                  {isFullscreen ? "⛶  EXIT FULLSCREEN" : "⛶  ENTER FULLSCREEN"}
                </button>
              ) : isIOS && !isStandalone ? (
                <div className="bg-surface-3 border-rune p-3.5">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    iOS Safari doesn't support fullscreen for web apps.
                  </p>
                  <p className="text-[11px] text-gold/80 mt-2 leading-relaxed">
                    Tap <span className="font-display tracking-wide">Share → Add to Home Screen</span> to run the app fullscreen without the browser bar.
                  </p>
                </div>
              ) : isIOS && isStandalone ? (
                <div className="bg-surface-3 border-rune p-3.5">
                  <p className="text-[11px] text-gold/80 leading-relaxed">
                    ✓ Running as a Home Screen app — already in fullscreen mode.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] text-muted-foreground/50">
                  Fullscreen not supported by this browser.
                </p>
              )}
            </div>

          </div>
        </section>

        {/* ── Account ────────────────────────────────────────────────────── */}
        <section>
          <SectionHeading>Account</SectionHeading>
          <div className="bg-surface-2 border-rune p-4 space-y-4">
            {/* Current user display */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-0.5">Signed in as</p>
                {(() => {
                  const u = getCurrentUser();
                  const isGuest = !u || u === "__guest__";
                  return (
                    <p className={`font-display text-sm tracking-wide ${isGuest ? "text-muted-foreground" : "text-gold"}`}>
                      {isGuest ? "Guest" : u}
                    </p>
                  );
                })()}
              </div>
              <div className="w-9 h-9 flex items-center justify-center bg-surface-3 border border-rune">
                <span className="text-lg select-none">👤</span>
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
              Progress is stored on this device. Signing out will return you to the login screen —
              your save is still here when you sign back in.
            </p>

            <button
              onClick={() => logout()}
              className="w-full py-3 border border-rune text-muted-foreground text-xs font-display tracking-[0.15em] hover:border-gold/30 hover:text-foreground transition-all"
            >
              SIGN OUT
            </button>
          </div>
        </section>

        {/* ── Danger zone ────────────────────────────────────────────────── */}
        <section>
          <SectionHeading>Danger Zone</SectionHeading>
          <div className="bg-surface-2 border border-destructive/25 p-4">
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              Permanently deletes all progress — nightmares, shards, aspects, memories, and true names.
              This cannot be undone.
            </p>

            {!confirmErase ? (
              <button
                onClick={() => { setConfirmErase(true); setConfirmDelete(false); }}
                className="w-full py-3 border border-destructive/50 text-destructive text-xs font-display tracking-[0.15em] hover:bg-destructive/8 transition-all"
              >
                ERASE ALL PROGRESS
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-destructive text-center font-display tracking-wider py-1">
                  This will erase everything. Are you certain?
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setConfirmErase(false)}
                    className="py-2.5 border border-rune text-muted-foreground text-xs hover:border-gold/30 hover:text-foreground transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleErase}
                    className="py-2.5 bg-destructive text-destructive-foreground text-xs font-display tracking-[0.15em]"
                  >
                    ERASE
                  </button>
                </div>
              </div>
            )}

            {/* ── Delete account ─────────────────────────────────── */}
            {(() => {
              const currentUsername = getCurrentUser();
              const isGuest = !currentUsername || currentUsername === "__guest__";
              if (isGuest) return null; // guests have no account record to delete
              return (
                <div className="mt-4 pt-4 border-t border-destructive/20">
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    Permanently deletes your account and all saved progress.
                    Your username <span className="text-destructive font-display tracking-wide">{currentUsername}</span> will
                    become available for others to register.
                  </p>
                  {!confirmDelete ? (
                    <button
                      onClick={() => { setConfirmDelete(true); setConfirmErase(false); }}
                      className="w-full py-3 border border-destructive/70 text-destructive text-xs font-display tracking-[0.15em] hover:bg-destructive/10 transition-all"
                    >
                      DELETE ACCOUNT
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-xs text-destructive text-center font-display tracking-wider py-1">
                        All progress erased · account deleted · cannot be undone.
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="py-2.5 border border-rune text-muted-foreground text-xs hover:border-gold/30 hover:text-foreground transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => void deleteAccount()}
                          className="py-2.5 bg-destructive text-destructive-foreground text-xs font-display tracking-[0.15em]"
                        >
                          DELETE
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </section>

        {/* Version / feedback */}
        <div className="text-center pb-4">
          <p className="text-[10px] text-muted-foreground/35 mb-1">Beta · Feedback welcome</p>
          <a
            href="mailto:nmadevs.official@gmail.com"
            className="font-display text-[11px] text-gold/60 hover:text-gold transition-colors tracking-wider"
          >
            nmadevs.official@gmail.com
          </a>
        </div>

      </div>
    </div>
  );
}

// ── Interface option card ──────────────────────────────────────────────────

function InterfaceCard({
  emoji, label, description, active, onClick,
}: {
  emoji: string;
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`p-3.5 text-left border transition-all ${
        active
          ? "bg-gold/12 border-gold/55"
          : "bg-surface-3 border-rune hover:border-gold/30"
      }`}
    >
      <p className="text-xl mb-1.5 select-none">{emoji}</p>
      <p className={`font-display text-xs tracking-wider mb-1 ${active ? "text-gold" : "text-muted-foreground"}`}>
        {label}
      </p>
      <p className="text-[10px] text-muted-foreground leading-snug">{description}</p>
      {active && (
        <p className="text-[9px] text-gold/70 mt-1.5 tracking-wider">✓ ACTIVE</p>
      )}
    </button>
  );
}
