import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useGame } from "@/lib/store";

export const Route = createFileRoute("/onboarding")({
  component: Onboarding,
  head: () => ({ meta: [{ title: "Enter Your Stats — Shadow Slave" }] }),
});

const CONSTITUTIONS = ["Skinny", "Skinny Fat", "Average", "Muscle Aesthetic", "Muscle Bulk", "Fat"];
const TRAINING = ["Bodybuilding", "Powerlifting", "Calisthenics", "CrossFit", "Athletic", "General"];

function Onboarding() {
  const navigate = useNavigate();
  const { setProfile } = useGame();
  const [name, setName] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [trainingType, setTrainingType] = useState(TRAINING[0]);
  const [yearsTraining, setYearsTraining] = useState("");
  const [constitution, setConstitution] = useState(CONSTITUTIONS[0]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !height || !weight) return;
    setProfile({
      name,
      height: Number(height),
      weight: Number(weight),
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
        <Field label="Aspirant Name">
          <input value={name} onChange={e => setName(e.target.value)} required className={inp} placeholder="Your name" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Height (cm)">
            <input type="number" value={height} onChange={e => setHeight(e.target.value)} required className={inp} />
          </Field>
          <Field label="Weight (kg)">
            <input type="number" value={weight} onChange={e => setWeight(e.target.value)} required className={inp} />
          </Field>
        </div>
        <Field label="Training Type">
          <select value={trainingType} onChange={e => setTrainingType(e.target.value)} className={inp}>
            {TRAINING.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Years Training">
          <input type="number" step="0.5" value={yearsTraining} onChange={e => setYearsTraining(e.target.value)} className={inp} placeholder="0" />
        </Field>
        <Field label="Body Constitution">
          <div className="grid grid-cols-2 gap-2">
            {CONSTITUTIONS.map(c => (
              <button
                type="button"
                key={c}
                onClick={() => setConstitution(c)}
                className={`p-3 rounded-xl text-sm border transition-all ${
                  constitution === c
                    ? "bg-spell text-primary-foreground border-transparent shadow-glow"
                    : "bg-card border-border text-foreground hover:border-primary/40"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </Field>
        <button type="submit" className="w-full bg-spell text-primary-foreground font-display tracking-widest py-4 rounded-2xl shadow-spell mt-4">
          Receive the Spell
        </button>
      </form>
    </div>
  );
}

const inp = "w-full bg-input border border-border rounded-xl px-4 py-3 text-foreground focus:outline-none focus:border-primary focus:shadow-glow transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-muted-foreground mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}
