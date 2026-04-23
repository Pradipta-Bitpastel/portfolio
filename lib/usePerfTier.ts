"use client";

import { useEffect, useState } from "react";

/**
 * Performance tier the client falls into. Consumers use this to gate
 * expensive effects (postprocessing, heavy backdrop-filters, continuous
 * useFrame loops, pointer parallax) so the experience stays smooth on
 * older hardware and integrated GPUs.
 *
 *   - "high":  desktop, 4+ logical cores, no reduced-motion, not on
 *              Data-Saver. Full scene, full effects.
 *   - "low":   narrow viewport, <4 logical cores, reduced-motion,
 *              Data-Saver, or a coarse pointer (touch). Lightweight path.
 */
export type PerfTier = "high" | "low";

type ConnectionLike = {
  saveData?: boolean;
  effectiveType?: string;
};

function evaluate(): PerfTier {
  if (typeof window === "undefined") return "high";

  // Reduced motion → always low tier.
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return "low";
  }

  // Narrow viewports are handled by the mobile SVG fallback already,
  // but we still tag them so DOM-level effects (blur, magnetic pull)
  // collapse into the cheaper path.
  if (window.innerWidth < 768) return "low";

  // Coarse pointer → treat as low (touch devices, low-end tablets).
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none), (pointer: coarse)").matches
  ) {
    return "low";
  }

  // Data-Saver or slow connection → keep things light.
  const nav = navigator as Navigator & { connection?: ConnectionLike };
  const conn = nav.connection;
  if (conn?.saveData) return "low";
  if (conn?.effectiveType && /(^| )(2g|slow-2g)( |$)/i.test(conn.effectiveType)) {
    return "low";
  }

  // Low logical core count → integrated GPU / older laptop.
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.hardwareConcurrency === "number" &&
    navigator.hardwareConcurrency > 0 &&
    navigator.hardwareConcurrency < 4
  ) {
    return "low";
  }

  // Device memory hint (Chromium).
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem > 0 && mem < 4) return "low";

  return "high";
}

/**
 * Reactively reports the current performance tier. Recomputes on
 * viewport resize and reduced-motion changes.
 *
 * Server render and first client render always return "high" so the
 * SSR markup stays stable; the first `useEffect` tick corrects it.
 */
export function usePerfTier(): PerfTier {
  const [tier, setTier] = useState<PerfTier>("high");

  useEffect(() => {
    setTier(evaluate());

    const onResize = () => setTier(evaluate());
    window.addEventListener("resize", onResize, { passive: true });

    let mq: MediaQueryList | null = null;
    let onMq: (() => void) | null = null;
    if (typeof window.matchMedia === "function") {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      onMq = () => setTier(evaluate());
      if (mq.addEventListener) mq.addEventListener("change", onMq);
      else if ("addListener" in mq) (mq as MediaQueryList).addListener(onMq);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      if (mq && onMq) {
        if (mq.removeEventListener) mq.removeEventListener("change", onMq);
        else if ("removeListener" in mq)
          (mq as MediaQueryList).removeListener(onMq);
      }
    };
  }, []);

  return tier;
}

/**
 * Non-reactive read for modules that can't hold React state (R3F
 * useFrame callbacks, GSAP onUpdate). Reads the tier once and caches.
 */
let cachedTier: PerfTier | null = null;
export function readPerfTier(): PerfTier {
  if (typeof window === "undefined") return "high";
  if (cachedTier !== null) return cachedTier;
  cachedTier = evaluate();
  return cachedTier;
}

export default usePerfTier;
