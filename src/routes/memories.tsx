import { createFileRoute, Link } from "@tanstack/react-router";
import { useGame } from "@/lib/store";
import { RANK_COLOR, getMemoryEffect, type MemoryType } from "@/lib/memories";
import { useState } from "react";
import { BottomNav } from "@/components/BottomNav";

export const Route = createFileRoute("/memories")({
  component: MemoriesPage,
  head: () => ({ meta: [{ title: "Memories — Shadow Slave" }] }),
});

const TYPES: Array<MemoryType | "All"> = ["All", "Weapon", "Armour", "Charm", "Tool"];
const TYPE_ICON: Record<MemoryType, string> = {
  Weapon: "🗡️", Armour: "🛡️", Charm: "🪬", Tool: "⛓️",
};

function MemoriesPage() {
  const { state, equipMemory, unequipMemory } = useGame();
  const [filter, setFilter] = useState<MemoryType | "All">("All");

  const list = state.memories.filter(m => filter === "All" || m.type === filter);
  const equippedCount = state.equippedMemoryIds.length;

  return (
    <div className="min-h-screen px-5 py-8 max-w-md mx-auto pb-32">
      <Link to="/" className="text-xs text-muted-foreground uppercase tracking-widest">← Home</Link>
      <p className="text-xs uppercase tracking-[0.4em] text-accent mt-4 text-center">Vault</p>
      <h1 className="font-display text-2xl text-glow text-center mt-1 mb-1">Memories</h1>
      <p className="text-center text-xs text-muted-foreground mb-1">
        Items left behind by slain Nightmare Creatures.
      </p>
      <p className="text-center text-xs text-gold mb-5">
        {equippedCount} equipped — bonuses apply during expeditions
      </p>

      <div className="flex flex-wrap gap-2 mb-5 justify-center">
        {TYPES.map(t => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-full text-xs border transition-all ${
              filter === t
                ? "bg-spell text-primary-foreground border-transparent shadow-glow"
                : "bg-card border-border text-muted-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm mt-16">
          The vault is empty. Slay creatures in the Dream Realm to recover Memories.
        </div>
      ) : (
        <div className="space-y-3">
          {list.map(m => {
            const equipped = state.equippedMemoryIds.includes(m.id);
            const effect = getMemoryEffect(m);
            const hasEffect = Object.keys(effect).length > 0;
            return (
              <div
                key={m.id}
                className={`border rounded-xl p-3 bg-card transition-all ${
                  equipped ? "border-gold/60 bg-gold/5" : "border-border"
                }`}
              >
                <div className="flex items-baseline justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{TYPE_ICON[m.type]}</span>
                    <p className={`font-display ${RANK_COLOR[m.rank]}`}>{m.name}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{m.type}</span>
                </div>
                <p className="text-xs text-accent mb-1">{m.attribute}</p>
                <p className="text-[11px] text-muted-foreground italic mb-3">"{m.flavor}"</p>
                {hasEffect && (
                  <button
                    onClick={() => equipped ? unequipMemory(m.id) : equipMemory(m.id)}
                    className={`w-full py-1.5 text-xs font-display tracking-[0.15em] border transition-all ${
                      equipped
                        ? "bg-gold/15 border-gold text-gold"
                        : "bg-surface-2 border-rune text-muted-foreground hover:border-gold/40 hover:text-gold"
                    }`}
                  >
                    {equipped ? "✓ EQUIPPED" : "EQUIP"}
                  </button>
                )}
                {!hasEffect && (
                  <p className="text-[10px] text-muted-foreground text-center italic">Special — no passive effect</p>
                )}
              </div>
            );
          })}
        </div>
      )}
      <BottomNav />
    </div>
  );
}
