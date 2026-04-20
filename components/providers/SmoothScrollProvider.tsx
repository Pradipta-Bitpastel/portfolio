"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, registerAll } from "@/lib/gsap";

type SmoothScrollProviderProps = {
  children: ReactNode;
};

/**
 * Wraps the app in #smooth-wrapper / #smooth-content and drives a
 * smooth-scroll engine. Strategy:
 *
 *   1) Register all GSAP plugins via `registerAll()`.
 *   2) If the visitor has `prefers-reduced-motion: reduce`, render
 *      the wrappers but skip smooth-scroll entirely.
 *   3) Try ScrollSmoother.create(...) — if the Club plugin is present
 *      it is the preferred engine because it integrates natively with
 *      ScrollTrigger pinning.
 *   4) If ScrollSmoother is not available, fall back to Lenis and
 *      bridge it into gsap.ticker + ScrollTrigger.update().
 *
 * Teardown reverses whichever engine ran, and we null out the
 * listener so HMR in dev does not stack them.
 */
export function SmoothScrollProvider({
  children
}: SmoothScrollProviderProps) {
  const lenisRef = useRef<Lenis | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const smootherRef = useRef<any>(null);
  const rafTickerRef = useRef<((time: number) => void) | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const boot = async () => {
      const result = await registerAll();
      if (cancelled) return;

      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        // Reduced motion — skip all smooth scroll, keep native.
        return;
      }

      // 1) Prefer ScrollSmoother (Club plugin).
      if (result.registered.includes("ScrollSmoother")) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ScrollSmoother = (gsap as any).core?.globals?.()
            ?.ScrollSmoother;
          if (ScrollSmoother && typeof ScrollSmoother.create === "function") {
            smootherRef.current = ScrollSmoother.create({
              wrapper: "#smooth-wrapper",
              content: "#smooth-content",
              smooth: 2.5,
              effects: true,
              normalizeScroll: true
            });
            return;
          }
        } catch (err) {
          if (typeof console !== "undefined") {
            console.warn(
              "[SmoothScroll] ScrollSmoother.create failed, falling back to Lenis",
              err
            );
          }
        }
      }

      // 2) Fallback: Lenis + gsap.ticker bridge.
      try {
        const lenis = new Lenis({
          smoothWheel: true,
          lerp: 0.08
        });
        lenisRef.current = lenis;

        const tick = (time: number) => {
          // gsap.ticker passes seconds; Lenis expects ms.
          lenis.raf(time * 1000);
        };
        rafTickerRef.current = tick;
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        lenis.on("scroll", () => {
          ScrollTrigger.update();
        });
      } catch (err) {
        if (typeof console !== "undefined") {
          console.warn("[SmoothScroll] Lenis init failed", err);
        }
      }
    };

    void boot();

    return () => {
      cancelled = true;
      if (smootherRef.current) {
        try {
          smootherRef.current.kill();
        } catch {
          /* ignore */
        }
        smootherRef.current = null;
      }
      if (rafTickerRef.current) {
        try {
          gsap.ticker.remove(rafTickerRef.current);
        } catch {
          /* ignore */
        }
        rafTickerRef.current = null;
      }
      if (lenisRef.current) {
        try {
          lenisRef.current.destroy();
        } catch {
          /* ignore */
        }
        lenisRef.current = null;
      }
    };
  }, []);

  return (
    <div id="smooth-wrapper">
      <div id="smooth-content">{children}</div>
    </div>
  );
}

export default SmoothScrollProvider;
