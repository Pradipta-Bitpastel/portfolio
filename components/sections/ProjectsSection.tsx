"use client";

import { useEffect, useRef } from "react";
import { gsap, registerAll, ScrollTrigger, SplitText } from "@/lib/gsap";
import { SectionFrame } from "@/components/ui/SectionFrame";
import { projects } from "@/content/projects";
import { getSection } from "@/lib/sections";

const PROJECTS = getSection("projects")!;
const ACCENT = PROJECTS.color; // amber/orange

/**
 * Projects / SYS.EXECUTION.
 *
 * On desktop (>=768px, no reduced-motion) the project cards live in a
 * STATIC horizontal track that is pinned and scrubbed sideways as you
 * scroll — vertical scroll drives the track's `x`. A progress rail at
 * the bottom tracks horizontal travel, and each slide gets a small
 * scale/opacity entrance tied to the same horizontal progress.
 *
 * On smaller / touch screens or with reduced-motion, the same track
 * stacks vertically and scrolls natively — no pin, no horizontal motion.
 *
 * GUARDRAILS: this is the ONLY GSAP `pin` in the app. The pinned
 * subtree (`trackRef`) is fully static — it never re-renders or
 * reparents per state, which previously caused removeChild crashes.
 * Everything is scoped to a `gsap.context()` and reverted on unmount.
 */
export function ProjectsSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const railPosRef = useRef<HTMLSpanElement>(null);

  // ── Header reveal (independent of the pin; native ScrollTrigger reveal).
  useEffect(() => {
    const root = headRef.current;
    if (!root) return;
    let cancelled = false;
    let ctx: ReturnType<typeof gsap.context> | null = null;
    let split: InstanceType<typeof SplitText> | null = null;

    const boot = async () => {
      await registerAll();
      if (cancelled || !headRef.current) return;
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      ctx = gsap.context(() => {
        if (reduced) {
          gsap.set(
            ["[data-pj-eyebrow]", "[data-pj-meta]", "[data-pj-rule]"],
            { opacity: 1, y: 0, scaleX: 1 }
          );
          return;
        }

        gsap.from("[data-pj-eyebrow]", {
          opacity: 0, y: -10, duration: 0.6, ease: "power3.out",
          scrollTrigger: { trigger: root, start: "top 82%", once: true },
        });

        const titleEl = root.querySelector<HTMLElement>("[data-pj-title]");
        if (titleEl) {
          split = new SplitText(titleEl, { type: "chars" });
          gsap.from(split.chars, {
            yPercent: 118, opacity: 0, rotateX: -55,
            duration: 0.85, ease: "power4.out", stagger: 0.03,
            scrollTrigger: { trigger: root, start: "top 80%", once: true },
          });
        }

        gsap.from("[data-pj-rule]", {
          scaleX: 0, transformOrigin: "left center",
          duration: 1.1, ease: "power3.inOut",
          scrollTrigger: { trigger: root, start: "top 80%", once: true },
        });

        gsap.from("[data-pj-meta]", {
          opacity: 0, y: 16, duration: 0.7, stagger: 0.08, ease: "power3.out",
          scrollTrigger: { trigger: root, start: "top 76%", once: true },
        });
      }, root);
    };

    void boot();
    return () => {
      cancelled = true;
      ctx?.revert();
      split?.revert();
    };
  }, []);

  // ── Pinned horizontal scrub (THE one allowed pin). Unchanged logic.
  useEffect(() => {
    let cancelled = false;
    let ctx: ReturnType<typeof gsap.context> | null = null;

    const boot = async () => {
      await registerAll();
      if (cancelled || !rootRef.current) return;

      ctx = gsap.context(() => {
        const mm = gsap.matchMedia();

        mm.add(
          "(min-width: 768px) and (prefers-reduced-motion: no-preference)",
          () => {
            const track = trackRef.current;
            const pin = pinRef.current;
            const rail = railRef.current;
            if (!track || !pin) return;

            const slides = gsap.utils.toArray<HTMLElement>(
              track.querySelectorAll("[data-slide]")
            );
            const amount = () => Math.max(0, track.scrollWidth - window.innerWidth);

            // EDGE CASE: on very wide viewports (or with few cards) the track
            // can be narrower than the viewport, so `amount()` is 0 — pinning
            // then would lock the page for a zero-distance scrub (a dead pin
            // that just freezes scroll). Skip the pin entirely below this
            // threshold and leave the track in normal centered flow.
            const MIN_PIN_TRAVEL = 80; // px
            if (amount() < MIN_PIN_TRAVEL) {
              gsap.set(slides, { clearProps: "scale,opacity,transformOrigin" });
              return;
            }

            gsap.set(slides, { transformOrigin: "center center" });

            const railTotal = slides.length;

            // PERF: cache each slide's static center (offsetLeft/Width are
            // layout positions, unaffected by the `x` transform) instead of
            // re-reading them every frame — those reads forced a synchronous
            // reflow per scroll tick and were the source of the jank. We
            // re-measure only on refresh (resize / font load / layout change).
            let centers: number[] = [];
            const measure = () => {
              centers = slides.map((s) => s.offsetLeft + s.offsetWidth / 2);
            };

            // PERF: quickSetters write straight to the transform cache, far
            // cheaper than gsap.set() in the hot path.
            //
            // Use per-axis scaleX/scaleY setters — NOT a "scale" shorthand
            // quickSetter. GSAP can't fast-path the 2-component "scale" and
            // falls back to `setAttribute("scaleX,scaleY", …)`; the comma is
            // an invalid attribute name, so WebKit/Safari throws "Invalid
            // qualified name" (Chrome silently tolerates it). That throw fired
            // inside this pin trigger's onRefresh during ScrollTrigger.refresh(),
            // aborting the whole refresh and leaving EVERY section's scroll
            // reveal frozen in its hidden from-state — i.e. a blank page below
            // the hero in Safari. Two single-axis setters avoid the attr path
            // entirely and write straight to the transform cache everywhere.
            const setScaleX = slides.map((s) => gsap.quickSetter(s, "scaleX"));
            const setScaleY = slides.map((s) => gsap.quickSetter(s, "scaleY"));
            const setOpacity = slides.map((s) => gsap.quickSetter(s, "opacity"));
            const setRail = rail ? gsap.quickSetter(rail, "scaleX") : null;
            let lastIdx = -1;

            // Single place that maps progress → all visual state, so the
            // pin-engage frame matches the pre-pin frame exactly (no snap).
            const apply = (p: number) => {
              if (setRail) setRail(p);
              if (railPosRef.current) {
                const idx = Math.min(
                  railTotal,
                  Math.max(1, Math.round(p * (railTotal - 1)) + 1)
                );
                if (idx !== lastIdx) {
                  railPosRef.current.textContent = String(idx).padStart(2, "0");
                  lastIdx = idx;
                }
              }
              const total = amount();
              if (total <= 0) return;
              const offset = p * total;
              const w = window.innerWidth;
              const half = w / 2;
              for (let i = 0; i < slides.length; i++) {
                const center = centers[i] - offset;
                const dist = Math.abs(center - half) / w; // 0 = centered
                const k = dist >= 1 ? 0 : 1 - dist;
                const sc = 0.9 + 0.1 * k;
                setScaleX[i](sc);
                setScaleY[i](sc);
                setOpacity[i](0.42 + 0.58 * k);
              }
            };

            const tween = gsap.to(track, {
              x: () => -amount(),
              ease: "none",
              scrollTrigger: {
                trigger: pin,
                start: "top top",
                end: () => "+=" + amount(),
                pin: true,
                pinSpacing: true,
                scrub: 0.6,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                // Re-measure after every refresh, THEN re-apply current
                // progress so the cached geometry and visuals stay correct
                // across resizes without a one-frame flash.
                onRefresh: (self) => {
                  measure();
                  apply(self.progress);
                },
                onUpdate: (self) => apply(self.progress),
              },
            });

            // Pre-paint the start state before the pin is ever reached so the
            // first pinned frame is identical — kills the enter/exit flicker.
            measure();
            apply(0);

            return () => {
              tween.scrollTrigger?.kill();
              tween.kill();
              gsap.set(track, { clearProps: "x" });
              gsap.set(slides, { clearProps: "scale,opacity,transformOrigin" });
              if (rail) gsap.set(rail, { clearProps: "scaleX" });
            };
          }
        );
      }, rootRef);

      ScrollTrigger.refresh();
    };

    void boot();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  const total = String(projects.length).padStart(2, "0");

  return (
    <SectionFrame
      id="projects"
      ariaLabelledBy="projects-title"
      bare
      className="relative pt-[clamp(64px,10vh,140px)]"
    >
      {/* Local atmosphere: a soft amber wash anchored to the section. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div
          className="absolute right-[6%] top-[18%] h-[44vh] w-[44vh] rounded-full opacity-[0.10] blur-[140px]"
          style={{ background: ACCENT }}
        />
        <div
          className="absolute left-[4%] bottom-[10%] h-[30vh] w-[30vh] rounded-full opacity-[0.06] blur-[130px]"
          style={{ background: "#4f9cff" }}
        />
      </div>

      <div ref={rootRef} className="relative w-full">
        {/* ── Section header ─────────────────────────────────────────── */}
        <div
          ref={headRef}
          className="mx-auto w-full max-w-6xl px-[clamp(16px,5vw,96px)] mb-10 md:mb-14"
        >
          <div
            data-pj-eyebrow
            className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.32em]"
            style={{ color: ACCENT }}
          >
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: ACCENT, boxShadow: `0 0 10px ${ACCENT}` }}
            />
            {PROJECTS.eyebrow}
          </div>

          <div className="mt-5 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="overflow-hidden">
              <h2
                id="projects-title"
                data-pj-title
                className="font-display leading-[0.82] tracking-[-0.04em] text-ink"
                style={{ fontWeight: 800, fontSize: "clamp(3rem,9vw,7.5rem)" }}
              >
                EXECUTION
              </h2>
            </div>

            {/* Right-aligned meta block: lead line + scroll affordance. */}
            <div data-pj-meta className="md:max-w-xs md:pb-2 md:text-right">
              <p className="font-serif text-[clamp(1.05rem,2vw,1.5rem)] italic leading-[1.3] text-ink/85">
                Selected work across web, mobile and cloud.
              </p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.26em] text-ink-faint">
                {total} dossiers · scroll to traverse
              </p>
            </div>
          </div>

          <div
            data-pj-rule
            className="mt-7 h-px w-full origin-left"
            style={{
              background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}22 60%, transparent)`,
            }}
          />
        </div>

        {/* ── Pin target — 100svh viewport on desktop, auto on mobile ── */}
        <div
          ref={pinRef}
          className="relative flex items-center md:h-[100svh] md:overflow-hidden"
          // Keep the pinned element on its own compositor layer at all times.
          // GSAP pins via position:fixed on native scroll; without a stable
          // layer the browser creates/destroys one at the fixed switch, which
          // is the repaint flash seen on pin-IN and pin-OUT. translateZ(0)
          // pre-promotes it so the switch no longer reshuffles layers.
          style={{ transform: "translateZ(0)" }}
        >
          {/* Static horizontal track — pinned subtree, never re-renders. */}
          <div
            ref={trackRef}
            className="flex w-full flex-col gap-7 px-[clamp(16px,5vw,96px)] will-change-transform md:w-auto md:flex-row md:items-center md:gap-10 md:px-[8vw]"
          >
            {/* Leading rail-card: anchors the slide rhythm + frames intent. */}
            <div
              data-slide
              className="relative hidden shrink-0 flex-col justify-between md:flex md:h-[64vh] md:w-[280px]"
            >
              <div>
                <span
                  className="font-mono text-[11px] uppercase tracking-[0.3em]"
                  style={{ color: ACCENT }}
                >
                  index
                </span>
                <p className="mt-4 font-display text-[clamp(2rem,3vw,3rem)] leading-[0.9] tracking-[-0.03em] text-ink" style={{ fontWeight: 800 }}>
                  The work,
                  <br />
                  <span className="text-ink/55">on the record.</span>
                </p>
                <p className="mt-5 max-w-[24ch] text-sm leading-relaxed text-ink-dim">
                  Five representative builds — each a self-contained dossier of
                  scope, stack and shipping outcome.
                </p>
              </div>

              <ul className="mt-8 flex flex-col gap-2.5 font-mono text-[11px] uppercase tracking-[0.16em]">
                {projects.map((p, i) => (
                  <li key={p.id} className="flex items-center gap-3 text-ink-faint">
                    <span style={{ color: p.color }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      aria-hidden
                      className="h-px flex-1"
                      style={{ background: `${p.color}33` }}
                    />
                    <span className="truncate text-ink/70">{p.name}</span>
                  </li>
                ))}
              </ul>
            </div>

            {projects.map((p, i) => {
              const num = String(i + 1).padStart(2, "0");
              return (
                <article
                  key={p.id}
                  data-slide
                  className="group relative flex shrink-0 flex-col overflow-hidden rounded-[20px] border border-line transition-[border-color,box-shadow] duration-500 hover:border-line-strong md:h-[64vh] md:w-[460px]"
                  style={
                    {
                      // Near-opaque, theme-aware panel fill. Replaces the old
                      // `bg-surface` (4% alpha) + `backdrop-blur-[2px]`, which
                      // forced the GPU to blur the MOVING 3D scene behind every
                      // card on every scrub frame — the section's main lag
                      // source. A solid-ish fill composites for free.
                      background: "color-mix(in srgb, var(--bg) 88%, transparent)",
                      boxShadow: `0 24px 60px -28px ${p.color}33, inset 0 0 0 1px ${p.color}1a`,
                      ["--pc" as string]: p.color,
                    } as React.CSSProperties
                  }
                >
                  {/* accent edge-glow that intensifies on hover */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-0 rounded-[20px] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                    style={{ boxShadow: `inset 0 0 80px -30px ${p.color}` }}
                  />

                  {/* ── Imagery zone: a procedural "viewport" panel ─────── */}
                  <div className="relative h-[40%] shrink-0 overflow-hidden">
                    {/* tinted gradient field */}
                    <div
                      aria-hidden
                      className="absolute inset-0"
                      style={{
                        background: `radial-gradient(120% 120% at 78% 18%, ${p.color}38, transparent 58%), linear-gradient(160deg, ${p.color}1f, transparent 70%)`,
                      }}
                    />
                    {/* blueprint grid */}
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-[0.5]"
                      style={{
                        backgroundImage: `linear-gradient(${p.color}14 1px, transparent 1px), linear-gradient(90deg, ${p.color}14 1px, transparent 1px)`,
                        backgroundSize: "34px 34px",
                        maskImage:
                          "radial-gradient(120% 100% at 70% 20%, #000 40%, transparent 100%)",
                        WebkitMaskImage:
                          "radial-gradient(120% 100% at 70% 20%, #000 40%, transparent 100%)",
                      }}
                    />
                    {/* drifting accent orb */}
                    <div
                      aria-hidden
                      className="absolute -right-10 -top-12 h-44 w-44 rounded-full blur-[36px] transition-transform duration-700 group-hover:scale-110"
                      style={{ background: `${p.color}55` }}
                    />
                    {/* giant ghost numeral */}
                    <span
                      aria-hidden
                      className="pointer-events-none absolute -left-2 bottom-[-2.4rem] select-none font-display leading-none"
                      style={{
                        fontWeight: 800,
                        fontSize: "11rem",
                        color: p.color,
                        opacity: 0.12,
                      }}
                    >
                      {num}
                    </span>
                    {/* window chrome / status bar */}
                    <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-4">
                      <span className="flex items-center gap-1.5" aria-hidden>
                        <span className="h-2 w-2 rounded-full bg-line-strong" />
                        <span className="h-2 w-2 rounded-full bg-line-strong" />
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: p.color, boxShadow: `0 0 8px ${p.color}` }}
                        />
                      </span>
                      <span
                        className="font-mono text-[10px] uppercase tracking-[0.28em]"
                        style={{ color: `${p.color}` }}
                      >
                        run // {num}
                      </span>
                    </div>
                    {/* bottom fade so type sits cleanly below */}
                    <div
                      aria-hidden
                      className="absolute inset-x-0 bottom-0 h-16"
                      style={{
                        background:
                          "linear-gradient(transparent, color-mix(in srgb, var(--bg) 90%, transparent))",
                      }}
                    />
                  </div>

                  {/* ── Body: metadata + copy + tags ───────────────────── */}
                  <div className="relative flex min-h-0 flex-1 flex-col px-6 pb-6 pt-5">
                    <h3
                      className="font-display text-[1.7rem] leading-[1.05] tracking-[-0.01em] text-ink md:text-[1.9rem]"
                      style={{ fontWeight: 700 }}
                    >
                      {p.name}
                    </h3>
                    <p className="mt-2 font-serif text-[15px] italic leading-snug text-ink/80">
                      {p.tagline}
                    </p>

                    <p className="mt-4 text-[13.5px] leading-relaxed text-ink-dim line-clamp-3 md:line-clamp-4">
                      {p.description}
                    </p>

                    {/* stack tags pinned to the card bottom */}
                    <ul className="mt-auto flex flex-wrap gap-2 pt-4">
                      {p.stack.map((s) => (
                        <li
                          key={s}
                          className="rounded-full border px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-ink/75 transition-colors duration-300 group-hover:text-ink"
                          style={{
                            borderColor: `${p.color}33`,
                            background: `${p.color}0d`,
                          }}
                        >
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* bottom accent ticker that wipes in on hover */}
                  <span
                    aria-hidden
                    className="absolute inset-x-0 bottom-0 h-[2px] origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                    style={{ background: p.color }}
                  />
                </article>
              );
            })}

            {/* Trailing end-cap to give the last card breathing room. */}
            <div data-slide aria-hidden className="hidden shrink-0 md:block md:w-[6vw]" />
          </div>

          {/* ── Bottom progress rail — only while pinned (desktop) ────── */}
          <div className="pointer-events-none absolute inset-x-[8vw] bottom-8 hidden items-center gap-4 md:flex">
            <span className="font-mono text-[11px] uppercase tracking-[0.24em] text-ink-faint">
              <span ref={railPosRef}>01</span>
              <span className="text-ink/40"> / {total}</span>
            </span>
            <div className="relative h-px flex-1 overflow-hidden rounded-full bg-line">
              <div
                ref={railRef}
                className="h-full w-full origin-left scale-x-0 rounded-full"
                style={{ background: `linear-gradient(90deg, ${ACCENT}, #4f9cff)` }}
              />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-faint/70">
              traverse →
            </span>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}

export default ProjectsSection;
