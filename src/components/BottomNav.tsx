import { Link, useLocation } from "@tanstack/react-router";
import { Moon, Swords, Eye, User } from "lucide-react";

const TABS = [
  { to: "/", label: "Realm", icon: Moon },
  { to: "/dreamrealm", label: "Train", icon: Swords },
  { to: "/leaderboard", label: "Ranks", icon: Eye },
  { to: "/soul", label: "Soul", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-surface border-t border-rune">
      <div className="max-w-md mx-auto flex justify-around px-2 pt-2 pb-3">
        {TABS.map(({ to, label, icon: Icon }) => {
          const active = to === "/" ? pathname === "/" : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
                active ? "text-gold" : "text-muted-foreground"
              }`}
            >
              <Icon size={18} strokeWidth={1.5} />
              <span className="text-[10px] tracking-[0.15em] uppercase">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
