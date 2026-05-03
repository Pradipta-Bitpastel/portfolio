"use client";

import { useEffect, useRef } from "react";
import { gsap, registerAll, ScrollTrigger } from "@/lib/gsap";
import { readPerfTier, useDeviceCapabilities } from "@/lib/usePerfTier";

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
  const caps = useDeviceCapabilities();
  const maskRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<SVGSVGElement>(null);
  const edgePathRef = useRef<SVGPathElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  useEffect(() => {
    // Low-end: skip the iris entirely. Stacking the iris on top of
    // the cinematic boundary BEAT was a compositor cliff on integrated
    // GPUs (clipPath polygon + dual drop-shadow filter). Returning
    // here also short-circuits the ScrollTrigger setup below so we
    // don't pay the wiring cost.
    if (caps.isLowEnd) return;
    let cancelled = false;
    const triggers: ScrollTrigger[] = [];
    const low =
      readPerfTier() === "low" ||
      (typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // Seed the mask fully transparent. Was: clipPath polygon hex
    // (replaced by an opacity-only fade — same visual effect with
    // the bright animated edge hex still drawn over it, but no full
    // re-rasterization on every frame).
    const mask = maskRef.current;
    if (mask) {
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

      // High-tier path: opacity-only fade for the dark-flood mask
      // (was a clipPath polygon morph + dual drop-shadow filter — both
      // forced full re-rasterization every frame). The animated edge
      // hex SVG path still gives the iris its identity; the mask
      // simply fades up under it.
      const state = { t: 1 };
      const applyState = () => {
        if (edge) {
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

      // Phase 1 — fade mask in + close hex edge to pinpoint.
      tl.fromTo(
        mask,
        { opacity: 0 },
        { opacity: 1, duration: 0.32, ease: "power2.in" },
        0
      );
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

      // Phase 3 — open: fade mask back out + open hex edge.
      tl.to(
        mask,
        { opacity: 0, duration: 0.36, ease: "power2.out" },
        ">"
      );
      tl.to(state, {
        t: 1,
        duration: 0.46,
        ease: "power3.out",
        onUpdate: applyState
      }, "<");
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
  }, [caps.isLowEnd]);

  // Low-end: render nothing. No iris, no DOM, no compositor cost.
  if (caps.isLowEnd) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[65] flex items-center justify-center"
    >
      {/* Dark flood — full-viewport amber-scanline mask. We dropped
          the dual drop-shadow filter (huge compositor cost) and
          replaced the clipPath hex morph with an opacity-only fade.
          The animated bright hex edge below still draws the iris
          identity; this layer just darkens the frame. The wrapper's
          inset box-shadow gives the warm amber bloom along the edge
          for free (no per-frame filter recompute). */}
      <div
        ref={maskRef}
        className="absolute inset-0"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,122,26,0.10) 0 2px, transparent 2px 4px), linear-gradient(180deg, rgba(255,122,26,0.0) 0%, rgba(255,122,26,0.16) 50%, rgba(255,122,26,0.0) 100%)",
          backgroundColor: "#05070B",
          opacity: 0,
          willChange: "opacity",
          boxShadow:
            "inset 0 0 80px rgba(255,122,26,0.45)"
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
