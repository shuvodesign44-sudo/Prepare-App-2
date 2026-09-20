import lockupAsset from "@/assets/prepare-lockup.png.asset.json";
import { cn } from "@/lib/utils";

export function BrandMark({ className, size = 36 }: { className?: string; size?: number }) {
  return (
    <img
      src="/favicon.png"
      style={{ width: size, height: size }}
      alt="Prepare logo"
      width={size}
      height={size}
      className={cn("shrink-0 object-contain", className)}
    />
  );
}

export function BrandLockup({ className, width = 220 }: { className?: string; width?: number }) {
  return (
    <img
      src={lockupAsset.url}
      alt="Prepare — Prepare today, succeed tomorrow"
      width={width}
      className={cn("h-auto object-contain", className)}
      style={{ width }}
    />
  );
}

export function BrandLock({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <BrandMark size={34} />
      <div className="leading-tight">
        <p className="text-lg font-extrabold tracking-tight">Prepare</p>
        <p className="text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Get Hired Tomorrow
        </p>
      </div>
    </div>
  );
}
