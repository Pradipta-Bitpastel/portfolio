"use client";

import { useEffect, useState } from "react";
import { getGPUTier } from "@/lib/usePerfTier";

type ConnectionLike = {
  saveData?: boolean;
  effectiveType?: string;
};

/**
 * Treat a visitor as "mobile / low-power" when ANY of these hold:
 *   - viewport width <= 1024px (was 768; lifted to catch small laptops
 *     and tablets in landscape that still struggle with the full scene)
 *   - coarse pointer (hover: none, pointer: coarse)
 *   - fewer than 6 logical cores (was 4; lifts the 4-core Windows
 *     laptop crash class into the SVG fallback)
 *   - deviceMemory < 4
 *   - prefers-reduced-motion is set
 *   - software / Mesa / SwiftShader GPU (via getGPUTier())
 *   - Save-Data header
 *
 * The R3F Canvas swaps to <SvgCoreFallback/> in these cases.
 * We initialise to `false` on the server so the SSR markup matches
 * the desktop case; the first effect tick corrects it on the client.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    const evaluate = () => {
      if (typeof window === "undefined") return false;

      const narrow = window.innerWidth <= 1024;

      const coarsePointer =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(hover: none), (pointer: coarse)").matches;

      const cores =
        typeof navigator !== "undefined" &&
        typeof navigator.hardwareConcurrency === "number"
          ? navigator.hardwareConcurrency
          : 0;
      const lowCores = cores > 0 && cores < 6;

      const mem = (navigator as Navigator & { deviceMemory?: number })
        .deviceMemory;
      const lowMem = typeof mem === "number" && mem > 0 && mem < 4;

      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const gpuLow = getGPUTier() === "low";

      const nav = navigator as Navigator & { connection?: ConnectionLike };
      const saveData = !!nav.connection?.saveData;

      return (
        narrow ||
        coarsePointer ||
        lowCores ||
        lowMem ||
        reduced ||
        gpuLow ||
        saveData
      );
    };

    setIsMobile(evaluate());

    const onResize = () => setIsMobile(evaluate());
    window.addEventListener("resize", onResize, { passive: true });

    const mqs: { mq: MediaQueryList; cb: () => void }[] = [];
    if (typeof window.matchMedia === "function") {
      const queries = [
        "(prefers-reduced-motion: reduce)",
        "(hover: none), (pointer: coarse)",
      ];
      for (const q of queries) {
        const mq = window.matchMedia(q);
        const cb = () => setIsMobile(evaluate());
        if (mq.addEventListener) mq.addEventListener("change", cb);
        else if ("addListener" in mq) (mq as MediaQueryList).addListener(cb);
        mqs.push({ mq, cb });
      }
    }

    return () => {
      window.removeEventListener("resize", onResize);
      for (const { mq, cb } of mqs) {
        if (mq.removeEventListener) mq.removeEventListener("change", cb);
        else if ("removeListener" in mq) (mq as MediaQueryList).removeListener(cb);
      }
    };
  }, []);

  return isMobile;
}

export default useIsMobile;
