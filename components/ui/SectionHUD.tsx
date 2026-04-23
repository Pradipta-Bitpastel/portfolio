"use client";

import { useEffect, useState } from "react";
import { registerAll, ScrollTrigger } from "@/lib/gsap";
import { useSectionProgress } from "@/lib/useSectionProgress";
import { cn } from "@/lib/cn";

/**
 * SectionHUD — vertical rail anchored on the LEFT middle edge,
 * INSIDE the HudFrame border so it never collides with the top-left
 * `DEV.OS v14.2.0` label.
 *
 * Layout (top → bottom):
 *   [ 01 / 06 ]                   ← compact counter
 *   SYS.BOOT                      ← amber section name
 *   ▕▔▔▔▔▔▔▏ (vertical bar with amber progress fill)
 *   • • • • • •                   ← 6 dots, active is amber
 *
 * ScrollTrigger swaps the active section as the page scrolls;
 * useSectionProgress gives the per-section 0-1 fill.
 */

type Entry = { id: string; label: string; num: string };

const SECTIONS: Entry[] = [
  { id: "hero",       num: "01", label: "SYS.BOOT" },
  { id: "about",      num: "02", label: "SYS.INIT" },
  { id: "skills",     num: "03", label: "SYS.ACTIVATE" },
  { id: "projects",   num: "04", label: "SYS.EXEC" },
  { id: "experience", num: "05", label: "SYS.TIMELINE" },
  { id: "contact",    num: "06", label: "SYS.TRANSMIT" }
];

export function SectionHUD() {
  const [active, setActive] = useState<Entry>(SECTIONS[0]);
  const activeIdx = SECTIONS.findIndex((s) => s.id === active.id);
  const progress = useSectionProgress(active.id);

  useEffect(() => {
    let cancelled = false;
    const triggers: ScrollTrigger[] = [];
    const boot = async () => {
      await registerAll();
      if (cancelled) return;
      SECTIONS.forEach((s) => {
        const el = document.getElementById(s.id);
        if (!el) return;
        const t = ScrollTrigger.create({
          trigger: el,
          start: "top 55%",
          end: "bottom 45%",
          onEnter: () => setActive(s),
          onEnterBack: () => setActive(s)
        });
        triggers.push(t);
      });
    };
    void boot();
    return () => {
      cancelled = true;
      triggers.forEach((t) => {
        try {
          t.kill();
        } catch {
          /* ignore */
        }
      });
    };
  }, []);

  const total = SECTIONS.length;
  return (
    <>
      {/* Mobile: compact horizontal strip near the top, below HUD top labels */}
      <div
        aria-label="Section progress"
        className="pointer-events-none fixed left-4 right-4 top-10 z-50 flex select-none items-center gap-2 font-mono uppercase md:hidden"
      >
        <span className="text-[9px] tracking-[0.28em] text-ink-dim">[</span>
        <span className="text-[9px] tracking-[0.28em] text-[#FF7A1A]">{active.num}</span>
        <span className="text-[9px] tracking-[0.28em] text-ink-dim opacity-40">/</span>
        <span className="text-[9px] tracking-[0.28em] text-ink-dim">{String(total).padStart(2, "0")}</span>
        <span className="text-[9px] tracking-[0.28em] text-ink-dim">]</span>
        <span className="text-[10px] font-bold tracking-[0.06em] text-[#FF7A1A]">{active.label}</span>
        <div className="relative ml-2 h-[2px] flex-1 overflow-hidden bg-white/10">
          <div
            className="absolute left-0 top-0 h-full bg-[#FF7A1A] transition-[width] duration-150"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      </div>
    <aside
      aria-label="Section progress"
      className="pointer-events-none fixed top-1/2 z-50 hidden -translate-y-1/2 select-none flex-col gap-3 font-mono uppercase md:flex"
      style={{ left: 32 }}
    >
      <div className="flex items-center gap-2 text-[10px] tracking-[0.32em] text-ink-dim">
        <span>[</span>
        <span className="text-[#FF7A1A]">{active.num}</span>
        <span className="opacity-40">/</span>
        <span>{String(total).padStart(2, "0")}</span>
        <span>]</span>
      </div>
      <div
        className="font-display text-[14px] tracking-[0.06em] text-[#FF7A1A]"
        style={{ fontWeight: 700 }}
      >
        {active.label}
      </div>

      {/* Vertical progress bar */}
      <div className="relative mt-1 h-[120px] w-[2px] overflow-hidden bg-white/10">
        <div
          className="absolute left-0 top-0 w-full bg-[#FF7A1A] transition-[height] duration-150"
          style={{ height: `${Math.round(progress * 100)}%` }}
        />
      </div>

      {/* Section dot stack — 6 dots, active is amber-filled */}
      <div className="mt-2 flex flex-col gap-2">
        {SECTIONS.map((s, i) => {
          const isActive = i === activeIdx;
          return (
            <span
              key={s.id}
              aria-hidden
              className={cn(
                "h-[6px] w-[6px] rounded-full border transition-colors",
                isActive
                  ? "border-[#FF7A1A] bg-[#FF7A1A] shadow-[0_0_8px_rgba(255,122,26,0.7)]"
                  : "border-white/30 bg-transparent"
              )}
            />
          );
        })}
      </div>
    </aside>
    </>
  );
}

export default SectionHUD;
