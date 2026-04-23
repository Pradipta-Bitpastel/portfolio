"use client";

import { useEffect, useState } from "react";

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

function Ticks({ edge }: { edge: "top" | "bottom" }) {
  const count = 16;
  const items = Array.from({ length: count }, (_, i) => (i + 1) / (count + 1));
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute left-6 right-6 z-40 hidden md:block ${
        edge === "top" ? "top-6" : "bottom-6"
      }`}
      style={{ height: 1 }}
    >
      {items.map((f, i) => (
        <span
          key={i}
          className="absolute inline-block"
          style={{
            left: `${f * 100}%`,
            top: edge === "top" ? 0 : -3,
            width: 1,
            height: 4,
            background: "rgba(255,255,255,0.22)"
          }}
        />
      ))}
    </div>
  );
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
      className={`pointer-events-none absolute z-40 ${rotate[corner]} ${pos[corner]}`}
    >
      <path
        d="M0 0 L10 0 M0 0 L0 10"
        stroke="rgba(255,255,255,0.45)"
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
      {/* Matte — responsive: 12px mobile, 24px md+ */}
      <div className="absolute inset-x-0 top-0 h-3 md:h-6" style={{ background: "#0b0f19" }} />
      <div className="absolute inset-x-0 bottom-0 h-3 md:h-6" style={{ background: "#0b0f19" }} />
      <div className="absolute inset-y-0 left-0 w-3 md:w-6" style={{ background: "#0b0f19" }} />
      <div className="absolute inset-y-0 right-0 w-3 md:w-6" style={{ background: "#0b0f19" }} />

      {/* Inset 1px border — responsive */}
      <div className="absolute inset-3 z-40 border border-white/10 md:inset-6" />

      {/* Corner brackets */}
      <Corner corner="tl" />
      <Corner corner="tr" />
      <Corner corner="bl" />
      <Corner corner="br" />

      {/* Edge ticks (md+ only) */}
      <Ticks edge="top" />
      <Ticks edge="bottom" />

      {/* Top-left: DEV.OS */}
      <div className="absolute left-4 top-4 z-50 font-mono text-[9px] uppercase tracking-[0.28em] text-ink-dim md:left-8 md:top-8 md:text-[10px] md:tracking-[0.32em]">
        <span className="text-[#FF7A1A]">DEV.OS</span>
        <span className="mx-1 opacity-40">{"//"}</span>
        <span>v14.2.0</span>
      </div>

      {/* Top-right: clock (+ uptime on md+) */}
      <div className="absolute right-4 top-4 z-50 flex items-center gap-3 font-mono text-[9px] uppercase tracking-[0.28em] text-ink-dim md:right-8 md:top-8 md:text-[10px] md:tracking-[0.32em]">
        <span>{clock ? formatClock(clock) : "--:--:-- UTC"}</span>
        <span className="hidden opacity-40 md:inline">{"//"}</span>
        <span className="hidden text-[#FF7A1A] md:inline">UPTIME 99.982%</span>
      </div>

      {/* Bottom-left: LAT/LON — md+ only */}
      <div
        className="absolute bottom-8 left-8 z-50 hidden font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim md:flex"
      >
        LAT 37.77°N / LON &minus;122.42°W
      </div>

      {/* Bottom-right: session id — md+ only */}
      <div
        className="absolute bottom-8 right-8 z-50 hidden font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim md:flex"
      >
        <span className="opacity-60">SID:</span>
        <span className="ml-1 text-ink">01K-MZ09-37TT</span>
      </div>
    </div>
  );
}

export default HudFrame;
