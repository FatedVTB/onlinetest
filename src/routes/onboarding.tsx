import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/lib/store";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  head: () => ({ meta: [{ title: "Enter Your Stats — Shadow Slave" }] }),
});

// ── Body constitution definitions ────────────────────────────────────────────
// All half-widths measured from centre (cx = 30) in SVG units (viewBox 0 0 60 132)
type ConstitutionDef = {
  name: string;
  desc: string;
  sh: number;   // shoulder half-width
  ax: number;   // upper-arm/armpit outer half-width
  ch: number;   // chest / belly half-width (widest torso point)
  wa: number;   // waist half-width
  hi: number;   // hip half-width
  lw: number;   // leg half-width
  ls?: number;  // leg separation from centre (default 2)
};

const CONSTITUTIONS: ConstitutionDef[] = [
  { name: "Ectomorph",    desc: "Naturally thin, narrow frame",       sh: 13, ax: 12, ch: 11, wa: 10, hi: 11, lw: 5 },
  { name: "Skinny Fat",   desc: "Thin build with higher body fat",    sh: 14, ax: 13, ch: 15, wa: 14, hi: 13, lw: 5 },
  { name: "Lean",         desc: "Slim and lightly built",             sh: 15, ax: 14, ch: 12, wa: 10, hi: 12, lw: 6 },
  { name: "Average",      desc: "Typical build, moderate fat",        sh: 16, ax: 15, ch: 14, wa: 13, hi: 14, lw: 6 },
  { name: "Athletic",     desc: "Active and visibly toned",           sh: 18, ax: 16, ch: 13, wa: 11, hi: 13, lw: 6 },
  { name: "Muscular",     desc: "Well built with visible muscle",     sh: 19, ax: 17, ch: 14, wa: 12, hi: 13, lw: 7 },
  { name: "Aesthetic",    desc: "Strong V-taper, defined physique",   sh: 21, ax: 18, ch: 14, wa: 10, hi: 12, lw: 7 },
  { name: "Stocky",       desc: "Dense, wide and compact frame",      sh: 18, ax: 17, ch: 16, wa: 15, hi: 16, lw: 7 },
  { name: "Powerbuilt",   desc: "Heavy muscle mass, thick build",     sh: 21, ax: 19, ch: 17, wa: 15, hi: 16, lw: 8 },
  { name: "Big & Strong", desc: "Large frame, strong but heavy",      sh: 19, ax: 18, ch: 20, wa: 18, hi: 18, lw: 8 },
  { name: "Overweight",   desc: "Extra body fat, softer build",       sh: 17, ax: 16, ch: 19, wa: 18, hi: 18, lw: 8 },
  { name: "Obese",        desc: "High body fat throughout",           sh: 18, ax: 18, ch: 23, wa: 22, hi: 21, lw: 10, ls: 3 },
];

const TRAINING = ["Bodybuilding", "Powerlifting", "Calisthenics", "CrossFit", "Athletic", "General"];

// ── SVG body silhouette ───────────────────────────────────────────────────────
// Generates a front-view body outline using quadratic Bézier curves.
// The path traces: neck-left → shoulder → armpit → belly → waist → hip → legs
// then mirrors back up the right side.
function BodySilhouette({ sh, ax, ch, wa, hi, lw, ls = 2 }: Omit<ConstitutionDef, "name" | "desc">) {
  const cx = 30;

  const d = [
    // ── Left side going down ───────────────────────────────────────────────
    `M ${cx - 3.5} 17`,
    // neck → shoulder (curves out)
    `Q ${cx - sh * 0.55} 19 ${cx - sh} 24`,
    // shoulder → armpit outer (arm silhouette)
    `Q ${cx - ax - 1} 33 ${cx - ax} 41`,
    // armpit → belly/chest (may curve in or out depending on build)
    `Q ${cx - ch} 49 ${cx - ch} 56`,
    // belly → waist (curves in for most builds)
    `Q ${cx - wa - 0.5} 62 ${cx - wa} 67`,
    // waist → hip
    `Q ${cx - hi} 72 ${cx - hi} 77`,
    // hip → outer leg top (curves inward to leg)
    `L ${cx - ls - lw} 84`,
    // outer leg down
    `L ${cx - ls - lw} 108`,
    `L ${cx - ls - lw + 1} 126`,
    // foot (left outer to left inner)
    `L ${cx - ls + 1} 126`,
    // inner leg back up
    `L ${cx - ls} 108`,
    `L ${cx - ls} 84`,

    // ── Crotch gap ────────────────────────────────────────────────────────
    `L ${cx + ls} 84`,

    // ── Right side (inner leg down, outer leg up) ─────────────────────────
    `L ${cx + ls} 108`,
    `L ${cx + ls - 1} 126`,
    // foot (right inner to right outer)
    `L ${cx + ls + lw - 1} 126`,
    // outer leg up
    `L ${cx + ls + lw} 108`,
    `L ${cx + ls + lw} 84`,

    // ── Right side going up ────────────────────────────────────────────────
    // leg top → hip (outward)
    `L ${cx + hi} 77`,
    // hip → waist
    `Q ${cx + wa} 72 ${cx + wa} 67`,
    // waist → belly/chest
    `Q ${cx + ch + 0.5} 62 ${cx + ch} 56`,
    // belly → armpit
    `Q ${cx + ch} 49 ${cx + ax} 41`,
    // armpit → shoulder
    `Q ${cx + ax + 1} 33 ${cx + sh} 24`,
    // shoulder → neck
    `Q ${cx + sh * 0.55} 19 ${cx + 3.5} 17`,
    `Z`,
  ].join(" ");

  return (
    <svg viewBox="0 0 60 132" className="w-full h-full" fill="currentColor">
      <circle cx={30} cy={9} r={7} />
      <path d={d} />
    </svg>
  );
}

// ── Main component ─────────────────────────────────────────────────────────
function Onboarding() {
  const navigate = useNavigate();
  const { setProfile } = useGame();
  const [name, setName]             = useState("");
  const [height, setHeight]         = useState("");
  const [weight, setWeight]         = useState("");
  const [trainingType, setTrainingType] = useState(TRAINING[0]);
  const [yearsTraining, setYearsTraining] = useState("");
  const [constitution, setConstitution]   = useState(CONSTITUTIONS[3].name); // default Average

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !height || !weight) return;
    setProfile({
      name,
      height:       Number(height),
      weight:       Number(weight),
      trainingType,
      yearsTraining: Number(yearsTraining || 0),
      constitution,
    });
    navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen px-6 py-10 max-w-md mx-auto">
      <p className="text-xs uppercase tracking-[0.4em] text-accent mb-2 text-center">Initiation</p>
      <h1 className="font-display text-2xl text-glow text-center mb-8">Enter Your Stats</h1>

      <form onSubmit={submit} className="space-y-4">
        {/* Name */}
        <Field label="Aspirant Name">
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            className={inp}
            placeholder="Your name"
          />
        </Field>

        {/* Height / Weight */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Height (cm)">
            <input type="number" value={height} onChange={e => setHeight(e.target.value)} required className={inp} />
          </Field>
          <Field label="Weight (kg)">
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)} required className={inp} />
          </Field>
        </div>

        {/* Training type */}
        <Field label="Training Type">
          <select value={trainingType} onChange={e => setTrainingType(e.target.value)} className={inp}>
            {TRAINING.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>

        {/* Years training */}
        <Field label="Years Training">
          <input
            type="number"
            step="0.5"
            value={yearsTraining}
            onChange={e => setYearsTraining(e.target.value)}
            className={inp}
            placeholder="0"
          />
        </Field>

        {/* Body constitution — scrollable silhouette cards */}
        <div>
          <span className="text-xs uppercase tracking-widest text-muted-foreground mb-3 block">
            Body Constitution
          </span>

          {/* Scroll hint */}
          <p className="text-[10px] text-muted-foreground/40 mb-2 tracking-wider">
            Swipe to see all types · tap to select
          </p>

          <div
            className="flex gap-3 overflow-x-auto pb-3 -mx-1 px-1"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            {CONSTITUTIONS.map(c => {
              const selected = constitution === c.name;
              return (
                <button
                  type="button"
                  key={c.name}
                  onClick={() => setConstitution(c.name)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 pt-3 pb-2.5 px-2 border transition-all w-[82px] ${
                    selected
                      ? "border-gold bg-gold/10 text-gold"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 active:border-primary/40"
                  }`}
                >
                  {/* Silhouette */}
                  <div
                    className="w-10 h-[72px] flex items-end justify-center"
                    style={{ color: selected ? "rgba(201,168,76,0.85)" : "rgba(255,255,255,0.18)" }}
                  >
                    <BodySilhouette {...c} />
                  </div>

                  {/* Name */}
                  <span
                    className={`text-[10px] font-display tracking-wide text-center leading-tight block mt-1 ${
                      selected ? "text-gold" : "text-foreground/60"
                    }`}
                  >
                    {c.name}
                  </span>

                  {/* Short descriptor */}
                  <span
                    className={`text-[8px] text-center leading-tight ${
                      selected ? "text-gold/60" : "text-muted-foreground/35"
                    }`}
                  >
                    {c.desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Selected label */}
          <p className="text-[11px] text-center mt-2 text-muted-foreground">
            Selected:{" "}
            <span className="text-gold font-display tracking-wide">{constitution}</span>
          </p>
        </div>

        <button
          type="submit"
          className="w-full bg-spell text-primary-foreground font-display tracking-widest py-4 rounded-2xl shadow-spell mt-4"
        >
          Receive the Spell
        </button>
      </form>
    </div>
  );
}

const inp =
  "w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:shadow-glow transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
