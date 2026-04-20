"use client";

import { useEffect, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/gsap";

/**
 * Returns the scroll progress (0..1) for a given section id.
 *
 * Creates a single ScrollTrigger per call, scoped to `#${sectionId}`,
 * with `start: 'top bottom'` and `end: 'bottom top'` so progress
 * covers the entire window of the section being on screen.
 *
 * Uses `gsap.context` for clean teardown on unmount / id change.
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

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: target,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          setProgress(self.progress);
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
