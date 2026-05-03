"use client";

import { useEffect, useRef, type ReactNode } from "react";
import Lenis from "lenis";
import { gsap, ScrollTrigger, registerAll } from "@/lib/gsap";
import { readPerfTier } from "@/lib/usePerfTier";

type SmoothScrollProviderProps = {
  children: ReactNode;
};

/**
 * Wraps the app in #smooth-wrapper / #smooth-content and drives a
 * smooth-scroll engine. Strategy:
 *
 *   1) Register essential GSAP plugins.
 *   2) Bail entirely on `prefers-reduced-motion: reduce`, iOS Safari
 *      (Lenis has known wheel/touch conflicts with Safari's native
 *      momentum) and Firefox (Lenis + smooth-wheel triggers visual
 *      tearing on Gecko's compositor on certain GPUs).
 *   3) Try ScrollSmoother (Club) — if available, prefer it.
 *   4) Otherwise fall back to Lenis bridged into gsap.ticker +
 *      ScrollTrigger.update().
 *
 * Teardown reverses whichever engine ran.
 */
function isIOSSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua);
}

function isFirefox(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Firefox/.test(ua);
}

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
      await registerAll();
      if (cancelled) return;

      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        // Reduced motion — skip all smooth scroll, keep native.
        return;
      }

      // Disable Lenis on iOS Safari and Firefox: both have known
      // conflicts with Lenis (Safari momentum hijack, Firefox wheel
      // event normalization tearing). Native scroll is fine on both.
      if (isIOSSafari() || isFirefox()) {
        return;
      }

      // 1) Prefer ScrollSmoother (Club plugin). Loaded lazily here to
      //    keep it out of the main bundle when the license isn't
      //    available.
      try {
        const mod = await import("gsap/ScrollSmoother").catch(() => null);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ScrollSmoother = (mod as any)?.ScrollSmoother ?? (mod as any)?.default;
        if (ScrollSmoother && typeof ScrollSmoother.create === "function") {
          try {
            gsap.registerPlugin(ScrollSmoother);
          } catch {
            /* idempotent */
          }
          const low = readPerfTier() === "low";
          smootherRef.current = ScrollSmoother.create({
            wrapper: "#smooth-wrapper",
            content: "#smooth-content",
            smooth: low ? 0.5 : 1.2,
            smoothTouch: low ? 0 : 0.1,
            effects: !low,
            normalizeScroll: true
          });
          return;
        }
      } catch (err) {
        if (typeof console !== "undefined") {
          console.warn(
            "[SmoothScroll] ScrollSmoother init failed, falling back to Lenis",
            err
          );
        }
      }

      // 2) Fallback: Lenis + gsap.ticker bridge.
      const low = readPerfTier() === "low";
      try {
        const lenis = new Lenis({
          smoothWheel: true,
          lerp: low ? 0.15 : 0.08
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
