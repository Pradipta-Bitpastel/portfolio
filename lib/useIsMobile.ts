"use client";

import { useEffect, useState } from "react";

/**
 * Treat a visitor as "mobile / low-power" when any of these hold:
 *   - viewport width < 768px
 *   - fewer than 4 logical cores
 *   - prefers-reduced-motion is set
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
      const narrow = window.innerWidth < 768;
      const lowCores =
        typeof navigator !== "undefined" &&
        typeof navigator.hardwareConcurrency === "number" &&
        navigator.hardwareConcurrency > 0 &&
        navigator.hardwareConcurrency < 4;
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      return narrow || lowCores || reduced;
    };

    setIsMobile(evaluate());

    const onResize = () => setIsMobile(evaluate());
    window.addEventListener("resize", onResize, { passive: true });

    let mq: MediaQueryList | null = null;
    let onMq: ((e: MediaQueryListEvent) => void) | null = null;
    if (typeof window.matchMedia === "function") {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      onMq = () => setIsMobile(evaluate());
      if (mq.addEventListener) mq.addEventListener("change", onMq);
      else if ("addListener" in mq)
        (mq as MediaQueryList).addListener(onMq);
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

  return isMobile;
}

export default useIsMobile;
