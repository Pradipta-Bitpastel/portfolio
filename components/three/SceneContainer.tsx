"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useIsMobile } from "@/lib/useIsMobile";
import { SvgCoreFallback } from "@/components/SvgCoreFallback";

/**
 * Boundary between the static marketing shell and the R3F Canvas.
 *
 * We do three things here to keep the main bundle small and the
 * above-the-fold render fast:
 *
 *   1. The 3D scene is imported via `next/dynamic` with `ssr: false`.
 *      three.js and R3F never end up in the server bundle and are only
 *      fetched on the client for visitors who actually need them.
 *
 *   2. We use a hydrate-then-mount guard: `mounted` starts false and
 *      flips true in the first `useEffect`. This ensures the Canvas is
 *      never attempted during SSR or the first hydration tick — which
 *      would either crash (no `window`) or fight React over the DOM.
 *
 *   3. If `useIsMobile()` is true (narrow viewport, low core count, or
 *      prefers-reduced-motion), we render the lightweight SVG fallback
 *      instead. This keeps mobile sub-10 KB and completely skips the
 *      WebGL pipeline on low-power devices.
 */
const Scene = dynamic(() => import("./_Scene").then((m) => m.Scene), {
  ssr: false,
  loading: () => null
});

export function SceneContainer() {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-hydration / first render: nothing. Avoids flashing a fallback
  // or attempting the Canvas before `window` is available.
  if (!mounted) return null;

  if (isMobile) {
    return <SvgCoreFallback />;
  }

  // iter7: the wrapper is `pointer-events-none` so DOM interactive
  // elements (links, CTAs) win the hit-test. R3F still receives
  // pointer events because `_Scene` registers the Canvas event source
  // at `document.documentElement`, so the DevStation laptop click /
  // hover handlers fire from window-level events.
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0"
    >
      <Scene />
    </div>
  );
}

export default SceneContainer;
