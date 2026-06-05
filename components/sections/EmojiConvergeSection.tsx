"use client";

import { useEffect, useRef } from "react";
import { gsap, registerAll } from "@/lib/gsap";
import { SectionFrame } from "@/components/ui/SectionFrame";

/**
 * SYS.SCATTER — the Cinnamon "/games" converging-emoji beat: glossy OS
 * emojis start scattered across the viewport and lock into their slots
 * inside a manifesto sentence as you scroll, scrubbed to scroll progress.
 *
 * Redesigned as an operator "intent → resolve" composition: each emoji
 * has a HUD target reticle and a mono caption that snaps in as the glyph
 * arrives, so the convergence reads as the system *resolving* a thought
 * rather than decorative confetti. Reduced motion shows the finished,
 * fully-locked sentence with no flight.
 *
 * (Emojis render in the OS color-emoji font — glossy + dimensional on
 * Apple devices, flat-but-fine elsewhere.)
 */

// Theme-aware tokens (flip with data-theme via globals.css). INK/STEEL read
// the semantic ink scale; AMBER/CYAN stay static accents that read on both.
const INK = "var(--ink)";
const STEEL = "var(--ink-faint)";
const AMBER = "#ff7a1a";
const CYAN = "#00d4ff";

// Each token is text or an emoji slot. Emoji slots animate in and carry
// a mono caption describing what the system resolves them to.
type Token =
  | { t: "text"; v: string }
  | { t: "emoji"; v: string; tag: string; tint: string };

const SENTENCE: Token[] = [
  { t: "text", v: "I build" },
  { t: "emoji", v: "⚛️", tag: "interfaces", tint: CYAN },
  { t: "text", v: "interfaces, ship" },
  { t: "emoji", v: "📱", tag: "mobile", tint: "#9b5cff" },
  { t: "text", v: "apps, wire in" },
  { t: "emoji", v: "🤖", tag: "ai.layer", tint: "#39ffa5" },
  { t: "text", v: "AI, and run" },
  { t: "emoji", v: "☁️", tag: "azure·gcp", tint: "#4f9cff" },
  { t: "text", v: "cloud — all from one" },
  { t: "emoji", v: "🖥️", tag: "command", tint: AMBER },
  { t: "text", v: "command surface." },
];

// Deterministic fly-in vectors per emoji index (vw/vh fractions). Tuned so
// glyphs sweep in from spread, off-axis origins for an intentional, fanned
// convergence rather than a uniform implosion.
const VECTORS = [
  { x: -0.62, y: -0.52, r: -85, s: 0.18 },
  { x: 0.58, y: -0.62, r: 70, s: 0.22 },
  { x: -0.5, y: 0.6, r: 60, s: 0.2 },
  { x: 0.64, y: 0.5, r: -65, s: 0.24 },
  { x: 0.05, y: -0.78, r: 100, s: 0.16 },
];

export function EmojiConvergeSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const countRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let ctx: ReturnType<typeof gsap.context> | null = null;

    const boot = async () => {
      await registerAll();
      if (cancelled || !rootRef.current) return;
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      ctx = gsap.context(() => {
        // Reduced motion: present the fully-resolved end-state, no flight.
        if (reduced) {
          gsap.set(
            ["[data-emoji]", "[data-line]", "[data-cap]", "[data-reticle]", "[data-kicker]", "[data-readout]"],
            { opacity: 1, x: 0, y: 0, rotate: 0, scale: 1, clearProps: "transform" }
          );
          return;
        }

        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Start the readout in its pre-resolve state (animated path only).
        if (countRef.current) countRef.current.textContent = "0";
        if (statusRef.current) {
          statusRef.current.textContent = "resolving…";
          statusRef.current.style.color = STEEL;
        }

        // Kicker + sentence body rise once on entry — the canvas the
        // glyphs converge onto.
        gsap.from("[data-kicker]", {
          opacity: 0,
          y: -16,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 80%", once: true },
        });
        gsap.from("[data-line]", {
          opacity: 0,
          y: 34,
          duration: 0.9,
          ease: "power3.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 78%", once: true },
        });
        gsap.from("[data-readout]", {
          opacity: 0,
          y: 16,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 62%", once: true },
        });

        // Convergence — ONE scrubbed master timeline (synchronized + robust)
        // rather than five independent triggers. Retargeted so the sentence
        // is fully assembled exactly when it reaches the VIEWPORT CENTER: the
        // trigger is the manifesto line itself, scrubbing from the moment it
        // enters at the bottom edge until its center meets the screen center.
        const lineEl =
          rootRef.current?.querySelector<HTMLElement>("[data-line]") ?? rootRef.current;
        const emojis = gsap.utils.toArray<HTMLElement>("[data-emoji]");
        const STAGGER = 0.14; // gap between each glyph's launch along the timeline
        const DUR = 0.62; // each glyph's flight duration (timeline units)

        // Fraction of the timeline at which each glyph has fully locked into
        // its slot — drives the live "resolved" counter. Filled after build.
        let landFrac: number[] = [];

        const master = gsap.timeline({
          scrollTrigger: {
            trigger: lineEl,
            start: "top bottom",
            end: "center center",
            scrub: 0.8,
            onUpdate: (self) => {
              const p = self.progress;
              const resolved = landFrac.reduce((n, f) => (p >= f ? n + 1 : n), 0);
              if (countRef.current) countRef.current.textContent = String(resolved);
              const done = resolved === emojis.length && emojis.length > 0;
              if (statusRef.current) {
                statusRef.current.textContent = done ? "signal locked" : "resolving…";
                statusRef.current.style.color = done ? AMBER : STEEL;
              }
            },
          },
        });

        emojis.forEach((el, i) => {
          const v = VECTORS[i % VECTORS.length];
          const slot = el.closest<HTMLElement>("[data-slot]");
          const reticle = slot?.querySelector<HTMLElement>("[data-reticle]") ?? null;
          const cap = slot?.querySelector<HTMLElement>("[data-cap]") ?? null;
          const at = i * STAGGER;

          master.fromTo(
            el,
            { x: v.x * vw, y: v.y * vh, rotate: v.r, scale: v.s, opacity: 0 },
            { x: 0, y: 0, rotate: 0, scale: 1, opacity: 1, ease: "power3.out", duration: DUR },
            at
          );
          if (reticle) {
            master.fromTo(
              reticle,
              { opacity: 0, scale: 1.5, rotate: -25 },
              { opacity: 1, scale: 1, rotate: 0, ease: "power2.out", duration: 0.45 },
              at + DUR * 0.55
            );
          }
          if (cap) {
            master.fromTo(
              cap,
              { opacity: 0, y: 6 },
              { opacity: 1, y: 0, ease: "power2.out", duration: 0.4 },
              at + DUR * 0.62
            );
          }
        });

        // The glyph is "resolved" the instant its flight tween ends.
        const total = master.duration() || 1;
        landFrac = emojis.map((_, i) => (i * STAGGER + DUR) / total);
      }, rootRef.current);
    };
    void boot();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  let emojiIndex = -1;

  return (
    <SectionFrame id="scatter" ariaLabelledBy="scatter-title">
      {/* local atmosphere: faint converging vignette + baseline grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div
          className="absolute left-1/2 top-1/2 h-[60vh] w-[60vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.10] blur-[140px]"
          style={{ background: `radial-gradient(circle, ${CYAN}, transparent 70%)` }}
        />
        <div className="grid-bg absolute inset-0 opacity-[0.18]" />
      </div>

      <div ref={rootRef} className="relative mx-auto flex w-full max-w-5xl flex-col">
        {/* Kicker rule — matches the dossier system header used elsewhere */}
        <div
          data-kicker
          className="flex items-center justify-between border-t pt-3 font-mono text-[11px] uppercase tracking-[0.3em]"
          style={{ borderColor: "var(--line)", color: STEEL }}
        >
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: CYAN, boxShadow: `0 0 8px ${CYAN}` }}
            />
            SYS.SCATTER · INTENT RESOLVE
          </span>
          <span style={{ color: CYAN }}>04 / 06</span>
        </div>

        <h2 id="scatter-title" className="sr-only">
          What I build
        </h2>

        {/* Sub-label above the manifesto */}
        <p
          data-kicker
          className="mt-10 text-center font-mono text-[11px] uppercase tracking-[0.34em] md:mt-14"
          style={{ color: STEEL }}
        >
          <span style={{ color: INK }}>// </span>
          one operator, the whole stack
        </p>

        {/* The converging manifesto */}
        <p
          data-line
          className="mt-5 text-center font-grotesk text-[clamp(2rem,6vw,4.8rem)] leading-[1.12] tracking-[-0.02em]"
          style={{ fontWeight: 800, color: INK }}
        >
          {SENTENCE.map((tok, i) => {
            if (tok.t === "text") {
              return (
                <span key={i} className="text-ink">
                  {tok.v}{" "}
                </span>
              );
            }
            emojiIndex += 1;
            const idx = emojiIndex;
            return (
              <span
                key={i}
                data-slot
                className="relative mx-1.5 inline-flex flex-col items-center align-middle"
              >
                {/* HUD target reticle behind the glyph slot */}
                <span
                  data-reticle
                  aria-hidden
                  className="pointer-events-none absolute left-1/2 top-[0.46em] -z-10 block -translate-x-1/2 -translate-y-1/2 will-change-transform"
                  style={{ width: "1.5em", height: "1.5em", opacity: 0 }}
                >
                  <span
                    className="absolute inset-0 rounded-[0.35em] border"
                    style={{ borderColor: `${tok.tint}66` }}
                  />
                  {/* corner ticks */}
                  {(["-0.5", "0.5"] as const).map((sx) =>
                    (["-0.5", "0.5"] as const).map((sy) => (
                      <span
                        key={`${sx}-${sy}`}
                        className="absolute h-[0.18em] w-[0.18em]"
                        style={{
                          left: `calc(50% + ${Number(sx) * 1.5}em - 0.09em)`,
                          top: `calc(50% + ${Number(sy) * 1.5}em - 0.09em)`,
                          borderColor: tok.tint,
                          borderStyle: "solid",
                          borderTopWidth: Number(sy) < 0 ? "1px" : 0,
                          borderBottomWidth: Number(sy) > 0 ? "1px" : 0,
                          borderLeftWidth: Number(sx) < 0 ? "1px" : 0,
                          borderRightWidth: Number(sx) > 0 ? "1px" : 0,
                        }}
                      />
                    ))
                  )}
                </span>

                {/* the glyph */}
                <span
                  data-emoji
                  data-i={idx}
                  className="inline-block leading-none will-change-transform"
                  style={{ fontWeight: 400 }}
                >
                  {tok.v}
                </span>

                {/* resolve caption */}
                <span
                  data-cap
                  className="pointer-events-none absolute top-[1.05em] whitespace-nowrap font-mono text-[0.16em] uppercase tracking-[0.26em] will-change-transform"
                  style={{ color: tok.tint, opacity: 0 }}
                >
                  {tok.tag}
                </span>
              </span>
            );
          })}
        </p>

        {/* Bottom HUD readout — frames the manifesto as a resolved signal */}
        <div
          data-readout
          className="mx-auto mt-14 flex w-full max-w-2xl items-center justify-between gap-4 border-t pt-4 font-mono text-[10px] uppercase tracking-[0.26em] md:mt-20"
          style={{ borderColor: "var(--line)", color: STEEL }}
        >
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "#39ffa5", boxShadow: "0 0 8px #39ffa5" }}
            />
            <span ref={countRef} style={{ color: INK }}>5</span> / 5 resolved
          </span>
          <span className="hidden sm:inline" style={{ color: "var(--ink-dim)" }}>
            interfaces · mobile · ai · cloud · cli
          </span>
          <span ref={statusRef} style={{ color: AMBER }}>signal locked</span>
        </div>
      </div>
    </SectionFrame>
  );
}

export default EmojiConvergeSection;
