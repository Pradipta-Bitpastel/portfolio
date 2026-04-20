"use client";

/**
 * Atmosphere — fixed overlays for film grain + CRT scanlines.
 * Two pointer-events-none divs sitting at z-[60] above the canvas
 * but below the HUD frame labels. Inline SVG for grain so there's
 * no extra network request.
 */

const GRAIN_SVG = encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'>
    <filter id='n'>
      <feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/>
      <feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.9 0'/>
    </filter>
    <rect width='100%' height='100%' filter='url(#n)' opacity='1'/>
  </svg>`
);

export function Atmosphere() {
  return (
    <>
      {/* Film grain */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[60]"
        style={{
          backgroundImage: `url("data:image/svg+xml;utf8,${GRAIN_SVG}")`,
          backgroundSize: "200px 200px",
          mixBlendMode: "overlay",
          opacity: 0.12
        }}
      />
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
