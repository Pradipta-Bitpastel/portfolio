"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/**
 * Reticle — a crosshair cursor that fits the "targeting the core" theme:
 * a precise center dot that snaps to the pointer and an outer ring that
 * trails with inertia (`gsap.quickTo`). The ring expands when hovering
 * an interactive element (links, buttons, inputs), reading as a "lock-on".
 *
 * Strictly opt-in by capability — it only mounts on a real mouse
 * (fine pointer, hover-capable) and bails on touch / coarse pointer /
 * reduced motion, where it would only get in the way. While active it
 * hides the OS cursor via the `cursor-reticle` class on <html> (text
 * fields keep their caret — see globals.css).
 */
export function Reticle() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    document.documentElement.classList.add("cursor-reticle");

    // Ring trails with inertia; dot snaps.
    const ringX = gsap.quickTo(ring, "x", { duration: 0.45, ease: "power3" });
    const ringY = gsap.quickTo(ring, "y", { duration: 0.45, ease: "power3" });
    const dotX = gsap.quickTo(dot, "x", { duration: 0.08, ease: "power2" });
    const dotY = gsap.quickTo(dot, "y", { duration: 0.08, ease: "power2" });

    let visible = false;
    const onMove = (e: PointerEvent) => {
      if (!visible) {
        visible = true;
        gsap.to([dot, ring], { autoAlpha: 1, duration: 0.2 });
      }
      ringX(e.clientX);
      ringY(e.clientY);
      dotX(e.clientX);
      dotY(e.clientY);
    };

    const onLeave = () => {
      visible = false;
      gsap.to([dot, ring], { autoAlpha: 0, duration: 0.2 });
    };

    const INTERACTIVE = "a, button, input, textarea, select, [role='button'], .magnetic-button";
    const onOver = (e: PointerEvent) => {
      if ((e.target as Element)?.closest?.(INTERACTIVE)) {
        gsap.to(ring, { scale: 1.8, borderColor: "#FF7A1A", duration: 0.25 });
      }
    };
    const onOut = (e: PointerEvent) => {
      if ((e.target as Element)?.closest?.(INTERACTIVE)) {
        gsap.to(ring, { scale: 1, borderColor: "var(--cyan)", duration: 0.25 });
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerout", onOut, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      document.documentElement.classList.remove("cursor-reticle");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <>
      <div
        ref={ringRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[90] -ml-[14px] -mt-[14px] h-7 w-7 rounded-full border opacity-0 will-change-transform"
        style={{ borderColor: "var(--cyan)", mixBlendMode: "difference" }}
      />
      <div
        ref={dotRef}
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[91] -ml-[2px] -mt-[2px] h-1 w-1 rounded-full opacity-0 will-change-transform"
        style={{ background: "var(--cyan)" }}
      />
    </>
  );
}

export default Reticle;
