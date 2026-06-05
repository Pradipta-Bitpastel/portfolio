"use client";

import { useEffect, type ReactNode } from "react";
import { ScrollTrigger, registerAll } from "@/lib/gsap";

type SmoothScrollProviderProps = {
  children: ReactNode;
};

/**
 * Scroll wrapper. Smooth-scroll (Lenis) was removed at the user's
 * request — the page now uses the browser's native scroll. GSAP
 * ScrollTrigger works directly against native scroll, so all scrubbed /
 * pinned animations keep functioning; we just register the plugins and
 * refresh once on mount (and after web fonts load, which can change
 * layout heights and otherwise leave pinned triggers mis-measured).
 */
export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;

    const boot = async () => {
      await registerAll();
      if (cancelled) return;
      ScrollTrigger.refresh();
      // Re-measure once fonts settle (layout shift would misplace pins).
      if (typeof document !== "undefined" && "fonts" in document) {
        document.fonts.ready.then(() => {
          if (!cancelled) ScrollTrigger.refresh();
        });
      }
    };
    void boot();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div id="smooth-wrapper">
      <div id="smooth-content">{children}</div>
    </div>
  );
}

export default SmoothScrollProvider;
