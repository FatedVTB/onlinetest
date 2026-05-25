import { useState } from "react";
import { login, register, continueAsGuest, hasLegacyData, listAccounts } from "@/lib/auth";

type Tab = "signin" | "register";

export function AuthScreen() {
  const [tab, setTab]       = useState<Tab>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);

  const legacy      = hasLegacyData();
  const accountCount = listAccounts().length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (tab === "register") {
        if (password !== confirm) {
          setError("Passwords do not match.");
          return;
        }
        const res = await register(username, password);
        if (!res.success) { setError(res.error ?? "Registration failed."); return; }
      } else {
        const res = await login(username, password);
        if (!res.success) { setError(res.error ?? "Login failed."); return; }
      }
      // Success — navigate to "/" and do a full reload so the store module
      // re-derives the correct per-user localStorage key from scratch.
      window.location.replace("/");
    } finally {
      setLoading(false);
    }
  }

  function switchTab(t: Tab) {
    setTab(t);
    setError(null);
    setUsername("");
    setPassword("");
    setConfirm("");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-12 max-w-md mx-auto">

      {/* Logo / title */}
      <div className="text-center mb-8">
        <p className="text-[10px] uppercase tracking-[0.4em] text-gold/70 mb-3">Nightmare Ascension ✓ UPDATED</p>
        <h1 className="font-display text-2xl text-gold tracking-[0.2em] text-glow-strong">
          {tab === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}
        </h1>
        <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
          {tab === "signin"
            ? "Enter your credentials to resume your ascension."
            : "Forge a new identity and begin your journey."}
        </p>
      </div>

      {/* Legacy data notice */}
      {legacy && tab === "register" && accountCount === 0 && (
        <div className="w-full mb-4 px-3.5 py-2.5 bg-gold/8 border border-gold/30">
          <p className="text-[11px] text-gold font-display tracking-wide mb-0.5">Existing Save Detected</p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Your first account will automatically import your existing progress.
          </p>
        </div>
      )}

      {/* Tab switcher */}
      <div className="w-full grid grid-cols-2 gap-0 mb-6 border border-rune overflow-hidden">
        {(["signin", "register"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`py-3 text-xs font-display tracking-[0.15em] transition-all ${
              tab === t
                ? "bg-gold/15 text-gold border-b-2 border-b-gold"
                : "bg-surface-2 text-muted-foreground hover:text-foreground"
            }`}
          >
            {t === "signin" ? "SIGN IN" : "REGISTER"}
          </button>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full space-y-3">
        {/* Username */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Username</p>
          <input
            type="text"
            autoComplete={tab === "signin" ? "username" : "new-username"}
            value={username}
            onChange={e => { setUsername(e.target.value); setError(null); }}
            required
            maxLength={20}
            placeholder={tab === "register" ? "3–20 chars, letters/numbers/_/-" : "Your username"}
            className="w-full bg-surface-2 border border-rune px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        {/* Password */}
        <div>
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Password</p>
          <input
            type="password"
            autoComplete={tab === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null); }}
            required
            minLength={tab === "register" ? 6 : 1}
            placeholder={tab === "register" ? "At least 6 characters" : "Your password"}
            className="w-full bg-surface-2 border border-rune px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/50 transition-colors"
          />
        </div>

        {/* Confirm password (register only) */}
        {tab === "register" && (
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-1.5">Confirm Password</p>
            <input
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={e => { setConfirm(e.target.value); setError(null); }}
              required
              placeholder="Re-enter password"
              className="w-full bg-surface-2 border border-rune px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-gold/50 transition-colors"
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="px-3.5 py-2.5 bg-destructive/10 border border-destructive/40">
            <p className="text-[11px] text-destructive">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-br from-gold-dim to-gold text-background font-display tracking-[0.2em] text-sm py-4 mt-2 disabled:opacity-50 transition-opacity"
        >
          {loading
            ? "..."
            : tab === "signin"
            ? "ENTER THE NIGHTMARE"
            : "FORGE MY SOUL"}
        </button>
      </form>

      {/* Divider */}
      <div className="w-full flex items-center gap-3 my-5">
        <div className="flex-1 h-px bg-rune" />
        <span className="text-[10px] text-muted-foreground/40 tracking-wider">OR</span>
        <div className="flex-1 h-px bg-rune" />
      </div>

      {/* Guest / skip */}
      <button
        onClick={continueAsGuest}
        className="w-full py-3 border border-rune text-muted-foreground text-xs font-display tracking-[0.15em] hover:border-gold/30 hover:text-foreground transition-all"
      >
        CONTINUE WITHOUT ACCOUNT
      </button>
      <p className="text-[10px] text-muted-foreground/35 mt-2 text-center leading-relaxed">
        Your progress is saved on this device only. You can create an account later.
      </p>

      {/* Storage notice */}
      <p className="text-[10px] text-muted-foreground/25 mt-8 text-center leading-relaxed max-w-xs">
        Accounts and saves are stored locally on this device.
        Logging in on another device will start fresh — export is not yet supported.
      </p>
    </div>
  );
}
