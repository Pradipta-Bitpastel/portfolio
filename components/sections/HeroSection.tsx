"use client";

import { memo, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerAll, hasPlugin } from "@/lib/gsap";
import { sceneStore } from "@/lib/sceneStore";
import { cn } from "@/lib/cn";
import { SectionFrame } from "@/components/ui/SectionFrame";

/**
 * Hero section — "SYS.BOOT // 01".
 *
 * Layout: 12-col grid. LEFT column (7/12) is a vertical stack:
 *   eyebrow → giant amber "01" → stacked headline (SYSTEM / // BOOT)
 *   → subtitle → CTA. RIGHT column (5/12) is reserved for the 3D
 *   laptop docked by SceneDock. The "01" is its OWN row above the
 *   headline — it no longer sits beside it eating column width.
 *
 * Animations:
 * - Headline per-char reveal (SplitText or manual splitter fallback).
 * - Eyebrow ScrambleText or instant fallback.
 * - Grid DrawSVG reveal or stroke-dash fallback.
 * - Boot-log TextPlugin typewriter or manual fallback.
 * - Scroll-triggered core scale-from-zero + glow spin-up.
 *   Position/rotation is driven by SceneDock.
 */

const EYEBROW = "SYS.BOOT — [T+00:02:47]";

const BOOT_LOG_LINES: ReadonlyArray<string> = [
  "> booting runtime v14.2",
  "> linking modules [5/5]",
  "> signal locked — scroll to init."
];

type CharSpans = HTMLSpanElement[];

function splitChars(el: HTMLElement): CharSpans {
  const text = el.textContent ?? "";
  el.textContent = "";
  const spans: CharSpans = [];
  for (const ch of Array.from(text)) {
    const span = document.createElement("span");
    span.className = "inline-block will-change-transform";
    span.textContent = ch === " " ? "\u00a0" : ch;
    el.appendChild(span);
    spans.push(span);
  }
  return spans;
}

function HeroSectionImpl() {
  const rootRef = useRef<HTMLElement>(null);
  const headlineLine1Ref = useRef<HTMLSpanElement>(null);
  const headlineLine2Ref = useRef<HTMLSpanElement>(null);
  const eyebrowRef = useRef<HTMLSpanElement>(null);
  const arrowRef = useRef<HTMLSpanElement>(null);
  const gridPathsRef = useRef<SVGSVGElement>(null);
  const bootLogRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;

      let cancelled = false;

      const boot = async () => {
        await registerAll();
        if (cancelled) return;

        // ----- Headline per-char split + reveal ---------------------
        const revealLine = (el: HTMLElement | null, delay: number) => {
          if (!el) return;
          let spans: HTMLElement[] | null = null;
          if (hasPlugin("SplitText")) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const SplitText = (gsap as any).core?.globals?.()?.SplitText;
              if (SplitText) {
                const split = new SplitText(el, { type: "chars" });
                spans = split.chars as HTMLElement[];
              }
            } catch {
              /* fall through to manual split */
            }
          }
          if (!spans) spans = splitChars(el);
          const ease = hasPlugin("CustomEase") ? "powerSmooth" : "power2.out";
          gsap.set(spans, { y: 80, opacity: 0 });
          gsap.to(spans, {
            y: 0,
            opacity: 1,
            duration: 0.7,
            stagger: 0.03,
            ease,
            delay
          });
        };
        revealLine(headlineLine1Ref.current, 0.15);
        revealLine(headlineLine2Ref.current, 0.45);

        // ----- Eyebrow ScrambleText (or instant fallback) ----------
        const eyebrow = eyebrowRef.current;
        if (eyebrow) {
          if (hasPlugin("ScrambleTextPlugin")) {
            gsap.to(eyebrow, {
              duration: 1.2,
              scrambleText: {
                text: EYEBROW,
                chars: "01_/.$#",
                revealDelay: 0.2,
                tweenLength: false
              },
              delay: 0.05
            });
          } else {
            eyebrow.textContent = EYEBROW;
          }
        }

        // ----- Grid: DrawSVG stroke reveal, CSS fallback -----------
        const svg = gridPathsRef.current;
        if (svg) {
          const lines = svg.querySelectorAll<SVGLineElement>("line");
          if (hasPlugin("DrawSVGPlugin")) {
            try {
              gsap.fromTo(
                lines,
                { drawSVG: "0%" },
                {
                  drawSVG: "100%",
                  duration: 1.6,
                  ease: "power2.out",
                  stagger: 0.01
                }
              );
            } catch {
              lines.forEach((l) => {
                l.style.opacity = "1";
              });
            }
          } else {
            lines.forEach((line) => {
              const total = line.getTotalLength
                ? line.getTotalLength()
                : 200;
              line.style.strokeDasharray = `${total}`;
              line.style.strokeDashoffset = `${total}`;
            });
            gsap.to(lines, {
              strokeDashoffset: 0,
              duration: 1.6,
              ease: "power2.out",
              stagger: 0.01
            });
          }
        }

        // ----- Boot log typewriter (TextPlugin if available) --------
        const bootLog = bootLogRef.current;
        if (bootLog) {
          const lineEls = Array.from(
            bootLog.querySelectorAll<HTMLElement>(".boot-log-line")
          );
          if (lineEls.length > 0) {
            const useText = hasPlugin("TextPlugin");
            const tl = gsap.timeline({ delay: 0.4 });
            lineEls.forEach((el, i) => {
              const target = el.dataset.target ?? "";
              el.textContent = "";
              if (useText) {
                const vars = {
                  duration: Math.max(0.4, target.length * 0.02),
                  text: { value: target, delimiter: "" },
                  ease: "none"
                } as unknown as gsap.TweenVars;
                tl.to(el, vars, i === 0 ? 0 : ">0.1");
              } else {
                const chars = Array.from(target);
                const state = { i: 0 };
                tl.to(state, {
                  i: chars.length,
                  duration: Math.max(0.4, chars.length * 0.02),
                  ease: "none",
                  onUpdate: () => {
                    const cut = Math.floor(state.i);
                    el.textContent = chars.slice(0, cut).join("");
                  },
                  onComplete: () => {
                    el.textContent = target;
                  }
                }, i === 0 ? 0 : ">0.1");
              }
            });
          }
        }

        // ----- Arrow wiggle -----
        const arrow = arrowRef.current;
        if (arrow) {
          const wiggleEase = hasPlugin("CustomWiggle") ? "wiggle" : "sine.inOut";
          gsap.to(arrow, {
            y: 6,
            duration: 1.2,
            repeat: -1,
            yoyo: true,
            ease: wiggleEase
          });
        }

        // ----- Core assemble (scale-from-zero + glow spin-up) -------
        // Core position/rotation is owned by SceneDock.
        const core = sceneStore.core.ref;
        const glow = sceneStore.core.glow;

        const assemble = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top top",
            end: "+=60%",
            scrub: 1
          }
        });

        if (core) {
          assemble.fromTo(
            core.scale,
            { x: 0.001, y: 0.001, z: 0.001 },
            { x: 1, y: 1, z: 1, ease: "power2.out" },
            0
          );
        }
        if (glow) {
          assemble.fromTo(
            glow,
            { intensity: 0 },
            { intensity: 3, ease: "power2.out" },
            0
          );
        }
      };

      void boot();

      return () => {
        cancelled = true;
      };
    },
    { scope: rootRef, dependencies: [] }
  );

  const H_LINES = 10;
  const V_LINES = 16;
  const hLines: number[] = [];
  const vLines: number[] = [];
  for (let i = 1; i < H_LINES; i++) hLines.push((i / H_LINES) * 100);
  for (let i = 1; i < V_LINES; i++) vLines.push((i / V_LINES) * 100);

  return (
    <SectionFrame
      id="hero"
      ref={rootRef}
      ariaLabelledBy="hero-heading"
    >
      {/* Background grid */}
      <svg
        ref={gridPathsRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-25"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
      >
        <g stroke="rgba(79,156,255,0.35)" strokeWidth="0.06">
          {hLines.map((y) => (
            <line key={`h${y}`} x1="0" y1={y} x2="100" y2={y} />
          ))}
          {vLines.map((x) => (
            <line key={`v${x}`} x1={x} y1="0" x2={x} y2="100" />
          ))}
        </g>
      </svg>

      {/* Left-side scrim so text wins over the right-docked 3D */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-[#0b0f19] via-[#0b0f19]/85 to-transparent md:block"
      />

      {/* Main grid — vertical stack layout, no giant number beside headline.
          z-20 so the content + CTA button paint ABOVE the CORE.BOOT
          terminal card (z-10 at the section root). Previously both
          were z-10 and the later-in-DOM terminal won the paint order,
          covering the SCROLL TO INIT button. */}
      <div
        className="relative z-20 grid w-full grid-cols-1 items-start gap-6 md:grid-cols-12"
      >
        {/* LEFT: text column, vertical stack. min-w-0 allows children to shrink without overflow. */}
        <div className="flex min-w-0 flex-col items-start gap-6 md:col-span-7">
          {/* eyebrow */}
          <span
            ref={eyebrowRef}
            className="font-mono text-[11px] uppercase tracking-[0.3em] text-[color:#FF7A1A]"
          >
            {EYEBROW}
          </span>

          {/* giant number — own row, above the headline */}
          <div
            aria-hidden
            className="select-none font-display font-black leading-none tracking-tight text-[color:#FF7A1A]"
            style={{
              fontSize: "clamp(3.5rem, 11vw, 10rem)",
              letterSpacing: "-0.02em"
            }}
          >
            01
          </div>

          {/* headline — full-width block, nowrap per word to kill orphans */}
          <h1
            id="hero-heading"
            className={cn(
              "font-display text-ink",
              "leading-[0.86] tracking-[-0.02em]",
              "drop-shadow-[0_0_30px_rgba(79,156,255,0.35)]"
            )}
            style={{
              fontWeight: 800,
              fontSize: "clamp(1.25rem, 6vw, 2.5rem)"
            }}
          >
            <span
              ref={headlineLine1Ref}
              className="block whitespace-nowrap"
            >
              SYSTEM  {"// BOOT"}
            </span>
            {/* <span
              ref={headlineLine2Ref}
              className="block whitespace-nowrap text-ink-dim"
            >
              {"// BOOT"}
            </span> */}
          </h1>

          <p className="max-w-[56ch] font-mono text-sm leading-relaxed text-ink-dim md:text-lg">
            A full-stack engineer orchestrating web, mobile and cloud
            from a single command surface.
          </p>

          {/* <a
            href="#about"
            className="relative z-20 mt-2 inline-flex items-center gap-3 self-start border border-[#FF7A1A]/60 bg-[#FF7A1A]/10 px-5 py-3 font-mono text-xs uppercase tracking-[0.3em] text-[#FF7A1A] transition-colors hover:bg-[#FF7A1A] hover:text-black"
          >
            SCROLL TO INIT
            <span aria-hidden>→</span>
          </a> */}
        </div>

        {/* RIGHT: reserved for the 3D laptop (docked by SceneDock). */}
        <div className="hidden md:col-span-5 md:block" aria-hidden />
      </div>

      {/* Boot-log terminal panel, bottom-left — pinned inside the
          section padding so it stays clear of the bottom HUD label. */}
      <div
        className="pointer-events-none absolute bottom-[clamp(56px,7vh,120px)] z-10 hidden w-[min(22rem,30vw)] md:block"
      >
        <div
          className="border border-white/15 bg-[#05080f]/90 p-3 font-mono text-[11px] text-ink-dim backdrop-blur"
        >
          <div className="mb-2 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
            <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
            <span className="h-2 w-2 rounded-full bg-[#28c840]" />
            <span className="ml-3 text-[9px] uppercase tracking-[0.28em] text-ink-dim/80">
              CORE.BOOT
            </span>
            <span className="ml-auto text-[9px] uppercase tracking-[0.28em] text-[#FF7A1A]">
              [T+00:02:47]
            </span>
          </div>
          <div ref={bootLogRef} className="space-y-1">
            {BOOT_LOG_LINES.map((line, i) => (
              <div
                key={i}
                className="boot-log-line min-h-[1.1em] whitespace-pre text-[11px] leading-snug text-ink/85"
                data-target={line}
              >
                {line}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator — kept inside the frame's right padding band */}
      <div className="pointer-events-none absolute bottom-[clamp(56px,7vh,120px)] right-[clamp(48px,6vw,96px)] z-10 flex flex-col items-center gap-2 text-ink-dim">
        <span className="font-mono text-[10px] uppercase tracking-[0.32em]">
          SCROLL
        </span>
        <span
          ref={arrowRef}
          className="inline-block h-6 w-px bg-gradient-to-b from-transparent to-[#FF7A1A]/70"
          aria-hidden="true"
        />
      </div>
    </SectionFrame>
  );
}

export const HeroSection = memo(HeroSectionImpl);
export default HeroSection;
