"use client";

import { useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Returns the scroll progress (0..1) for a given section id, quantized
 * to whole percentages so consumers (progress bar width, opacity) only
 * re-render when the rounded value actually changes — not every
 * scroll-pixel that ScrollTrigger ticks.
 *
 * Cost-wise this takes the HUD progress bar from ~300 React re-renders
 * per viewport-height scroll (one per scroll event) down to ~100
 * (one per percentage). The visual result is identical.
 */
export function useSectionProgress(sectionId: string): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const target =
      typeof document !== "undefined"
        ? document.getElementById(sectionId)
        : null;
    if (!target) return;

    let last = -1;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: target,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          const q = Math.round(self.progress * 100);
          if (q !== last) {
            last = q;
            setProgress(q / 100);
          }
        }
      });
    });

    return () => {
      ctx.revert();
    };
  }, [sectionId]);

  return progress;
}

export default useSectionProgress;
