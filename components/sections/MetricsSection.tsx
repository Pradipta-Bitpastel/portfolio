"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, registerAll, ScrollTrigger } from "@/lib/gsap";
import { useTheme } from "@/lib/useTheme";

// Accents read on BOTH themes — keep static.
const AMBER = "#ff7a1a";
const AMBER_HI = "#ff8a3c";
const CYAN = "#00d4ff";

// Theme-aware neutrals. NIGHT keeps the exact prior values; DAY swaps to
// the dark-ink palette so text stays readable on warm parchment. Returned as
// 6-digit hex so existing `${BONE}22` alpha-suffix usage keeps working.
type Palette = { BONE: string; STEEL: string };
const NIGHT_PALETTE: Palette = { BONE: "#ece7df", STEEL: "#8b93a7" };
const DAY_PALETTE: Palette = { BONE: "#2a2620", STEEL: "#4f5667" };

type Metric = {
  value: number;
  suffix: string;
  label: string;
  unit: string;
  desc: string;
  fill: number;
};

const METRICS: Metric[] = [
  {
    value: 5,
    suffix: "",
    label: "Stacks Owned",
    unit: "domains",
    desc: "Frontend, Backend, DevOps, Cloud & Mobile — each owned end to end.",
    fill: 0.84,
  },
  {
    value: 3,
    suffix: "+",
    label: "Years Shipping",
    unit: "in production",
    desc: "Production web, mobile and cloud software, shipped continuously.",
    fill: 0.58,
  },
  {
    value: 2,
    suffix: "",
    label: "Clouds Run",
    unit: "Azure · GCP",
    desc: "From VM provisioning all the way to go-live, on two providers.",
    fill: 0.46,
  },
  {
    value: 5,
    suffix: "",
    label: "Projects Shipped",
    unit: "selected work",
    desc: "Selected production work spanning the entire stack.",
    fill: 0.84,
  },
];

const R = 132; // active arc radius
const CIRC = 2 * Math.PI * R;
const TICKS = 60;

/**
 * SYS.METRICS — "Universe in Numbers".
 *
 * A scroll-scrubbed stat cycler: a tall section scrolls past a CSS-sticky
 * stage (NO GSAP pin), and a non-pinning ScrollTrigger maps scroll
 * progress → the active metric index, snapping to each segment. The giant
 * figure is a gsap-owned count-up (React renders the span EMPTY), framed
 * by a concentric arc gauge whose amber arc *draws* to the metric's
 * proportion. The index is clickable and scrolls to that segment.
 *
 * Reduced motion: no scrub, no draw — the section shows a settled
 * end-state and the index stays clickable (instant swap).
 */
export function MetricsSection() {
  const [index, setIndex] = useState(0);
  const { theme } = useTheme();
  const { BONE, STEEL } = theme === "day" ? DAY_PALETTE : NIGHT_PALETTE;

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const ghostRef = useRef<HTMLSpanElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);

  // Keep the latest index in a ref so the ScrollTrigger callback can read
  // it without re-creating the trigger on every change.
  const indexRef = useRef(0);
  indexRef.current = index;

  const metric = METRICS[index];

  // --- Scroll driver: map scroll progress → active index (sticky, no pin).
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let cancelled = false;
    let ctx: ReturnType<typeof gsap.context> | null = null;
    let autoId = 0;

    const boot = async () => {
      await registerAll();
      if (cancelled || !sectionRef.current) return;
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const n = METRICS.length;

      ctx = gsap.context(() => {
        if (reduced) {
          // Settled end-state; index stays interactive via clicks.
          gsap.set("[data-reveal]", { opacity: 1, y: 0 });
          return;
        }

        // Intro reveal of the kicker + editorial column when the stage
        // settles into view (once, no pin).
        gsap.from("[data-reveal]", {
          opacity: 0,
          y: 26,
          duration: 0.9,
          stagger: 0.12,
          ease: "power3.out",
          scrollTrigger: { trigger: stageRef.current!, start: "top 78%", once: true },
        });

        // The non-pin scroll driver. As the tall section travels through
        // the sticky stage, progress 0→1 selects metric 0→n-1.
        ScrollTrigger.create({
          trigger: sectionRef.current!,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
          // Snap to each metric's segment center so figures settle cleanly.
          snap: {
            snapTo: (v) => Math.round(v * (n - 1)) / (n - 1),
            duration: 0.35,
            ease: "power2.out",
          },
          onUpdate: (self) => {
            const i = gsap.utils.clamp(0, n - 1, Math.round(self.progress * (n - 1)));
            if (i !== indexRef.current) setIndex(i);
          },
        });
      }, sectionRef.current!);

      // Gentle auto-advance ONLY when the stage is parked in view and the
      // user isn't actively scrubbing (keeps it alive on tall desktops where
      // the snap holds a segment). Paused under reduced motion.
      if (!reduced && typeof IntersectionObserver !== "undefined") {
        const io = new IntersectionObserver(
          ([e]) => {
            window.clearInterval(autoId);
            if (e.isIntersecting && e.intersectionRatio > 0.85) {
              autoId = window.setInterval(() => {
                // only advance when the page is essentially still
                setIndex((i) => (i + 1) % n);
              }, 4200);
            }
          },
          { threshold: [0, 0.85, 1] }
        );
        io.observe(stageRef.current ?? sectionRef.current!);
        ctx?.add(() => io.disconnect());
      }
    };
    void boot();
    return () => {
      cancelled = true;
      window.clearInterval(autoId);
      ctx?.revert();
    };
  }, []);

  // --- Per-index choreography: count-up (React-empty span, gsap-owned),
  // arc draw, ghost figure crossfade, marker slide.
  useEffect(() => {
    let cancelled = false;
    let tl: gsap.core.Timeline | null = null;
    const boot = async () => {
      await registerAll();
      if (cancelled) return;
      const el = numRef.current;
      const arc = arcRef.current;
      const ghost = ghostRef.current;
      const marker = markerRef.current;
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const targetOffset = CIRC * (1 - metric.fill);

      if (reduced) {
        if (el) el.textContent = `${metric.value}${metric.suffix}`;
        if (arc) gsap.set(arc, { strokeDasharray: CIRC, strokeDashoffset: targetOffset });
        if (marker) gsap.set(marker, { y: index * 100 + "%", opacity: 1 });
        if (ghost) gsap.set(ghost, { opacity: 0 });
        return;
      }

      tl = gsap.timeline();

      // Count-up on the React-empty figure span.
      if (el) {
        const obj = { v: 0 };
        tl.to(
          obj,
          {
            v: metric.value,
            duration: 1.05,
            ease: "power2.out",
            onUpdate: () => {
              el.textContent = `${Math.round(obj.v)}${metric.suffix}`;
            },
          },
          0
        );
      }

      // Ghost figure: the previous value lingers and falls away as a
      // motion echo behind the live count.
      if (ghost) {
        tl.fromTo(
          ghost,
          { opacity: 0.18, yPercent: 0, scale: 1 },
          { opacity: 0, yPercent: -14, scale: 1.06, duration: 0.9, ease: "power2.out" },
          0
        );
      }

      // Arc DRAWS to the metric proportion.
      if (arc) {
        gsap.set(arc, { strokeDasharray: CIRC });
        tl.fromTo(
          arc,
          { strokeDashoffset: CIRC },
          { strokeDashoffset: targetOffset, duration: 1.15, ease: "power2.inOut" },
          0
        );
      }

      // Index marker slides to the active row.
      if (marker) {
        tl.to(marker, { y: index * 100 + "%", duration: 0.55, ease: "power3.out" }, 0);
      }
    };
    void boot();
    return () => {
      cancelled = true;
      tl?.kill();
    };
  }, [index, metric.value, metric.suffix, metric.fill]);

  // Click an index row → scroll to its segment (drives the same store of
  // truth as the scroll driver). Falls back to instant select if reduced.
  const goTo = (i: number) => {
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const section = sectionRef.current;
    if (reduced || !section) {
      setIndex(i);
      return;
    }
    const n = METRICS.length;
    const rect = section.getBoundingClientRect();
    const top = window.scrollY + rect.top;
    const travel = section.offsetHeight - window.innerHeight;
    const target = top + (travel * i) / (n - 1);
    window.scrollTo({ top: target, behavior: "smooth" });
  };

  return (
    <section
      id="metrics"
      ref={sectionRef}
      aria-labelledby="metrics-title"
      className="relative w-full min-h-[260vh]"
      style={{ color: BONE }}
    >
      {/* Sticky stage — CSS-pinned while the tall section scrolls past it.
          NO GSAP pin. overflow-hidden contained here. */}
      <div
        ref={stageRef}
        className="sticky top-0 flex h-[100svh] w-full items-center overflow-hidden px-[clamp(16px,5vw,96px)] py-[clamp(32px,5vh,96px)]"
        style={{ transform: "translateZ(0)" }}
      >
        {/* local atmosphere */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
          <div
            className="absolute right-[2%] top-[10%] h-[52vh] w-[52vh] rounded-full opacity-[0.12] blur-[130px]"
            style={{ background: AMBER }}
          />
          <div
            className="absolute left-[6%] bottom-[6%] h-[34vh] w-[34vh] rounded-full opacity-[0.06] blur-[120px]"
            style={{ background: CYAN }}
          />
          <div className="grid-bg absolute inset-0 opacity-[0.18]" />
        </div>

        <div className="relative mx-auto w-full max-w-6xl">
          {/* kicker */}
          <div
            data-reveal
            className="flex items-center justify-between border-t pt-3 font-mono text-[11px] uppercase tracking-[0.3em]"
            style={{ borderColor: `${BONE}22`, color: STEEL }}
          >
            <span className="flex items-center gap-2">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: AMBER, boxShadow: `0 0 8px ${AMBER}` }}
              />
              SYS.METRICS · UNIVERSE IN NUMBERS
            </span>
            <span className="tabular-nums" style={{ color: AMBER }}>
              {String(index + 1).padStart(2, "0")} / {String(METRICS.length).padStart(2, "0")}
            </span>
          </div>

          <div className="mt-8 grid items-center gap-10 md:mt-10 md:grid-cols-[1fr_0.82fr] md:gap-16">
            {/* Feature: arc gauge + giant figure */}
            <div className="relative mx-auto aspect-square w-full max-w-[480px]">
              <svg
                viewBox="0 0 300 300"
                className="absolute inset-0 h-full w-full -rotate-90"
                aria-hidden
              >
                <defs>
                  <linearGradient id="metrics-arc" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor={AMBER} />
                    <stop offset="1" stopColor={AMBER_HI} />
                  </linearGradient>
                </defs>

                {/* concentric guide rings */}
                {[148, R, 100, 64].map((r, i) => (
                  <circle
                    key={r}
                    cx="150"
                    cy="150"
                    r={r}
                    fill="none"
                    stroke={BONE}
                    strokeOpacity={0.07 + i * 0.012}
                    strokeWidth="0.75"
                  />
                ))}

                {/* tick ring — coords rounded to a stable precision so the
                    server- and client-rendered SVG match (no hydration drift). */}
                {Array.from({ length: TICKS }).map((_, i) => {
                  const a = (i / TICKS) * Math.PI * 2;
                  const inner = 116;
                  const outer = i % 5 === 0 ? 126 : 122;
                  const r3 = (n: number) => Math.round(n * 1000) / 1000;
                  return (
                    <line
                      key={i}
                      x1={r3(150 + Math.cos(a) * inner)}
                      y1={r3(150 + Math.sin(a) * inner)}
                      x2={r3(150 + Math.cos(a) * outer)}
                      y2={r3(150 + Math.sin(a) * outer)}
                      stroke={BONE}
                      strokeOpacity={i % 5 === 0 ? 0.22 : 0.1}
                      strokeWidth={i % 5 === 0 ? 1 : 0.6}
                    />
                  );
                })}

                {/* faint full track under the active arc */}
                <circle
                  cx="150"
                  cy="150"
                  r={R}
                  fill="none"
                  stroke={BONE}
                  strokeOpacity="0.07"
                  strokeWidth="3"
                />

                {/* the DRAWING arc */}
                <circle
                  ref={arcRef}
                  cx="150"
                  cy="150"
                  r={R}
                  fill="none"
                  stroke="url(#metrics-arc)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{ filter: `drop-shadow(0 0 9px ${AMBER}aa)` }}
                />
              </svg>

              {/* center readout */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <div className="relative leading-none">
                  {/* ghost / motion echo (decorative, gsap-owned opacity) */}
                  <span
                    ref={ghostRef}
                    aria-hidden
                    className="font-grotesk tabular-nums leading-none absolute inset-0 flex items-center justify-center"
                    style={{
                      fontWeight: 800,
                      fontSize: "clamp(5rem,15vw,11rem)",
                      color: AMBER,
                      opacity: 0,
                    }}
                  >
                    {metric.value}
                    {metric.suffix}
                  </span>
                  {/* LIVE count-up — React renders this EMPTY; gsap owns it. */}
                  <span
                    ref={numRef}
                    className="font-grotesk tabular-nums leading-none block"
                    style={{
                      fontWeight: 800,
                      fontSize: "clamp(5rem,15vw,11rem)",
                      color: BONE,
                    }}
                  />
                </div>
                <span
                  key={`unit-${index}`}
                  className="mt-3 font-mono text-[10px] uppercase tracking-[0.32em]"
                  style={{ color: STEEL }}
                >
                  {metric.unit}
                </span>
                <span
                  key={`lbl-${index}`}
                  className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.3em]"
                  style={{ color: AMBER }}
                >
                  {metric.label}
                </span>
              </div>
            </div>

            {/* Index + editorial copy */}
            <div data-reveal>
              <h2
                id="metrics-title"
                className="font-grotesk leading-[0.88] tracking-[-0.025em]"
                style={{ fontWeight: 800, fontSize: "clamp(2.1rem,4.4vw,3.4rem)" }}
              >
                Universe
                <br />
                <span className="font-serif font-normal italic" style={{ color: STEEL }}>
                  in&nbsp;Numbers
                </span>
              </h2>

              <p
                key={`desc-${index}`}
                className="mt-5 max-w-sm font-serif text-[clamp(1.05rem,1.7vw,1.35rem)] italic leading-snug"
                style={{ color: `${BONE}cc` }}
              >
                {metric.desc}
              </p>

              {/* Clickable index with a sliding active marker. */}
              <ul className="relative mt-8" role="list">
                {/* sliding marker (gsap-owned y position) */}
                <div
                  ref={markerRef}
                  aria-hidden
                  className="pointer-events-none absolute left-0 top-0 w-full"
                  style={{ height: `${100 / METRICS.length}%` }}
                >
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `linear-gradient(90deg, ${AMBER}1c, transparent 70%)`,
                      borderLeft: `2px solid ${AMBER}`,
                    }}
                  />
                </div>

                {METRICS.map((m, i) => {
                  const on = i === index;
                  return (
                    <li key={m.label}>
                      <button
                        type="button"
                        onClick={() => goTo(i)}
                        aria-current={on ? "true" : undefined}
                        className="group relative flex w-full items-baseline gap-4 border-b py-3.5 pl-3 text-left transition-colors"
                        style={{ borderColor: `${BONE}14` }}
                      >
                        <span
                          className="font-mono text-[11px] tabular-nums transition-colors"
                          style={{ color: on ? AMBER : STEEL }}
                        >
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className="flex-1 font-mono text-[12px] uppercase tracking-[0.18em] transition-colors group-hover:text-[var(--bone)]"
                          style={{
                            color: on ? BONE : STEEL,
                            ["--bone" as string]: BONE,
                          }}
                        >
                          {m.label}
                        </span>
                        <span
                          className="font-grotesk text-lg tabular-nums transition-colors"
                          style={{ fontWeight: 700, color: on ? AMBER : `${BONE}55` }}
                        >
                          {m.value}
                          {m.suffix}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>

              {/* scroll affordance */}
              <div
                className="mt-7 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.28em]"
                style={{ color: `${STEEL}aa` }}
              >
                <span
                  aria-hidden
                  className="inline-block h-px w-8"
                  style={{ background: `${BONE}33` }}
                />
                scroll to advance · click to jump
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MetricsSection;
