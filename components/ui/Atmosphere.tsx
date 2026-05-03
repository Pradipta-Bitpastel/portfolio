"use client";

/**
 * Atmosphere — fixed overlay for CRT scanlines.
 *
 * Phase 5 cross-browser audit: the previous SVG `feTurbulence` grain
 * layer (with mix-blend-mode: overlay) was a known leak path on
 * Firefox-mobile + older Edge — feTurbulence is CPU-rendered in Gecko
 * and the inline data-URL grew the document size on every paint. We
 * dropped it entirely; if a noise overlay is wanted again, it should
 * live in globals.css behind `@media (min-width: 1280px) and
 * (hover: hover)` so it only runs on capable desktops.
 */

export function Atmosphere() {
  return (
    <>
      {/* Scanlines — 1px transparent / 2px faint-white, repeating */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.015) 0 1px, transparent 1px 3px)"
        }}
      />
    </>
  );
}

export default Atmosphere;
