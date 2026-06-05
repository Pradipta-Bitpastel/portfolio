"use client";

import { useEffect, type RefObject } from "react";
import { gsap, registerAll } from "@/lib/gsap";

/**
 * Generic scroll reveal. Scoped to `rootRef`, it finds every
 * `[data-reveal]` descendant and fades + lifts it in as it enters the
 * viewport. `prefers-reduced-motion` collapses to an instant show.
 *
 * Add `data-reveal` to anything you want revealed; add a numeric
 * `data-reveal-delay` (seconds) to offset it within its group.
 */
export function useReveal(
  rootRef: RefObject<HTMLElement | null>,
  deps: unknown[] = []
): void {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;
    let ctx: ReturnType<typeof gsap.context> | null = null;

    const boot = async () => {
      await registerAll();
      if (cancelled || !rootRef.current) return;

      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      ctx = gsap.context(() => {
        const items = gsap.utils.toArray<HTMLElement>("[data-reveal]");
        if (reduced) {
          gsap.set(items, { opacity: 1, y: 0 });
          return;
        }
        items.forEach((el) => {
          const delay = parseFloat(el.dataset.revealDelay ?? "0") || 0;
          gsap.from(el, {
            opacity: 0,
            y: 30,
            duration: 0.7,
            delay,
            ease: "power3.out",
            scrollTrigger: { trigger: el, start: "top 85%", once: true },
          });
        });
      }, rootRef.current);
    };

    void boot();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default useReveal;
