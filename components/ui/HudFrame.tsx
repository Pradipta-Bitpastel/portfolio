"use client";

import { useEffect, useState } from "react";
import { profile } from "@/content/profile";

/**
 * HudFrame — fixed viewport overlay:
 *   - 1px border inset 12px (mobile) / 24px (md+) from each edge
 *   - Corner brackets at each corner
 *   - Tick marks on md+ edges only
 *   - DEV.OS version label top-left, clock top-right (+ uptime on md+)
 *   - LAT/LON bottom-left + SID bottom-right on md+ only
 *
 * Z-index contract: border z-40, labels z-50, scrolling content z-10.
 */

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function formatClock(d: Date): string {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}

function Corner({ corner }: { corner: "tl" | "tr" | "bl" | "br" }) {
  const rotate: Record<typeof corner, string> = {
    tl: "rotate-0",
    tr: "rotate-90",
    br: "rotate-180",
    bl: "-rotate-90"
  };
  const pos: Record<typeof corner, string> = {
    tl: "top-3 left-3 md:top-5 md:left-5",
    tr: "top-3 right-3 md:top-5 md:right-5",
    bl: "bottom-3 left-3 md:bottom-5 md:left-5",
    br: "bottom-3 right-3 md:bottom-5 md:right-5"
  };
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      width={20}
      height={20}
      className={`pointer-events-none absolute z-40 text-ink ${rotate[corner]} ${pos[corner]}`}
    >
      <path
        d="M0 0 L10 0 M0 0 L0 10"
        stroke="currentColor"
        strokeOpacity={0.45}
        strokeWidth={1.2}
        fill="none"
      />
    </svg>
  );
}

export function HudFrame() {
  const clock = useClock();
  return (
    <div className="pointer-events-none fixed inset-0 z-40 select-none">
      {/* FULL-BLEED: the opaque matte letterbox bars + inset border were
          removed so content reaches every edge. The corner brackets + HUD
          labels stay as lightweight overlays anchored near the true corners. */}

      {/* Corner brackets */}
      <Corner corner="tl" />
      <Corner corner="tr" />
      <Corner corner="bl" />
      <Corner corner="br" />

      {/* Top-left: DEV.OS identity — hidden on small so the mobile
          progress strip doesn't compete with it. */}
      <div className="absolute left-4 top-4 z-50 hidden font-mono text-[9px] uppercase tracking-[0.28em] text-ink-dim md:left-8 md:top-8 md:flex md:text-[10px] md:tracking-[0.32em]">
        <span className="text-[#FF7A1A]">DEV.OS</span>
        <span className="mx-1 opacity-40">{"//"}</span>
        <span>{profile.name}</span>
      </div>

      {/* Top-right: clock — quiet, single line. */}
      <div className="absolute right-4 top-4 z-50 hidden items-center gap-3 font-mono text-[9px] uppercase tracking-[0.28em] text-ink-dim md:right-8 md:top-8 md:flex md:text-[10px] md:tracking-[0.32em]">
        <span>{clock ? formatClock(clock) : "--:--:-- UTC"}</span>
      </div>
    </div>
  );
}

export default HudFrame;
