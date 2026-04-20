"use client";

import { useCallback, useEffect, useState } from "react";
import { SECTIONS, type SectionId } from "@/lib/sections";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { cn } from "@/lib/cn";

/**
 * Right-edge fixed dot-nav. Maps over SECTIONS; clicking a dot
 * scrolls to the matching `#<sectionId>`. The active dot is the one
 * whose section is closest to the viewport center.
 *
 * We prefer `ScrollSmoother.scrollTo` when the Club plugin is loaded
 * (continues the smooth-scroll feel); otherwise we fall through to a
 * native `scrollIntoView`.
 */
export function SectionNav() {
  const [activeId, setActiveId] = useState<SectionId>(SECTIONS[0].id);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const triggers: ScrollTrigger[] = [];

    SECTIONS.forEach((section) => {
      const el = document.getElementById(section.id);
      if (!el) return;
      const st = ScrollTrigger.create({
        trigger: el,
        start: "top center",
        end: "bottom center",
        onToggle: (self) => {
          if (self.isActive) setActiveId(section.id);
        }
      });
      triggers.push(st);
    });

    return () => {
      triggers.forEach((t) => t.kill());
    };
  }, []);

  const scrollTo = useCallback((id: SectionId) => {
    if (typeof window === "undefined") return;
    const target = document.getElementById(id);
    if (!target) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const smoother = (gsap as any).core?.globals?.()?.ScrollSmoother?.get?.();
    if (smoother && typeof smoother.scrollTo === "function") {
      smoother.scrollTo(target, true);
      return;
    }
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  return (
    <nav
      aria-label="Section navigation"
      className="fixed top-1/2 z-50 -translate-y-1/2"
      style={{ right: 32 }}
    >
      <ul className="flex flex-col items-center gap-4">
        {SECTIONS.map((section) => {
          const isActive = section.id === activeId;
          return (
            <li key={section.id}>
              <button
                type="button"
                aria-label={`Go to ${section.title}`}
                aria-current={isActive ? "true" : undefined}
                onClick={() => scrollTo(section.id)}
                className={cn(
                  "group relative flex h-3 w-3 items-center justify-center rounded-full border border-white/25 bg-white/5 backdrop-blur transition",
                  "hover:border-white/60",
                  isActive && "border-white bg-white/80 shadow-[0_0_16px_rgba(79,156,255,0.8)]"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none absolute right-6 whitespace-nowrap rounded-md bg-black/70 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/80 opacity-0 transition",
                    "group-hover:opacity-100"
                  )}
                >
                  {section.title}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export default SectionNav;
