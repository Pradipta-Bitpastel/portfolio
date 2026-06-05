"use client";

import { useEffect, useRef } from "react";
import { gsap, registerAll, SplitText } from "@/lib/gsap";
import { SectionFrame } from "@/components/ui/SectionFrame";
import { skills, MODULE_ORDER } from "@/content/skills";

// Theme-aware tokens (flip with data-theme). BONE/STEEL now read the
// semantic CSS vars so night is identical and day stays readable.
const BONE = "var(--bone)";
const AMBER = "#ff7a1a"; // accent — reads on both themes, kept static
const STEEL = "var(--ink-faint)";

/**
 * SYS.ACTIVATION — the capability set as an editorial index. Each module
 * is an oversized, hover-expanding dossier row: a vertical accent rail
 * that fills on hover, an index numeral that snaps to the module's accent,
 * and a choreographed reveal of the tagline + skill manifest. Desktop adds
 * a pointer-driven 3D tilt; touch opens every row. No floating 3D —
 * typographic interaction carries it.
 */
export function SkillsSection() {
  const rootRef = useRef<HTMLDivElement>(null);

  // Orchestrated reveals (headline line-clip + index rows) and the
  // pointer-driven tilt. All scoped to the section and reverted on unmount.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let ctx: ReturnType<typeof gsap.context> | null = null;
    let mm: ReturnType<typeof gsap.matchMedia> | null = null;
    const splits: InstanceType<typeof SplitText>[] = [];

    const boot = async () => {
      await registerAll();
      if (cancelled || !rootRef.current) return;

      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      ctx = gsap.context(() => {
        if (reduced) {
          gsap.set(
            ["[data-reveal]", "[data-headline]", "[data-row]"],
            { opacity: 1, y: 0, yPercent: 0 }
          );
          gsap.set("[data-scan]", { scaleY: 1 });
          return;
        }

        // Kicker + meta fade in.
        gsap.from("[data-reveal]", {
          opacity: 0,
          y: 24,
          duration: 0.7,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 80%", once: true },
        });

        // Headline reveals line-by-line on a clip.
        gsap.utils.toArray<HTMLElement>("[data-headline]").forEach((el) => {
          const split = new SplitText(el, { type: "lines", linesClass: "split-line" });
          splits.push(split);
          gsap.set(split.lines, { overflow: "hidden" });
          gsap.from(split.lines, {
            yPercent: 115,
            opacity: 0,
            duration: 1,
            stagger: 0.1,
            ease: "power4.out",
            scrollTrigger: { trigger: el, start: "top 82%", once: true },
          });
        });

        // The index rows rise + clear-clip in sequence.
        gsap.utils.toArray<HTMLElement>("[data-row]").forEach((el, i) => {
          gsap.from(el, {
            opacity: 0,
            yPercent: 60,
            duration: 0.85,
            delay: i * 0.07,
            ease: "power4.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          });
        });

        // Vertical scan-line draws down the index as you scroll through it.
        gsap.fromTo(
          "[data-scan]",
          { scaleY: 0 },
          {
            scaleY: 1,
            ease: "none",
            transformOrigin: "top",
            scrollTrigger: {
              trigger: "[data-index]",
              start: "top 75%",
              end: "bottom 65%",
              scrub: 0.6,
            },
          }
        );
      }, rootRef.current);

      // Pointer-driven 3D tilt — desktop / fine-pointer only, no reduced motion.
      mm = gsap.matchMedia();
      mm.add(
        "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
        () => {
          const rows = gsap.utils.toArray<HTMLElement>("[data-tilt]");
          const cleanups: Array<() => void> = [];

          rows.forEach((row) => {
            gsap.set(row, { transformPerspective: 1100, transformStyle: "preserve-3d" });
            const qx = gsap.quickTo(row, "rotationY", { duration: 0.5, ease: "power3.out" });
            const qy = gsap.quickTo(row, "rotationX", { duration: 0.5, ease: "power3.out" });
            const glow = row.querySelector<HTMLElement>("[data-glow]");
            const qgx = glow ? gsap.quickTo(glow, "xPercent", { duration: 0.4, ease: "power3.out" }) : null;
            const qgy = glow ? gsap.quickTo(glow, "yPercent", { duration: 0.4, ease: "power3.out" }) : null;

            const onMove = (e: PointerEvent) => {
              const r = row.getBoundingClientRect();
              const px = (e.clientX - r.left) / r.width - 0.5;
              const py = (e.clientY - r.top) / r.height - 0.5;
              qx(px * 7);
              qy(-py * 5);
              qgx?.(px * 16);
              qgy?.(py * 26);
            };
            const onLeave = () => {
              qx(0);
              qy(0);
              qgx?.(0);
              qgy?.(0);
            };

            row.addEventListener("pointermove", onMove);
            row.addEventListener("pointerleave", onLeave);
            cleanups.push(() => {
              row.removeEventListener("pointermove", onMove);
              row.removeEventListener("pointerleave", onLeave);
            });
          });

          return () => cleanups.forEach((fn) => fn());
        }
      );
    };

    void boot();
    return () => {
      cancelled = true;
      ctx?.revert();
      mm?.revert();
      splits.forEach((s) => s.revert());
    };
  }, []);

  return (
    <SectionFrame id="skills" ariaLabelledBy="skills-title" bare className="py-[clamp(80px,12vh,160px)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div className="absolute left-[6%] bottom-[8%] h-[46vh] w-[46vh] rounded-full opacity-[0.10] blur-[130px]" style={{ background: AMBER }} />
        <div className="absolute right-[10%] top-[14%] h-[34vh] w-[34vh] rounded-full opacity-[0.07] blur-[140px]" style={{ background: "#9b5cff" }} />
        <div className="grid-bg absolute inset-0 opacity-[0.2]" />
      </div>

      <div ref={rootRef} className="relative mx-auto w-full max-w-6xl px-[clamp(16px,5vw,40px)]" style={{ color: BONE }}>
        {/* kicker */}
        <div data-reveal className="flex items-center justify-between border-t pt-3 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ borderColor: "var(--line-strong)", color: STEEL }}>
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: AMBER, boxShadow: `0 0 8px ${AMBER}` }} />
            SYS.ACTIVATION · CAPABILITY INDEX
          </span>
          <span style={{ color: AMBER }}>03 / 06</span>
        </div>

        {/* headline + context */}
        <div className="mt-8 grid items-end gap-8 md:grid-cols-[1.4fr_0.6fr]">
          <h2 id="skills-title" data-headline className="font-grotesk leading-[0.82] tracking-[-0.03em]" style={{ fontWeight: 800, fontSize: "clamp(2.6rem,8.4vw,6.8rem)" }}>
            Five modules.<br />
            <span style={{ color: STEEL }}>One runtime.</span>
          </h2>
          <p data-reveal className="max-w-xs font-serif text-[clamp(1rem,1.6vw,1.3rem)] italic leading-snug md:pb-3" style={{ color: "var(--ink-dim)" }}>
            Hover a layer to open its manifest — the full surface I ship across.
          </p>
        </div>

        {/* Index */}
        <div data-index className="relative mt-14 border-t" style={{ borderColor: "var(--line-strong)" }}>
          {/* scroll-driven scan line down the left edge */}
          <span
            data-scan
            aria-hidden
            className="pointer-events-none absolute left-0 top-0 hidden w-px md:block"
            style={{
              height: "100%",
              transformOrigin: "top",
              background: `linear-gradient(color-mix(in srgb, var(--bone) 33%, transparent), ${AMBER}aa, color-mix(in srgb, var(--bone) 0%, transparent))`,
            }}
          />

          {MODULE_ORDER.map((id, i) => {
            const m = skills[id];
            return (
              <div
                key={id}
                data-row
                className="group/row relative border-b [perspective:1100px]"
                style={{ borderColor: "var(--line)" }}
              >
                {/* vertical accent rail — grows from the index gutter on hover */}
                <span
                  aria-hidden
                  className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 transition-transform duration-500 ease-out group-hover/row:scale-y-100 max-md:scale-y-100"
                  style={{ background: m.accent, boxShadow: `0 0 16px ${m.accent}` }}
                />

                <div data-tilt className="relative [transform-style:preserve-3d] [will-change:transform]">
                  {/* hover wash + cursor-tracking glow */}
                  <span
                    aria-hidden
                    className="absolute inset-0 origin-left scale-x-0 transition-transform duration-[600ms] ease-out group-hover/row:scale-x-100"
                    style={{ background: `linear-gradient(90deg, ${m.accent}14, transparent 65%)` }}
                  />
                  <span
                    data-glow
                    aria-hidden
                    className="pointer-events-none absolute left-[18%] top-1/2 h-[140%] w-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 blur-[70px] transition-opacity duration-500 group-hover/row:opacity-60"
                    style={{ background: m.accent }}
                  />

                  <div className="relative flex items-center gap-5 py-6 pl-5 md:gap-8 md:pl-8">
                    <span
                      className="font-mono text-[12px] tabular-nums transition-all duration-300 group-hover/row:tracking-[0.2em]"
                      style={{ color: STEEL }}
                    >
                      <span className="transition-colors duration-300 group-hover/row:text-[var(--acc)]" style={{ ["--acc" as string]: m.accent }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="opacity-40"> / 05</span>
                    </span>

                    <h3
                      className="font-grotesk leading-none tracking-[-0.02em] transition-all duration-300 group-hover/row:translate-x-1"
                      style={{
                        fontWeight: 700,
                        fontSize: "clamp(1.9rem,5.4vw,4.2rem)",
                        color: BONE,
                        ["--acc" as string]: m.accent,
                      }}
                    >
                      <span className="transition-colors duration-300 group-hover/row:text-[var(--acc)]">
                        {m.label}
                      </span>
                    </h3>

                    <span className="ml-auto flex shrink-0 items-center gap-4">
                      <span className="hidden font-mono text-[11px] uppercase tracking-[0.22em] tabular-nums sm:block" style={{ color: STEEL }}>
                        {m.items.length} skills
                      </span>
                      {/* expand indicator: rotates + colors on hover */}
                      <span
                        aria-hidden
                        className="relative grid h-9 w-9 place-items-center rounded-full border transition-all duration-[400ms] group-hover/row:rotate-90 group-hover/row:border-transparent"
                        style={{ borderColor: "var(--line-strong)", ["--acc" as string]: m.accent }}
                      >
                        <span
                          className="absolute inset-0 rounded-full opacity-0 transition-opacity duration-[400ms] group-hover/row:opacity-100"
                          style={{ background: `${m.accent}1f` }}
                        />
                        <svg width="13" height="13" viewBox="0 0 13 13" className="relative transition-colors duration-300 group-hover/row:[color:var(--acc)]" style={{ color: STEEL }}>
                          <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                        </svg>
                      </span>
                    </span>
                  </div>

                  {/* Expanding detail — hover on desktop, always open on touch */}
                  <div className="grid grid-rows-[0fr] pl-5 transition-[grid-template-rows] duration-[600ms] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover/row:grid-rows-[1fr] max-md:grid-rows-[1fr] md:pl-8">
                    <div className="overflow-hidden">
                      <div className="flex flex-col gap-5 pb-7 pt-1 md:flex-row md:items-end md:justify-between md:gap-10">
                        <p className="max-w-md font-serif text-[clamp(1.1rem,1.9vw,1.5rem)] italic leading-snug" style={{ color: "var(--ink-dim)" }}>
                          <span
                            aria-hidden
                            className="mr-3 inline-block h-[1px] w-8 translate-y-[-0.3em] align-middle"
                            style={{ background: m.accent }}
                          />
                          {m.tagline}
                        </p>
                        <ul className="flex max-w-xl flex-wrap gap-2 md:justify-end">
                          {m.items.map((item, j) => (
                            <li
                              key={item}
                              className="translate-y-1 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.1em] opacity-0 transition-all duration-500 ease-out group-hover/row:translate-y-0 group-hover/row:opacity-100 max-md:translate-y-0 max-md:opacity-100"
                              style={{
                                borderColor: "var(--line-strong)",
                                color: STEEL,
                                transitionDelay: `${120 + j * 28}ms`,
                              }}
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* footer meta */}
        <div data-reveal className="mt-8 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.26em]" style={{ color: STEEL }}>
          <span>END · 05 MODULES INDEXED</span>
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: "#39ffa5", boxShadow: "0 0 8px #39ffa5" }} />
            ALL SYSTEMS GO
          </span>
        </div>
      </div>
    </SectionFrame>
  );
}

export default SkillsSection;
