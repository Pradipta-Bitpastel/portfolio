"use client";

import { useEffect, useRef } from "react";
import { gsap, registerAll, ScrollTrigger } from "@/lib/gsap";
import { readPerfTier } from "@/lib/usePerfTier";

/**
 * IrisTransition — fullscreen hexagonal iris wipe that fires at every
 * section boundary. The mechanic: a solid amber hex closes in from
 * the edges (CSS clip-path polygon animated from full-viewport down
 * to a zero-area hex at center), holds 90 ms, then opens back out to
 * reveal the new section.
 *
 * Three overlaid layers build the effect:
 *   1. The hex mask itself (amber fill, animated clip-path)
 *   2. A thin ring outline that pulses at the hex edge while it's
 *      closing — ties the wipe to the HUD's scan-line identity
 *   3. A glyph readout (amber mono text) that scrambles to the next
 *      section's codename while the iris is closed — gives the user
 *      a 90 ms beat to read "// ENTERING SKILLS" or similar
 *
 * Accessibility: `aria-hidden`, pointer-events none, and the whole
 * thing collapses to a 180 ms cross-fade on perf-tier low /
 * prefers-reduced-motion so it never blocks interaction.
 *
 * Trigger model: we own the ScrollTriggers, one per section boundary.
 * When a boundary fires (scrolling down OR back up), we play the
 * close-hold-open sequence once.
 */

type Entry = { id: string; codename: string };

const SECTIONS: Entry[] = [
  { id: "hero",       codename: "SYS.BOOT" },
  { id: "about",      codename: "SYS.INIT" },
  { id: "skills",     codename: "SYS.ACTIVATE" },
  { id: "projects",   codename: "SYS.EXEC" },
  { id: "experience", codename: "SYS.TIMELINE" },
  { id: "contact",    codename: "SYS.TRANSMIT" }
];

/**
 * Build a hex clip-path polygon string. `t` ∈ [0..1]: 1 = full
 * viewport (no clipping — iris fully open), 0 = zero-area hex at
 * center (iris fully closed).
 *
 * We keep the hex shape even when open so the edges of the wipe are
 * always six-sided; at t=1 the hex vertices sit just beyond the
 * viewport corners, so nothing visible is clipped.
 */
function hexClip(t: number): string {
  // t=1 → hex oversized to cover viewport (iris fully open).
  // t=0 → hex collapses to a point (iris fully closed).
  // Radius 1.5 at t=1 is 50% past the viewport half, so even on
  // wide aspect ratios the six vertices sit outside the visible box.
  const radius = 1.5 * t;
  const cx = 50;
  const cy = 50;
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const x = cx + Math.cos(a) * radius * 100;
    const y = cy + Math.sin(a) * radius * 100;
    points.push(`${x.toFixed(2)}% ${y.toFixed(2)}%`);
  }
  return `polygon(${points.join(", ")})`;
}

/** SVG path "d" for a hex outline. Used by the bright amber border
 *  that scales in lockstep with the clipped mask so the hex edge
 *  is always crisply visible as the iris closes. */
function hexPath(radius: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const x = Math.cos(a) * radius;
    const y = Math.sin(a) * radius;
    pts.push(`${x.toFixed(4)} ${y.toFixed(4)}`);
  }
  return `M ${pts[0]} L ${pts[1]} L ${pts[2]} L ${pts[3]} L ${pts[4]} L ${pts[5]} Z`;
}

export function IrisTransition() {
  const maskRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGSVGElement>(null);
  const edgePathRef = useRef<SVGPathElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const triggers: ScrollTrigger[] = [];
    const low =
      readPerfTier() === "low" ||
      (typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // Seed the mask fully open (invisible).
    const mask = maskRef.current;
    if (mask) {
      mask.style.clipPath = hexClip(1);
      mask.style.opacity = "0";
    }

    const play = (entering: Entry) => {
      if (busy.current) return;
      busy.current = true;
      const mask = maskRef.current;
      const ring = ringRef.current;
      const edge = edgePathRef.current;
      const flash = flashRef.current;
      const label = labelRef.current;
      if (!mask) {
        busy.current = false;
        return;
      }

      if (low) {
        // Cheap cross-fade only.
        gsap.fromTo(
          mask,
          { opacity: 0 },
          {
            opacity: 0.35,
            duration: 0.18,
            ease: "power2.out",
            onComplete: () => {
              gsap.to(mask, {
                opacity: 0,
                duration: 0.22,
                ease: "power2.in",
                onComplete: () => {
                  busy.current = false;
                }
              });
            }
          }
        );
        return;
      }

      // `t` drives both the dark-flood clipPath and the bright edge
      // path's radius so the amber hex outline is pixel-locked to the
      // mask's clipped edge during the whole close→hold→open cycle.
      const state = { t: 1 };
      const applyState = () => {
        mask.style.clipPath = hexClip(state.t);
        if (edge) {
          // Edge path lives in a viewBox -100..100 coord space (see the
          // SVG below). Radius 100 matches clip radius 1.5 (fully open).
          const r = Math.max(0, state.t * 100);
          edge.setAttribute("d", hexPath(r));
        }
      };

      const tl = gsap.timeline({
        onComplete: () => {
          busy.current = false;
          if (mask) mask.style.opacity = "0";
          if (edge) edge.setAttribute("opacity", "0");
        }
      });

      // Phase 1 — close (full → pinpoint at center).
      tl.set(mask, { opacity: 1 }, 0);
      if (edge) tl.set(edge, { opacity: 1 }, 0);
      tl.to(
        state,
        {
          t: 0,
          duration: 0.42,
          ease: "power3.in",
          onUpdate: applyState
        },
        0
      );

      // Decorative ring fade-in (static hex, sits behind the label
      // while the iris is closed).
      if (ring) {
        tl.fromTo(
          ring,
          { opacity: 0, scale: 1.15 },
          { opacity: 1, scale: 1, duration: 0.42, ease: "power3.in" },
          0
        );
      }

      // Codename drops in at mid-close.
      if (label) {
        tl.set(label, { opacity: 0, y: 8 }, 0.24);
        tl.to(
          label,
          { opacity: 1, y: 0, duration: 0.18, ease: "power2.out" },
          0.24
        );
        label.textContent = `// ENTERING ${entering.codename}`;
      }

      // Phase 2 — hard cut flash at the pinpoint. Pure amber bloom
      // that blows out the frame for a single beat, then drops back.
      if (flash) {
        tl.fromTo(
          flash,
          { opacity: 0 },
          { opacity: 1, duration: 0.08, ease: "power2.out" },
          ">"
        );
        tl.to(
          flash,
          { opacity: 0, duration: 0.18, ease: "power2.in" }
        );
      } else {
        tl.to({}, { duration: 0.12 });
      }

      // Phase 3 — open (pinpoint → full).
      tl.to(state, {
        t: 1,
        duration: 0.46,
        ease: "power3.out",
        onUpdate: applyState
      });
      if (ring) {
        tl.to(ring, { opacity: 0, duration: 0.24, ease: "power2.out" }, "-=0.34");
      }
      if (label) {
        tl.to(
          label,
          { opacity: 0, y: -6, duration: 0.18, ease: "power2.in" },
          "-=0.34"
        );
      }
    };

    const boot = async () => {
      await registerAll();
      if (cancelled) return;
      SECTIONS.forEach((s, i) => {
        // Skip hero — no prior section to transition FROM on first paint.
        if (i === 0) return;
        const el = document.getElementById(s.id);
        if (!el) return;
        const t = ScrollTrigger.create({
          trigger: el,
          start: "top 70%",
          end: "top 30%",
          onEnter: () => play(s),
          onEnterBack: () => {
            // When scrolling back up INTO a section, the codename shown
            // is the one we're entering (the current section).
            play(s);
          }
        });
        triggers.push(t);
      });
    };

    void boot();

    return () => {
      cancelled = true;
      triggers.forEach((t) => {
        try {
          t.kill();
        } catch {
          /* ignore */
        }
      });
    };
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[65] flex items-center justify-center"
    >
      {/* Dark flood — almost opaque near-black, clipped to an animated
          hex that shrinks to a pinpoint then opens. The amber scanline
          texture reads as the HUD "cut" texture; the drop-shadow glow
          makes the hex clip edge visible as a warm amber bloom. */}
      <div
        ref={maskRef}
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,122,26,0.10) 0 2px, transparent 2px 4px), linear-gradient(180deg, rgba(255,122,26,0.0) 0%, rgba(255,122,26,0.16) 50%, rgba(255,122,26,0.0) 100%)",
          backgroundColor: "#05070B",
          opacity: 0,
          willChange: "clip-path, opacity",
          filter:
            "drop-shadow(0 0 14px rgba(255,122,26,0.95)) drop-shadow(0 0 30px rgba(255,122,26,0.55))"
        }}
      />
      {/* Dynamic amber edge — a hex stroke whose radius is driven in
          lockstep with the mask's clipPath. Sits on top so the edge is
          a crisp bright amber line regardless of what's behind the
          clip hole. Sized at 150vmax so the geometry is always big
          enough to cover any viewport orientation. */}
      <svg
        viewBox="-100 -100 200 200"
        preserveAspectRatio="xMidYMid meet"
        className="pointer-events-none absolute"
        style={{
          width: "150vmax",
          height: "150vmax",
          overflow: "visible"
        }}
      >
        <path
          ref={edgePathRef}
          d={hexPath(0)}
          fill="none"
          stroke="#FF7A1A"
          strokeWidth={1.2}
          strokeLinejoin="miter"
          opacity={0}
          style={{
            filter:
              "drop-shadow(0 0 6px rgba(255,122,26,1)) drop-shadow(0 0 14px rgba(255,122,26,0.6))"
          }}
        />
      </svg>
      {/* Decorative inner ring + tick polygon — sits behind the label
          at the pinpoint for a HUD feel. Fixed size (60vmin). */}
      <svg
        ref={ringRef}
        viewBox="-1.2 -1.2 2.4 2.4"
        className="relative"
        style={{
          width: "42vmin",
          height: "42vmin",
          opacity: 0,
          willChange: "opacity, transform"
        }}
      >
        <polygon
          points="0,-1 0.866,-0.5 0.866,0.5 0,1 -0.866,0.5 -0.866,-0.5"
          fill="none"
          stroke="#FF7A1A"
          strokeWidth={0.018}
          strokeLinejoin="miter"
          style={{ filter: "drop-shadow(0 0 6px rgba(255,122,26,0.9))" }}
        />
        <polygon
          points="0,-0.78 0.675,-0.39 0.675,0.39 0,0.78 -0.675,0.39 -0.675,-0.39"
          fill="none"
          stroke="rgba(255,122,26,0.55)"
          strokeWidth={0.006}
          strokeDasharray="0.04 0.04"
        />
      </svg>
      {/* Pinpoint flash — pure amber bloom that blows out the frame
          for one beat between close and open. This is the "cut". */}
      <div
        ref={flashRef}
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(255,186,100,0.95) 0%, rgba(255,122,26,0.55) 20%, rgba(255,122,26,0.0) 55%)",
          mixBlendMode: "screen",
          opacity: 0,
          willChange: "opacity"
        }}
      />
      {/* Codename readout — amber mono, drops in while iris is closed. */}
      <div
        ref={labelRef}
        className="absolute font-mono text-[13px] font-bold uppercase tracking-[0.42em] text-[#FFD7A8] md:text-[15px]"
        style={{
          textShadow:
            "0 0 10px rgba(255,122,26,1), 0 0 22px rgba(255,122,26,0.7)",
          opacity: 0,
          bottom: "calc(50% - 96px)",
          willChange: "opacity, transform"
        }}
      />
    </div>
  );
}

export default IrisTransition;
