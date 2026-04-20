"use client";

import { useEffect, useRef } from "react";

/**
 * Module-level cursor state in normalized device coordinates
 *   x ∈ [-1, 1] (left → right)
 *   y ∈ [-1, 1] (bottom → top, OpenGL convention)
 *
 * Lives outside React so non-React consumers (R3F useFrame loops,
 * GSAP onUpdate callbacks) can read it cheaply on every frame.
 *
 * Honors `prefers-reduced-motion`: when reduced, the cursor stays
 * pinned at (0, 0) so cursor-driven motion is effectively disabled.
 */
export const cursor = {
  x: 0,
  y: 0
};

let installed = false;
let installedReduced = false;

function install(): void {
  if (typeof window === "undefined") return;
  if (installed) return;
  installed = true;

  installedReduced =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (installedReduced) return;

  const onMove = (e: PointerEvent) => {
    cursor.x = (e.clientX / window.innerWidth) * 2 - 1;
    cursor.y = -((e.clientY / window.innerHeight) * 2 - 1);
  };
  window.addEventListener("pointermove", onMove, { passive: true });
}

/**
 * Mounts the global pointermove listener on first use. Returns the
 * shared `cursor` object — callers should read `.x` / `.y` each frame.
 *
 * The hook itself only installs the listener; it does not trigger a
 * React re-render. Callers in R3F should sample inside `useFrame`.
 */
export function useCursor(): typeof cursor {
  const ref = useRef(cursor);
  useEffect(() => {
    install();
  }, []);
  return ref.current;
}

/**
 * Predicate so consumers (e.g. cursor-driven lights) can short-circuit
 * when the user prefers reduced motion.
 */
export function isCursorReduced(): boolean {
  if (typeof window === "undefined") return false;
  if (!installed) install();
  return installedReduced;
}

export default useCursor;
