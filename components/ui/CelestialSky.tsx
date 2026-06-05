"use client";

import { useEffect, useRef } from "react";
import { useTheme } from "@/lib/useTheme";

/**
 * CelestialSky — the fixed atmospheric backdrop that transforms with the
 * day/night theme. It sits at z-0 (behind the ParallaxBackdrop ridges and all
 * content). Both skies are always mounted and CROSS-FADE on `opacity` when the
 * theme flips, so the switch is a smooth dawn/dusk rather than a hard cut.
 *
 *   NIGHT → deep-blue sky, a glowing moon, a twinkling starfield, and periodic
 *           shooting stars streaking across the upper sky.
 *   DAY   → warm daylight sky, a radiant sun with soft rays, drifting clouds.
 *
 * The NIGHT gradient fades to the page's solid #0b0f19 by ~55% height; the DAY
 * gradient fades to the warm parchment page bg (var(--bg)) by ~60% so day
 * content sits on a bright field. Content stays readable in either mode. A
 * light rAF drifts
 * the whole celestial group on scroll + pointer for extra parallax depth
 * (transform-only, paused when the tab is hidden, off under reduced-motion).
 */

// deterministic PRNG so SSR + client render identical stars (no hydration gap)
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
}

const STARS = (() => {
  const r = seeded(20260603);
  return Array.from({ length: 66 }, () => ({
    x: +(r() * 100).toFixed(2),
    y: +(r() * 56).toFixed(2), // upper sky only
    size: +(0.6 + r() * 1.7).toFixed(2),
    delay: +(r() * 5).toFixed(2),
    dur: +(2.6 + r() * 3).toFixed(2),
    base: +(0.35 + r() * 0.55).toFixed(2),
  }));
})();

const SHOOTERS = [
  { top: "10%", left: "6%", delay: "3s", dur: "1.1s", every: "11s" },
  { top: "20%", left: "48%", delay: "9s", dur: "1.3s", every: "13s" },
  { top: "7%", left: "72%", delay: "16s", dur: "1.0s", every: "17s" },
];

const CLOUDS = [
  { top: "12%", w: 40, dur: "95s", delay: "-10s", o: 0.5 },
  { top: "24%", w: 56, dur: "130s", delay: "-60s", o: 0.36 },
  { top: "8%", w: 30, dur: "78s", delay: "-40s", o: 0.44 },
];

export function CelestialSky() {
  const { theme } = useTheme();
  const day = theme === "day";
  const groupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = groupRef.current;
    if (!el) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    let raf = 0;
    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;
    let hidden = false;
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };
    const loop = () => {
      mx += (tx - mx) * 0.05;
      my += (ty - my) * 0.05;
      const sy = window.scrollY || 0;
      el.style.transform = `translate3d(${(mx * 16).toFixed(2)}px, ${(-sy * 0.06 + my * 9).toFixed(2)}px, 0)`;
      if (!hidden) raf = requestAnimationFrame(loop);
    };
    const onVis = () => {
      hidden = document.hidden;
      if (!hidden) raf = requestAnimationFrame(loop);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("visibilitychange", onVis);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <div ref={groupRef} className="absolute -inset-[6%] will-change-transform">
        {/* ================= NIGHT ================= */}
        <div
          className="absolute inset-0 transition-opacity duration-[1100ms] ease-in-out"
          style={{ opacity: day ? 0 : 1 }}
        >
          {/* UNIFIED bg: just a soft moon-glow over TRANSPARENT — the page's
              own var(--bg) shows through, so the whole site is one continuous
              color with no banded sky-gradient layers. */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 42% at 74% 15%, rgba(120,150,220,0.14), transparent 58%)",
            }}
          />
          {/* starfield */}
          {STARS.map((s, i) => (
            <span
              key={i}
              className="sky-star absolute rounded-full"
              style={{
                left: `${s.x}%`,
                top: `${s.y}%`,
                width: `${s.size}px`,
                height: `${s.size}px`,
                // @ts-expect-error custom props
                "--o": s.base,
                animationDelay: `${s.delay}s`,
                animationDuration: `${s.dur}s`,
              }}
            />
          ))}
          {/* shooting stars */}
          {SHOOTERS.map((sh, i) => (
            <span
              key={i}
              className="sky-shooter"
              style={{
                top: sh.top,
                left: sh.left,
                animationDelay: sh.delay,
                // @ts-expect-error custom props
                "--shoot-dur": sh.dur,
                "--shoot-every": sh.every,
              }}
            />
          ))}
          {/* moon */}
          <div className="sky-moon absolute" style={{ top: "13%", left: "74%" }}>
            <div className="sky-moon-disc" />
          </div>
        </div>

        {/* ================= DAY ================= */}
        <div
          className="absolute inset-0 transition-opacity duration-[1100ms] ease-in-out"
          style={{ opacity: day ? 1 : 0 }}
        >
          {/* warm daylight sky → fades to the LIGHT page bg (parchment) by
              ~60% so day content sits on a bright field, not a dark one.
              Bright blue zenith → hazy horizon → warm parchment (var(--bg)). */}
          {/* UNIFIED bg: just a soft sun-glow over TRANSPARENT — the page's
              warm var(--bg) shows through, so day is one continuous golden
              field with no banded sky-gradient (was a multi-stop gradient that
              read as a "white gradient" band below the hero). */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(60% 46% at 70% 13%, rgba(255,214,140,0.45), transparent 56%)",
            }}
          />
          {/* clouds */}
          {CLOUDS.map((c, i) => (
            <span
              key={i}
              className="sky-cloud"
              style={{
                top: c.top,
                width: `${c.w}vmin`,
                height: `${c.w * 0.34}vmin`,
                opacity: c.o,
                animationDuration: c.dur,
                animationDelay: c.delay,
              }}
            />
          ))}
          {/* sun */}
          <div className="sky-sun absolute" style={{ top: "11%", left: "70%" }}>
            <div className="sky-sun-rays" />
            <div className="sky-sun-disc" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default CelestialSky;
