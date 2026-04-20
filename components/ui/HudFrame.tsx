"use client";

import { useEffect, useState } from "react";

/**
 * HudFrame — fixed viewport overlay:
 *   - 1px border inset 24px from each edge (white/10), z-40
 *   - Corner brackets (└ ┐ ┘ ┌) at each corner
 *   - Tick marks every ~6vw along top + bottom
 *   - DEV.OS version label top-left, clock + uptime top-right
 *   - LAT/LON bottom-left, SID bottom-right
 *
 * Important layout rule (iter7): the border is a viewport mask. Every
 * label sits INSIDE the border (inset:32px) with 8px clearance, and
 * scrolling content gets ~64px of section padding via SectionFrame so
 * it never overlaps either the border or the labels.
 *
 * Z-index contract: border is z-40, labels are z-50, scrolling content
 * is z-10. Non-interactive overlay; mounted once at root.
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
  // Render 16 small ticks along the edge. Using percent positions so
  // this stays responsive to viewport width.
  const count = 16;
  const items = Array.from({ length: count }, (_, i) => (i + 1) / (count + 1));
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-6 right-6 z-40"
      style={{
        top: edge === "top" ? 24 : undefined,
        bottom: edge === "bottom" ? 24 : undefined,
        height: 1
      }}
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

function Corner({
  corner
}: {
  corner: "tl" | "tr" | "bl" | "br";
}) {
  // Corner bracket — 20×20 SVG. Rotated depending on position.
  const rotate: Record<typeof corner, string> = {
    tl: "rotate-0",
    tr: "rotate-90",
    br: "rotate-180",
    bl: "-rotate-90"
  };
  const style = {
    tl: { top: 20, left: 20 },
    tr: { top: 20, right: 20 },
    bl: { bottom: 20, left: 20 },
    br: { bottom: 20, right: 20 }
  }[corner];
  return (
    <svg
      aria-hidden
      viewBox="0 0 20 20"
      width={20}
      height={20}
      className={`pointer-events-none absolute z-40 ${rotate[corner]}`}
      style={style}
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
      {/* Matte — 4 solid bars of bg color on each edge. This visually
         clips scrolling content + the 3D canvas behind it so nothing
         shows inside the 24px frame zone. Using a matte instead of
         clip-path keeps WebGL rendering intact. Color matches --bg. */}
      <div className="absolute inset-x-0 top-0" style={{ height: 24, background: "#0b0f19" }} />
      <div className="absolute inset-x-0 bottom-0" style={{ height: 24, background: "#0b0f19" }} />
      <div className="absolute inset-y-0 left-0" style={{ width: 24, background: "#0b0f19" }} />
      <div className="absolute inset-y-0 right-0" style={{ width: 24, background: "#0b0f19" }} />

      {/* Inset 1px border — z-40, sits just inside the matte. */}
      <div
        className="absolute z-40 border border-white/10"
        style={{
          top: 24,
          right: 24,
          bottom: 24,
          left: 24
        }}
      />

      {/* Corner brackets */}
      <Corner corner="tl" />
      <Corner corner="tr" />
      <Corner corner="bl" />
      <Corner corner="br" />

      {/* Edge ticks */}
      <Ticks edge="top" />
      <Ticks edge="bottom" />

      {/* Top-left: DEV.OS — INSIDE the border, 32px from the edges */}
      <div
        className="absolute z-50 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim"
        style={{ top: 32, left: 32 }}
      >
        <span className="text-[#FF7A1A]">DEV.OS</span>
        <span className="mx-1 opacity-40">{"//"}</span>
        <span>v14.2.0</span>
      </div>

      {/* Top-right: clock + uptime */}
      <div
        className="absolute z-50 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim"
        style={{ top: 32, right: 32 }}
      >
        <span>{clock ? formatClock(clock) : "--:--:-- UTC"}</span>
        <span className="opacity-40">{"//"}</span>
        <span className="text-[#FF7A1A]">UPTIME 99.982%</span>
      </div>

      {/* Bottom-left: LAT/LON */}
      <div
        className="absolute z-50 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim"
        style={{ bottom: 32, left: 32 }}
      >
        LAT 37.77°N / LON &minus;122.42°W
      </div>

      {/* Bottom-right: session id */}
      <div
        className="absolute z-50 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim"
        style={{ bottom: 32, right: 32 }}
      >
        <span className="opacity-60">SID:</span>
        <span className="ml-1 text-ink">01K-MZ09-37TT</span>
      </div>
    </div>
  );
}

export default HudFrame;
