"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { gsap } from "gsap";
import { useTheme, type Theme } from "@/lib/useTheme";

// Runs BEFORE the browser paints on the client (so the cover is opaque in the
// very frame the theme swaps); falls back to useEffect during SSR.
const useIsoLayout = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * SYS.WEATHER — the day/night toggle's cloud reveal.
 *
 * When the theme flips, a translucent cloudbank rolls in to veil the screen
 * (soft gradient puffs + a fractal-noise fog sheet), holds through the moment
 * the page swaps its palette underneath (the 900ms CSS var cross-fade + the
 * 1100ms CelestialSky sun/moon cross-fade keep running below), then the clouds
 * part back out the way they came to reveal the freshly themed world.
 *
 *   → DAY   : clouds are warm sunlit white / gold.
 *   → NIGHT : clouds are cool moonlit blue / dusk.
 *
 * It listens to the theme via context (it lives inside ThemeProvider) and only
 * animates on *real* toggles — the first-load hydration settle (night → saved)
 * is absorbed silently so the page doesn't boot mid-storm. The layer is
 * pointer-events-none (the toggle stays clickable through it) and parks itself
 * fully hidden between transitions so it costs nothing at rest.
 *
 * `prefers-reduced-motion` collapses the whole thing to a brief tinted veil
 * fade (no rolling, no churn) so motion-sensitive users still get feedback.
 */

type Dir = { dx: number; dy: number };

// Cloud puffs spread around the frame. `dx/dy` is the off-screen edge each
// puff rolls IN from (and parts back OUT to) — a weather front rolling across.
const CLOUDS: Array<{ top: number; left: number; w: number; dir: Dir }> = [
  { top: -10, left: -12, w: 82, dir: { dx: -1, dy: -0.55 } }, // top-left
  { top: -8, left: 52, w: 90, dir: { dx: 1, dy: -0.55 } }, // top-right
  { top: 26, left: -16, w: 94, dir: { dx: -1, dy: 0 } }, // mid-left
  { top: 22, left: 26, w: 98, dir: { dx: 0, dy: -1 } }, // center
  { top: 34, left: 54, w: 86, dir: { dx: 1, dy: 0.2 } }, // mid-right
  { top: 60, left: -8, w: 80, dir: { dx: -0.6, dy: 1 } }, // bottom-left
  { top: 58, left: 50, w: 92, dir: { dx: 0.8, dy: 1 } }, // bottom-right
];

const KEY = "devos-theme";

// Tint tokens applied to the layer for each destination theme. `wash` is a
// near-OPAQUE cover in the destination page-bg colour (it must fully hide the
// swap); `hi` is a soft highlight on top of it.
const TINT: Record<Theme, { c1: string; c2: string; wash: string; hi: string }> = {
  day: {
    c1: "rgba(255, 248, 230, 0.96)",
    c2: "rgba(255, 209, 130, 0.55)",
    // The opaque cover MUST be the destination page-bg so the swap is hidden
    // underneath it. Day was flipped to a warm-DARK field (--bg #14110b =
    // rgb(20,17,11)); the old light-tan wash here let the toggle flash
    // light→dark. Match the dark bg so the reveal dissolves seamlessly.
    wash: "rgba(20, 17, 11, 0.99)", // ≈ --bg (day, warm-dark)
    hi: "rgba(255, 240, 210, 0.20)",
  },
  night: {
    c1: "rgba(214, 224, 250, 0.92)",
    c2: "rgba(120, 142, 210, 0.45)",
    wash: "rgba(11, 15, 25, 0.99)", // ≈ --bg (night)
    hi: "rgba(150, 175, 235, 0.10)",
  },
};

export function ThemeTransitionOverlay() {
  const { theme } = useTheme();
  const rootRef = useRef<HTMLDivElement>(null);
  const prev = useRef<Theme>("night");
  const armed = useRef(false);
  const tlRef = useRef<gsap.core.Timeline | null>(null);

  useIsoLayout(() => {
    // First-load settle window: adopt whatever the theme resolves to
    // (initial 'night' + the localStorage hydration that may follow) without
    // animating, then arm on the next frame so only user toggles play.
    if (!armed.current) {
      prev.current = theme;
      const id = requestAnimationFrame(() => {
        armed.current = true;
      });
      return () => cancelAnimationFrame(id);
    }
    if (theme === prev.current) return;
    const dest = theme;
    prev.current = theme;

    const root = rootRef.current;
    if (!root) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPerf =
      typeof window.matchMedia === "function" &&
      window.matchMedia(
        "(max-width: 767px), (hover: none), (pointer: coarse)"
      ).matches;

    // Apply destination tint.
    const tint = TINT[dest];
    root.style.setProperty("--ttx-1", tint.c1);
    root.style.setProperty("--ttx-2", tint.c2);
    root.style.setProperty("--ttx-wash", tint.wash);
    root.style.setProperty("--ttx-hi", tint.hi);

    const clouds = Array.from(root.querySelectorAll<HTMLElement>(".ttx-cloud"));
    const fog = root.querySelector<HTMLElement>(".ttx-fog");
    const wash = root.querySelector<HTMLElement>(".ttx-wash");

    tlRef.current?.kill();
    gsap.killTweensOf([root, ...clouds, fog, wash].filter(Boolean));
    const park = () => gsap.set(root, { autoAlpha: 0 });

    // ── INSTANT OPAQUE COVER ──────────────────────────────────────────────
    // This runs in a LAYOUT effect — synchronously, before the browser paints,
    // in the SAME commit that swapped the theme (hero images, gradients, etc.).
    // So the very first painted frame already has this opaque destination-bg
    // cover on top: the swap repaint happens UNDERNEATH it and is never seen.
    // (The old version rolled a translucent veil IN over ~0.8s, long after the
    // instant swap had already flickered through — that was the bug.)
    gsap.set(root, { autoAlpha: 1 });
    gsap.set(wash, { opacity: 1 });

    if (reduced) {
      gsap.set(clouds, { autoAlpha: 0 });
      if (fog) gsap.set(fog, { autoAlpha: 0 });
      const tl = gsap.timeline({ onComplete: park });
      tl.to(wash, { opacity: 0, duration: 0.5, ease: "sine.inOut" }, 0.14);
      tlRef.current = tl;
      return;
    }

    const tl = gsap.timeline({ onComplete: park });

    // Clouds START already covering (on top of the solid wash), then PART OUT
    // — a weather front clearing to reveal the freshly themed world.
    clouds.forEach((el, i) => {
      const { dx, dy } = CLOUDS[i]?.dir ?? { dx: 0, dy: 1 };
      gsap.set(el, {
        xPercent: gsap.utils.random(-8, 8),
        yPercent: gsap.utils.random(-8, 8),
        scale: gsap.utils.random(1.2, 1.5),
        autoAlpha: gsap.utils.random(0.8, 0.96),
        "--ttx-blur": "16px",
      });
      tl.to(
        el,
        {
          xPercent: dx * 150,
          yPercent: dy * 150,
          scale: "+=0.4",
          autoAlpha: 0,
          "--ttx-blur": "44px",
          duration: 0.95,
          ease: "power2.in",
        },
        0.12 + i * 0.04
      );
    });

    // Fog texture (desktop only) — present, then clears.
    if (fog && !lowPerf) {
      gsap.set(fog, { autoAlpha: 0.5, scale: 1.2, xPercent: 0 });
      tl.to(fog, { autoAlpha: 0, scale: 1.5, xPercent: 8, duration: 0.95, ease: "sine.in" }, 0.12);
    } else if (fog) {
      gsap.set(fog, { autoAlpha: 0 });
    }

    // The solid cover fades out (the reveal). It's the destination bg colour,
    // so it dissolves seamlessly into the now-themed page.
    tl.to(wash, { opacity: 0, duration: 0.62, ease: "power2.inOut" }, 0.18);

    tlRef.current = tl;
  }, [theme]);

  // Sync `prev` to the persisted choice on mount so the hydration settle is a
  // genuine no-op even when the saved theme differs from the initial 'night'.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "day" || saved === "night") prev.current = saved;
    } catch {
      /* ignore */
    }
    return () => {
      tlRef.current?.kill();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      aria-hidden
      className="ttx-root pointer-events-none fixed inset-0 z-[90]"
      style={{ opacity: 0, visibility: "hidden" }}
    >
      <div className="ttx-wash" />
      <div className="ttx-fog">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <filter
              id="ttx-fog-filter"
              x="-20%"
              y="-20%"
              width="140%"
              height="140%"
            >
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.012 0.016"
                numOctaves={4}
                seed={7}
                stitchTiles="stitch"
                result="noise"
              />
              {/* white cloud body, alpha driven by the noise */}
              <feColorMatrix
                in="noise"
                type="matrix"
                values="0 0 0 0 1
                        0 0 0 0 1
                        0 0 0 0 1
                        0 0 0 0.9 0"
              />
            </filter>
          </defs>
          <rect
            width="100%"
            height="100%"
            filter="url(#ttx-fog-filter)"
          />
        </svg>
      </div>
      {CLOUDS.map((c, i) => (
        <span
          key={i}
          className="ttx-cloud"
          style={{
            top: `${c.top}%`,
            left: `${c.left}%`,
            width: `${c.w}vmin`,
            height: `${c.w * 0.62}vmin`,
          }}
        />
      ))}
    </div>
  );
}

export default ThemeTransitionOverlay;
