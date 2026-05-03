"use client";

import { useEffect, useState } from "react";

/**
 * Static SVG stand-in for the R3F scene. Rendered when the visitor is
 * on mobile / low-power / reduced-motion. Pure SVG + CSS keyframes —
 * no three.js, no GSAP — keeps the low-power experience sub-10 KB.
 *
 * Visual design:
 *   - A subtle grid pattern background (keeps the HUD identity).
 *   - A central glowing core built from a soft outer halo (Gaussian blur)
 *     plus a crisp inner ring and bright nucleus.
 *   - 5 dashed orbit rings at increasing radii, each with one module dot
 *     spinning at a module-specific speed (6s/8s/10s/12s/14s, linear).
 *   - A "CORE // ONLINE" terminal label under the core, subtly pulsing.
 *
 * All motion is CSS `animation`s so the global `prefers-reduced-motion`
 * rule in `globals.css` flattens them without any JS.
 *
 * Mobile-only: the orb fades as the user scrolls past the hero zone
 * (driven by `--scf-scroll-fade` CSS variable). Desktop keeps the orb
 * persistent — it's a backdrop element of the overall design.
 */

type ModuleDef = {
  id: string;
  color: string;
  radius: number;
  /** CSS animation duration (seconds) — one dot per ring, each at a
   *  different speed so the 5 orbits never visually sync up. */
  durationSec: number;
  /** Direction: alternate inner/outer to avoid a uniform spin. */
  reverse?: boolean;
};

const MODULES: readonly ModuleDef[] = [
  { id: "frontend", color: "#4f9cff", radius: 64, durationSec: 6 },
  { id: "backend", color: "#ff8a3c", radius: 96, durationSec: 8, reverse: true },
  { id: "devops", color: "#39ffa5", radius: 128, durationSec: 10 },
  { id: "cloud", color: "#9b5cff", radius: 160, durationSec: 12, reverse: true },
  { id: "mobile", color: "#00d4ff", radius: 192, durationSec: 14 }
];

export function SvgCoreFallback() {
  // Track scroll progress 0 → 1 over the first 60% of viewport height.
  // On mobile we fade the orb out as the user scrolls past the hero so
  // it stops dominating the fold of Projects / Experience / Contact.
  const [scrollProgress, setScrollProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = window.innerHeight || 1;
      const p = Math.min(1, window.scrollY / (h * 0.6));
      setScrollProgress(p);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Orb opacity goes 1 → 0.15 as the user scrolls past the hero.
  // Applied only on mobile via the @media rule below; desktop ignores
  // the variable so the backdrop stays persistent.
  const fadeVar = String(1 - 0.85 * scrollProgress);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 flex justify-center items-start pt-[8vh] sm:items-center sm:pt-0"
      style={{
        background:
          "radial-gradient(circle at 50% 50%, rgba(79,156,255,0.08) 0%, rgba(11,15,25,0) 55%), #0b0f19",
        // CSS custom property consumed by the mobile-only rule below.
        ["--scf-scroll-fade" as string]: fadeVar
      } as React.CSSProperties}
    >
      <svg
        data-fallback="core"
        viewBox="-260 -260 520 520"
        className="scf-svg h-full w-full scale-50 opacity-[0.55] sm:scale-100 sm:opacity-100"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Developer control core — static visualization"
      >
        <defs>
          {/* Central core gradient — cyan center fading into blue outer */}
          <radialGradient id="scf-core-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="18%" stopColor="#00d4ff" stopOpacity="0.95" />
            <stop offset="55%" stopColor="#4f9cff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#4f9cff" stopOpacity="0" />
          </radialGradient>

          {/* Outer halo — soft and wider */}
          <radialGradient id="scf-halo-grad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4f9cff" stopOpacity="0.5" />
            <stop offset="60%" stopColor="#9b5cff" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#9b5cff" stopOpacity="0" />
          </radialGradient>

          {/* Gaussian-blur glow filter for drop-shadow style */}
          <filter id="scf-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" />
          </filter>

          {/* Crisper glow for module dots */}
          <filter id="scf-dot-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3.2" />
          </filter>

          {/* Grid pattern — 24x24 cells */}
          <pattern
            id="scf-grid"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 24 0 L 0 0 0 24"
              fill="none"
              stroke="rgba(79,156,255,0.08)"
              strokeWidth="1"
            />
          </pattern>
        </defs>

        {/* Grid background — spans the full viewBox */}
        <rect
          x="-260"
          y="-260"
          width="520"
          height="520"
          fill="url(#scf-grid)"
        />

        {/* Outer soft halo */}
        <circle
          r="220"
          fill="url(#scf-halo-grad)"
          style={{
            transformOrigin: "center",
            animation: "scf-halo-pulse 7s ease-in-out infinite"
          }}
        />

        {/* 5 dashed orbit rings */}
        {MODULES.map((m) => (
          <circle
            key={`ring-${m.id}`}
            r={m.radius}
            fill="none"
            stroke={m.color}
            strokeOpacity="0.22"
            strokeWidth="1"
            strokeDasharray="3 6"
          />
        ))}

        {/* Central blurred glow */}
        <circle
          r="80"
          fill="url(#scf-core-grad)"
          filter="url(#scf-glow)"
          style={{
            transformOrigin: "center",
            animation: "scf-core-pulse 4.2s ease-in-out infinite"
          }}
        />

        {/* Crisp core ring */}
        <circle
          r="30"
          fill="#0b0f19"
          stroke="#00d4ff"
          strokeOpacity="0.9"
          strokeWidth="1.5"
        />
        <circle
          r="30"
          fill="none"
          stroke="#4f9cff"
          strokeOpacity="0.45"
          strokeWidth="6"
          style={{
            transformOrigin: "center",
            animation: "scf-core-pulse 4.2s ease-in-out infinite"
          }}
        />

        {/* Bright nucleus */}
        <circle r="9" fill="#ffffff" opacity="0.95" />
        <circle r="16" fill="#00d4ff" opacity="0.35" />

        {/* Module dots — each in its own rotating group so CSS rotate
            carries the dot around its ring. Each group rotates at a
            different speed; reverse direction via negative animation. */}
        {MODULES.map((m) => (
          <g
            key={`dot-${m.id}`}
            style={{
              transformOrigin: "center",
              animation: `scf-orbit-${m.reverse ? "rev" : "fwd"} ${m.durationSec}s linear infinite`
            }}
          >
            {/* Outer soft glow ball */}
            <circle
              cx={m.radius}
              cy={0}
              r="10"
              fill={m.color}
              opacity="0.55"
              filter="url(#scf-dot-glow)"
            />
            {/* Hard dot on top */}
            <circle cx={m.radius} cy={0} r="4.5" fill={m.color} />
            {/* Tiny trail dot behind (creates a subtle comet feel) */}
            <circle
              cx={m.radius}
              cy={0}
              r="2"
              fill={m.color}
              opacity="0.35"
              transform={`rotate(-6 0 0)`}
            />
          </g>
        ))}

        {/* Terminal-style label under the core */}
        <g
          transform="translate(0, 232)"
          className="scf-online-label"
          style={{ animation: "scf-text-pulse 3.6s ease-in-out infinite" }}
        >
          <text
            x="0"
            y="0"
            textAnchor="middle"
            fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
            fontSize="12"
            letterSpacing="4"
            fill="#9aa4b8"
          >
            CORE // ONLINE
          </text>
        </g>
      </svg>

      {/*
        Keyframes live here (scoped to this component via <style jsx>-like
        pattern using a plain <style>) because they are only useful while
        the fallback is mounted. Named with `scf-` prefix to avoid
        colliding with any globals.css animations.
      */}
      <style>{`
        @keyframes scf-core-pulse {
          0%, 100% { opacity: 0.95; transform: scale(1); }
          50%      { opacity: 0.75; transform: scale(1.06); }
        }
        @keyframes scf-halo-pulse {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50%      { opacity: 0.55; transform: scale(1.08); }
        }
        @keyframes scf-text-pulse {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        @keyframes scf-orbit-fwd {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes scf-orbit-rev {
          from { transform: rotate(0deg); }
          to   { transform: rotate(-360deg); }
        }
        @media (max-width: 640px) {
          .scf-online-label { display: none; }
          /* Mobile: fade orb out as the visitor scrolls past the hero so
             it stops dominating the fold of subsequent sections. */
          .scf-svg {
            opacity: var(--scf-scroll-fade, 1);
            transition: none;
          }
        }
      `}</style>
    </div>
  );
}

export default SvgCoreFallback;
