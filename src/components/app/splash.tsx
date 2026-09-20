import { useEffect, useState } from "react";
import { BrandLockup } from "@/components/app/brand";
import { cn } from "@/lib/utils";

const SESSION_KEY = "prepare_splash_shown";
let splashShown = false;

export function SplashScreen({ duration = 1900 }: { duration?: number }) {
  const [visible, setVisible] = useState(true);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (splashShown || window.sessionStorage.getItem(SESSION_KEY)) {
      setVisible(false);
      return;
    }
    splashShown = true;
    const leave = window.setTimeout(() => setLeaving(true), duration - 350);
    const done = window.setTimeout(() => {
      window.sessionStorage.setItem(SESSION_KEY, "1");
      setVisible(false);
    }, duration);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(done);
    };
  }, [duration]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "hero-surface fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-300",
        leaving ? "opacity-0" : "opacity-100",
      )}
    >
      <div className="glass-card animate-scale-in px-8 py-7">
        <BrandLockup width={230} />
      </div>
      <div className="mt-12 h-1.5 w-36 overflow-hidden rounded-full bg-muted">
        <div className="ai-surface h-full w-1/3 animate-[slide-in-right_1.4s_ease-in-out_infinite] rounded-full" />
      </div>
      <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Prepare Today. Get Hired Tomorrow.
      </p>
    </div>
  );
}
