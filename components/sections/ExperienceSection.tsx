"use client";

import { useEffect, useRef } from "react";
import { gsap, registerAll } from "@/lib/gsap";
import { SectionFrame } from "@/components/ui/SectionFrame";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { useReveal } from "@/lib/useReveal";
import { experience } from "@/content/experience";
import { getSection } from "@/lib/sections";

const EXPERIENCE = getSection("experience")!;
const GREEN = EXPERIENCE.color; // #39ffa5

// Theme-aware tokens (flip with data-theme via globals.css). For alpha-blended
// surfaces/borders we mix the semantic token toward transparent so both themes
// stay readable.
const INK = "var(--ink)";
const STEEL = "var(--ink-faint)";
const BG = "var(--bg)";
const inkA = (pct: number) => `color-mix(in srgb, var(--ink) ${pct}%, transparent)`;
const steelA = (pct: number) => `color-mix(in srgb, var(--ink-faint) ${pct}%, transparent)`;

/**
 * Experience / SYS.TIMELINE — an operative deployment log.
 *
 * A vertical timeline whose spine draws itself in (DrawSVG, scrubbed to
 * scroll) past a live "playhead" while each role decrypts into a dossier
 * card on entry. The newest role reads LIVE; older roles read ARCHIVED.
 * Reduced motion shows the full spine + all cards with no motion.
 */
export function ExperienceSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const spineRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  useReveal(rootRef);

  useEffect(() => {
    const spine = spineRef.current;
    if (!spine) return;
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
          // Visible end-state: full spine, playhead hidden, every card shown.
          gsap.set(spine, { scaleY: 1 });
          if (headRef.current) gsap.set(headRef.current, { opacity: 0 });
          gsap.set("[data-entry]", { opacity: 1, x: 0, y: 0 });
          gsap.set("[data-node]", { scale: 1, opacity: 1 });
          gsap.set("[data-hl]", { opacity: 1, x: 0 });
          return;
        }

        // Timeline spine draws itself in (scaleY — transform-only, smooth),
        // scrubbed to scroll.
        gsap.fromTo(
          spine,
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            scrollTrigger: {
              trigger: rootRef.current,
              start: "top 68%",
              end: "bottom 82%",
              scrub: 0.6,
            },
          }
        );

        // A crisp glowing dot rides DOWN the spine. It's a fixed-size DOM dot
        // translated by the track's pixel height (re-measured on refresh) — no
        // SVG scaling distortion. xPercent keeps it centred while GSAP owns y.
        const track = trackRef.current;
        if (headRef.current && track) {
          gsap.set(headRef.current, { xPercent: -50 });
          gsap.fromTo(
            headRef.current,
            { y: 0 },
            {
              y: () => track.offsetHeight - 12,
              ease: "none",
              scrollTrigger: {
                trigger: rootRef.current,
                start: "top 68%",
                end: "bottom 82%",
                scrub: 0.6,
                invalidateOnRefresh: true,
              },
            }
          );
        }

        // Each role reveals: card slides + fades, node pops, highlights cascade.
        gsap.utils.toArray<HTMLElement>("[data-entry]").forEach((el) => {
          const node = el.querySelector<HTMLElement>("[data-node]");
          const hls = el.querySelectorAll<HTMLElement>("[data-hl]");
          const tl = gsap.timeline({
            scrollTrigger: { trigger: el, start: "top 80%", once: true },
          });
          tl.from(el, { opacity: 0, x: -40, y: 14, duration: 0.85, ease: "power3.out" });
          if (node) {
            tl.from(
              node,
              { scale: 0, opacity: 0, duration: 0.6, ease: "back.out(2.4)" },
              0.1
            );
          }
          if (hls.length) {
            tl.from(
              hls,
              { opacity: 0, x: -14, duration: 0.5, stagger: 0.06, ease: "power2.out" },
              0.18
            );
          }
        });
      }, rootRef.current);
    };
    void boot();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  const total = experience.length;

  return (
    <SectionFrame id="experience" ariaLabelledBy="experience-title">
      {/* Local atmosphere: green telemetry wash + baseline grid (transparent). */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div
          className="absolute left-[-6%] top-[20%] h-[46vh] w-[46vh] rounded-full opacity-[0.10] blur-[130px]"
          style={{ background: GREEN }}
        />
        <div
          className="absolute right-[4%] bottom-[10%] h-[30vh] w-[30vh] rounded-full opacity-[0.05] blur-[120px]"
          style={{ background: "#4f9cff" }}
        />
        <div className="grid-bg absolute inset-0 opacity-[0.18]" />
      </div>

      <div ref={rootRef} className="relative mx-auto w-full max-w-4xl">
        <SectionHeader
          eyebrow={EXPERIENCE.eyebrow}
          title={EXPERIENCE.title}
          subtitle={EXPERIENCE.subtitle}
          color={EXPERIENCE.color}
          index="05"
        />

        {/* Deployment-log meta strip */}
        <div
          data-reveal
          className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 border-y py-2.5 font-mono text-[10px] uppercase tracking-[0.26em]"
          style={{ borderColor: inkA(8), color: STEEL }}
        >
          <span className="flex items-center gap-2" style={{ color: GREEN }}>
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: GREEN, boxShadow: `0 0 8px ${GREEN}` }}
            />
            DEPLOY LOG
          </span>
          <span>
            ENTRIES <b style={{ color: INK, fontWeight: 600 }}>{String(total).padStart(2, "0")}</b>
          </span>
          <span className="hidden sm:inline">SORT <b style={{ color: INK, fontWeight: 600 }}>NEWEST</b></span>
          <span className="ml-auto hidden md:inline" style={{ color: steelA(60) }}>
            REF · PKJ-TL05
          </span>
        </div>

        <div className="relative mt-10 pl-12 md:pl-16">
          {/* Drawn spine + playhead — a DOM track aligned to the node centres
              (node center = 11px mobile / 27px md). No SVG scaling distortion. */}
          <div
            ref={trackRef}
            aria-hidden
            className="absolute left-[11px] top-2 bottom-2 w-[2px] -translate-x-1/2 md:left-[27px]"
          >
            {/* faint full-height track */}
            <div
              className="absolute inset-0 rounded-full"
              style={{ background: inkA(10) }}
            />
            {/* drawn spine — scaleY 0→1 from the top */}
            <div
              ref={spineRef}
              className="absolute inset-0 origin-top rounded-full"
              style={{
                background: `linear-gradient(${GREEN}, ${GREEN}88)`,
                boxShadow: `0 0 8px ${GREEN}55`,
              }}
            />
            {/* crisp glowing playhead dot */}
            <div
              ref={headRef}
              className="absolute left-1/2 top-0 h-3 w-3 rounded-full"
              style={{
                background: GREEN,
                boxShadow: `0 0 10px ${GREEN}, 0 0 22px ${GREEN}88`,
              }}
            />
          </div>

          <ol className="space-y-10 md:space-y-14">
            {experience.map((job, i) => {
              const live = i === 0;
              const idx = total - i; // newest = highest index
              return (
                <li key={job.company} data-entry className="relative">
                  {/* Timeline node: concentric ring + connector tick into the card. */}
                  <span
                    data-node
                    aria-hidden
                    className="absolute top-1.5 grid place-items-center"
                    style={{ left: "-46px", width: 18, height: 18 }}
                  >
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{
                        border: `1px solid ${live ? GREEN : inkA(20)}`,
                        background: BG,
                      }}
                    />
                    <span
                      className="absolute h-2 w-2 rounded-full"
                      style={{
                        background: live ? GREEN : `${STEEL}`,
                        boxShadow: live ? `0 0 12px ${GREEN}` : "none",
                      }}
                    />
                    {live ? (
                      <span
                        className="absolute inset-0 animate-ping rounded-full"
                        style={{ border: `1px solid ${GREEN}`, opacity: 0.5 }}
                      />
                    ) : null}
                  </span>
                  {/* hairline connector from node to card */}
                  <span
                    data-node
                    aria-hidden
                    className="absolute top-[14px] hidden h-px md:block"
                    style={{
                      left: "-36px",
                      width: 22,
                      background: `linear-gradient(90deg, ${live ? GREEN : inkA(20)}, transparent)`,
                    }}
                  />

                  {/* Dossier card */}
                  <article
                    className="group relative overflow-hidden rounded-lg border p-5 transition-colors duration-300 md:p-6"
                    style={{
                      borderColor: live ? `${GREEN}33` : inkA(7),
                      background: live
                        ? `linear-gradient(180deg, ${GREEN}0c, var(--surface))`
                        : "var(--surface)",
                    }}
                  >
                    {/* left accent rail */}
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-px"
                      style={{
                        background: `linear-gradient(${live ? GREEN : inkA(25)}, transparent)`,
                        opacity: live ? 0.9 : 0.5,
                      }}
                    />

                    {/* Top row: period chip + status tag */}
                    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
                      <span
                        className="inline-flex items-center gap-2 rounded-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.22em] tabular-nums"
                        style={{
                          borderColor: `${GREEN}3a`,
                          color: GREEN,
                          background: `${GREEN}0d`,
                        }}
                      >
                        {job.period}
                      </span>
                      <span
                        className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.24em]"
                        style={{ color: live ? GREEN : steelA(80) }}
                      >
                        <span
                          className="inline-block h-1.5 w-1.5 rounded-full"
                          style={{
                            background: live ? GREEN : STEEL,
                            boxShadow: live ? `0 0 8px ${GREEN}` : "none",
                          }}
                        />
                        {live ? "ACTIVE" : "ARCHIVED"}
                      </span>
                    </div>

                    {/* Title block */}
                    <div className="mt-4 flex items-start gap-4">
                      <span
                        aria-hidden
                        className="select-none font-grotesk tabular-nums leading-none"
                        style={{
                          color: live ? `${GREEN}77` : inkA(12),
                          fontWeight: 800,
                          fontSize: "clamp(2.2rem,6vw,3.4rem)",
                        }}
                      >
                        {String(idx).padStart(2, "0")}
                      </span>
                      <div className="min-w-0 pt-1">
                        <h3
                          className="font-display leading-[0.95] tracking-[-0.02em]"
                          style={{
                            color: INK,
                            fontWeight: 700,
                            fontSize: "clamp(1.35rem,3.4vw,2rem)",
                          }}
                        >
                          {job.role}
                        </h3>
                        <p
                          className="mt-1.5 font-mono text-[12px] uppercase tracking-[0.22em]"
                          style={{ color: STEEL }}
                        >
                          {job.company}
                        </p>
                      </div>
                    </div>

                    {/* Highlights as a structured log */}
                    <ul className="mt-5 space-y-2.5 border-t pt-4" style={{ borderColor: inkA(6) }}>
                      {job.highlights.map((h, hi) => (
                        <li
                          key={h}
                          data-hl
                          className="flex gap-3 text-[14px] leading-relaxed"
                          style={{ color: "var(--ink-dim)" }}
                        >
                          <span
                            aria-hidden
                            className="mt-0.5 font-mono text-[10px] tabular-nums tracking-[0.1em]"
                            style={{ color: live ? GREEN : `${STEEL}` }}
                          >
                            {String(hi + 1).padStart(2, "0")}
                          </span>
                          <span className="min-w-0">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </article>
                </li>
              );
            })}
          </ol>

          {/* Terminator: where the spine ends. */}
          <div
            data-reveal
            className="mt-8 flex items-center gap-3 pl-1 font-mono text-[10px] uppercase tracking-[0.26em]"
            style={{ color: steelA(60) }}
          >
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: STEEL }}
            />
            EOF · LOG STREAM
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}

export default ExperienceSection;
