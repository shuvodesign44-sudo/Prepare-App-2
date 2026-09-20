import { Link, useLocation } from "@tanstack/react-router";
import { Home, ListChecks, Radio, Sparkles, Briefcase, User } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { to: "/dashboard", label: "Home", icon: Home },
  { to: "/practice", label: "Practice", icon: ListChecks },
  { to: "/live", label: "Live", icon: Radio },
  { to: "/ai", label: "AI", icon: Sparkles },
  { to: "/jobs", label: "Jobs", icon: Briefcase },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 px-4 pb-5 pt-2">
      <nav className="ink-nav mx-auto flex max-w-md items-center justify-between px-2 py-2.5">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-0.5 py-1 text-[9px] font-semibold tracking-tight transition-all",
                active ? "text-ink-nav-active" : "text-ink-nav-idle hover:text-ink-nav-active",
              )}
            >
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-xl transition-all",
                  active ? "bg-primary text-primary-foreground shadow-lg" : "",
                )}
              >
                <Icon className="size-[18px]" strokeWidth={active ? 2.4 : 1.9} />
              </span>
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
