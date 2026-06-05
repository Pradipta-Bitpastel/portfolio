"use client";

import { useEffect, useRef } from "react";
import { gsap, registerAll } from "@/lib/gsap";
import { SectionFrame } from "@/components/ui/SectionFrame";

/**
 * SYS.MANIFEST — a Kubrick-style kinetic-type beat. A "surface" panel
 * unmasks open, then three giant verbs (DESIGN / BUILD / DEPLOY) wipe in
 * left-to-right one after another while a thin scan-line rides the wipe
 * edge and each word's accent rule draws beneath it. Everything is scrubbed
 * to scroll (scroll up and it reverses) — NO pin. Reduced motion shows the
 * fully-revealed end-state with no wipe.
 */

type Beat = {
  word: string;
  accent: string;
  index: string;
  caption: string;
};

const BEATS: ReadonlyArray<Beat> = [
  { word: "DESIGN", accent: "#4f9cff", index: "01", caption: "intent · systems · the first pixel" },
  { word: "BUILD", accent: "#9b5cff", index: "02", caption: "typed · tested · shipped to main" },
  { word: "DEPLOY", accent: "#39ffa5", index: "03", caption: "cloud · pipelines · the last server" },
];

// Theme-aware tokens. STEEL = dim mono/caption text (var(--ink-faint)). The
// alpha-tinted variants use color-mix off var(--bone)/var(--ink-faint) so they
// flip with the day/night theme like the rest of the section. (Primary etched
// type uses the `text-bone` utility on the root.)
const STEEL = "var(--ink-faint)";
const BONE_FAINT = "color-mix(in srgb, var(--bone) 20%, transparent)";
const BONE_LINE = "color-mix(in srgb, var(--bone) 12%, transparent)";
const BONE_HAIRLINE = "color-mix(in srgb, var(--bone) 8%, transparent)";
const STEEL_SOFT = "color-mix(in srgb, var(--ink-faint) 67%, transparent)";

export function KineticRevealSection() {
  const rootRef = useRef<HTMLDivElement>(null);

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
        if (reduced) {
          gsap.set(
            ["[data-word]", "[data-panel]", "[data-sub]", "[data-rule]", "[data-meta]", "[data-spine-fill]", "[data-ghost]"],
            { clipPath: "inset(0% 0% 0% 0%)", opacity: 1, xPercent: 0, scaleX: 1, scaleY: 1 }
          );
          gsap.set("[data-scan]", { opacity: 0 });
          return;
        }

        // Initial states — set so first paint shows the "sealed" surface.
        gsap.set("[data-word]", { clipPath: "inset(0% 100% 0% 0%)" });
        gsap.set("[data-ghost]", { clipPath: "inset(0% 100% 0% 0%)", opacity: 0 });
        gsap.set("[data-rule]", { scaleX: 0, transformOrigin: "left center" });
        gsap.set("[data-scan]", { opacity: 0, xPercent: 0 });
        gsap.set("[data-meta]", { opacity: 0, y: 14 });

        // The whole beat is scrubbed across the section's travel — no pin.
        const tl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 78%",
            end: "bottom 60%",
            scrub: 0.7,
          },
        });

        // 1 — the surface unseals from a slit.
        tl.from(
          "[data-panel]",
          { clipPath: "inset(50% 0% 50% 0%)", opacity: 0.25, duration: 0.9, ease: "power2.out" },
          0
        );

        // 1b — kicker label fades up with the surface.
        tl.from("[data-kicker]", { opacity: 0, y: -10, duration: 0.5, ease: "power2.out" }, 0.1);

        // 1c — the left progress spine draws down across the entire beat.
        tl.from("[data-spine-fill]", { scaleY: 0, transformOrigin: "top center", duration: 3, ease: "none" }, 0);

        // 2 — each verb wipes in, its ghost echoes behind it, a scan-line
        //     rides the wipe edge, and the accent rule draws under it.
        BEATS.forEach((b, i) => {
          const at = 0.55 + i * 0.9;
          tl.to(`[data-word="${b.word}"]`, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.85, ease: "power3.out" }, at);
          tl.to(`[data-ghost="${b.word}"]`, { clipPath: "inset(0% 0% 0% 0%)", opacity: 1, duration: 0.85, ease: "power3.out" }, at);
          // scan-line: a fast bright sweep that fades as the word resolves.
          tl.fromTo(
            `[data-scan="${b.word}"]`,
            { xPercent: -4, opacity: 0 },
            { xPercent: 104, opacity: 1, duration: 0.7, ease: "power2.in" },
            at
          );
          tl.to(`[data-scan="${b.word}"]`, { opacity: 0, duration: 0.2 }, at + 0.55);
          tl.to(`[data-rule="${b.word}"]`, { scaleX: 1, duration: 0.7, ease: "power3.inOut" }, at + 0.15);
          tl.to(`[data-meta="${b.word}"]`, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }, at + 0.3);
        });

        // 3 — the closing subtitle resolves last.
        tl.from("[data-sub]", { opacity: 0, y: 20, duration: 0.6, ease: "power2.out" }, ">-0.2");
      }, rootRef.current);
    };
    void boot();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <SectionFrame
      id="manifest"
      ariaLabelledBy="manifest-title"
      bare
      className="flex min-h-[100svh] items-center py-[clamp(80px,12vh,160px)]"
    >
      <div ref={rootRef} className="relative mx-auto w-full max-w-6xl text-bone">
        {/* Revealing "surface" — the slab the type is etched into. */}
        <div
          data-panel
          aria-hidden
          className="absolute inset-x-[clamp(4px,3vw,40px)] -z-0 overflow-hidden rounded-[28px] border border-line"
          style={{
            // The slab now wraps the ENTIRE content (with a small vertical
            // bleed) instead of being a fixed 86%-tall centered band — that
            // band was shorter than the content, so the kicker and the closing
            // line spilled past the border + corner ticks. A bleed keeps the
            // machined-frame look while guaranteeing nothing overlaps the edge.
            top: "calc(-1 * clamp(10px, 2.5vh, 32px))",
            bottom: "calc(-1 * clamp(10px, 2.5vh, 32px))",
            background:
              "linear-gradient(135deg, rgba(79,156,255,0.08), rgba(155,92,255,0.05) 45%, rgba(57,255,165,0.04))",
          }}
        >
          <div className="grid-bg absolute inset-0 opacity-50" />
          {/* corner ticks for that machined-panel feel */}
          <span className="absolute left-4 top-4 h-3 w-3 border-l border-t" style={{ borderColor: BONE_FAINT }} />
          <span className="absolute right-4 top-4 h-3 w-3 border-r border-t" style={{ borderColor: BONE_FAINT }} />
          <span className="absolute bottom-4 left-4 h-3 w-3 border-b border-l" style={{ borderColor: BONE_FAINT }} />
          <span className="absolute bottom-4 right-4 h-3 w-3 border-b border-r" style={{ borderColor: BONE_FAINT }} />
        </div>

        <div className="relative z-10 px-[clamp(16px,5vw,80px)] py-[clamp(28px,5vh,64px)]">
          {/* Kicker */}
          <div
            data-kicker
            className="flex items-center justify-between border-b pb-3 font-mono text-[11px] uppercase tracking-[0.32em]"
            style={{ borderColor: BONE_LINE }}
          >
            <span className="text-cyan">SYS.MANIFEST // how it ships</span>
            <span className="hidden sm:inline" style={{ color: STEEL_SOFT }}>
              SEQ · 03
            </span>
          </div>

          {/* The kinetic stack */}
          <div className="relative mt-[clamp(28px,5vh,56px)] flex">
            {/* Signature: left progress spine that fills as the beat plays. */}
            <div className="relative mr-[clamp(14px,3vw,40px)] hidden w-px shrink-0 sm:block" style={{ background: BONE_HAIRLINE }}>
              <div
                data-spine-fill
                aria-hidden
                className="absolute inset-x-0 top-0 h-full w-px origin-top"
                style={{ background: `linear-gradient(180deg, #4f9cff, #9b5cff 50%, #39ffa5)` }}
              />
            </div>

            <h2
              id="manifest-title"
              className="min-w-0 flex-1 font-display leading-[0.86] tracking-[-0.04em]"
              style={{ fontWeight: 800 }}
            >
              {BEATS.map((b, i) => (
                <div
                  key={b.word}
                  // leading-[0.86] packs the rows tight; without a gap the tall
                  // display caps of one verb bleed into the rule + verb below.
                  className={`group relative ${i > 0 ? "mt-[clamp(10px,2.2vh,30px)]" : ""}`}
                >
                  <div className="flex items-baseline gap-[clamp(10px,2vw,28px)]">
                    {/* index */}
                    <span
                      data-meta={b.word}
                      className="hidden shrink-0 translate-y-[-0.35em] font-mono text-[clamp(0.7rem,1vw,0.95rem)] uppercase tracking-[0.3em] sm:inline-block"
                      style={{ color: `${b.accent}` }}
                    >
                      {b.index}
                    </span>

                    {/* word + ghost echo + scan-line, all clipped together */}
                    <span className="relative inline-block overflow-hidden">
                      {/* outlined ghost echo, sits a touch behind */}
                      <span
                        data-ghost={b.word}
                        aria-hidden
                        className="pointer-events-none absolute -left-[0.04em] -top-[0.03em] block select-none text-[clamp(3rem,13.5vw,9.5rem)] will-change-[clip-path]"
                        style={{
                          color: "transparent",
                          WebkitTextStroke: `1px ${b.accent}3a`,
                        }}
                      >
                        {b.word}
                      </span>

                      {/* the live word */}
                      <span
                        data-word={b.word}
                        className="relative block text-[clamp(3rem,13.5vw,9.5rem)] will-change-[clip-path]"
                        style={{ color: b.accent }}
                      >
                        {b.word}
                      </span>

                      {/* bright scan-line riding the wipe edge */}
                      <span
                        data-scan={b.word}
                        aria-hidden
                        className="pointer-events-none absolute inset-y-0 left-0 w-[3px]"
                        style={{
                          background: `linear-gradient(180deg, transparent, ${b.accent}, transparent)`,
                          boxShadow: `0 0 22px 4px ${b.accent}cc`,
                        }}
                      />
                    </span>

                    {/* per-word caption — pinned to the baseline on wide screens */}
                    <span
                      data-meta={b.word}
                      className="ml-auto hidden max-w-[14ch] translate-y-[-0.3em] text-right font-mono text-[10px] uppercase leading-[1.5] tracking-[0.2em] lg:inline-block"
                      style={{ color: STEEL }}
                    >
                      {b.caption}
                    </span>
                  </div>

                  {/* accent rule that draws under each verb */}
                  <span
                    data-rule={b.word}
                    aria-hidden
                    className="mt-[clamp(6px,1vh,14px)] block h-px w-full origin-left"
                    style={{ background: `linear-gradient(90deg, ${b.accent}, ${b.accent}00 92%)` }}
                  />
                </div>
              ))}
            </h2>
          </div>

          {/* Closing line */}
          <p
            data-sub
            className="mt-[clamp(20px,4vh,40px)] max-w-md font-mono text-sm uppercase tracking-[0.24em] text-ink-faint"
          >
            one operator · web · mobile · cloud · end to end
          </p>
        </div>
      </div>
    </SectionFrame>
  );
}

export default KineticRevealSection;
