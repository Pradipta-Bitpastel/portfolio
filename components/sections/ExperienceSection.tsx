"use client";

import { memo, useRef } from "react";
import type * as THREE from "three";
import { useGSAP } from "@gsap/react";
import { gsap, registerAll, ScrollTrigger } from "@/lib/gsap";
import { sceneStore } from "@/lib/sceneStore";
import { experience } from "@/content/experience";
import { SectionFrame } from "@/components/ui/SectionFrame";
import { KineticTitle } from "@/components/ui/KineticTitle";

/**
 * Experience — "SYS.TIMELINE // 05".
 *
 * The left rail is a full-height animated SVG timeline:
 *   - a faint dashed base line (always visible)
 *   - a bright amber progress fill whose height tracks scroll via a
 *     scrub ScrollTrigger
 *   - a glowing "scan pulse" dot that rides the progress front,
 *     leaving a brief trail
 *   - a hex node at each entry's y-position that snaps bright + pulses
 *     when the scan crosses it
 *
 * Each entry is a card with corner brackets that draw in as SVG
 * stroke-dashoffset tweens, a horizontal laser sweep that wipes across
 * before content fades in, a role title that slides from behind a
 * mask, and bullets that reveal with a scanning gradient mask. All
 * entry-local animations are scrubbed off the entry's OWN bounding box
 * so staggered scrolling reads as individually-triggered events.
 *
 * No external GSAP Club plugins required — draw effects use
 * stroke-dasharray math, text wipes use CSS clip-path + mask-image.
 */

function ExperienceSectionImpl() {
  const rootRef = useRef<HTMLElement>(null);
  const railRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const scanRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;
      let cancelled = false;

      const boot = async () => {
        await registerAll();
        if (cancelled) return;

        const root = rootRef.current!;

        /* ---------- 3D timeline ring fade (unchanged contract) ---- */
        const ring = sceneStore.timelineRing.ref;
        if (ring) {
          ring.visible = true;

          const torus = ring.children.find(
            (c) =>
              (c as THREE.Mesh).isMesh &&
              (c as THREE.Mesh).geometry.type === "TorusGeometry"
          ) as THREE.Mesh | undefined;
          const nodes = ring.children.filter(
            (c) =>
              (c as THREE.Mesh).isMesh &&
              (c as THREE.Mesh).geometry.type === "SphereGeometry"
          ) as THREE.Mesh[];
          const torusMat = torus?.material as
            | (THREE.Material & { opacity?: number })
            | undefined;

          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: root,
              start: "top bottom",
              end: "top 30%",
              scrub: 1,
              onLeaveBack: () => {
                if (ring) ring.visible = false;
              },
              onEnter: () => {
                if (ring) ring.visible = true;
              }
            }
          });
          if (torusMat && "opacity" in torusMat) {
            tl.fromTo(
              torusMat,
              { opacity: 0 },
              { opacity: 0.9, ease: "none" },
              0
            );
          }
          nodes.forEach((node, i) => {
            const mat = node.material as
              | (THREE.Material & { opacity?: number })
              | undefined;
            if (mat && "opacity" in mat) {
              tl.fromTo(
                mat,
                { opacity: 0 },
                { opacity: 1, ease: "none" },
                0 + i * 0.05
              );
            }
          });
        }

        /* ---------- Rail progress fill + scan pulse (scrubbed) ---- */
        const rail = railRef.current;
        const progress = progressRef.current;
        const scan = scanRef.current;
        const listEl = root.querySelector<HTMLDivElement>(".exp-list");

        if (rail && progress && scan && listEl) {
          // Seed initial state.
          gsap.set(progress, { scaleY: 0, transformOrigin: "top center" });
          gsap.set(scan, { y: 0, opacity: 0 });

          gsap.timeline({
            scrollTrigger: {
              trigger: listEl,
              start: "top 70%",
              end: "bottom 40%",
              scrub: 1,
              onEnter: () => gsap.to(scan, { opacity: 1, duration: 0.3 }),
              onLeaveBack: () => gsap.to(scan, { opacity: 0, duration: 0.3 }),
              onLeave: () => gsap.to(scan, { opacity: 0, duration: 0.3 }),
              onEnterBack: () => gsap.to(scan, { opacity: 1, duration: 0.3 })
            }
          })
            .to(progress, { scaleY: 1, ease: "none" }, 0)
            .to(
              scan,
              {
                y: () => listEl.getBoundingClientRect().height - 8,
                ease: "none"
              },
              0
            );
        }

        /* ---------- Per-entry: node activation + card reveal ----- */
        const entries = root.querySelectorAll<HTMLElement>(".exp-entry");

        entries.forEach((entry) => {
          const node = entry.querySelector<HTMLElement>(".exp-node");
          const nodeFill = entry.querySelector<HTMLElement>(".exp-node-fill");
          const nodeRing = entry.querySelector<HTMLElement>(".exp-node-ring");
          const branch = entry.querySelector<HTMLElement>(".exp-branch");
          const bracketPaths = entry.querySelectorAll<SVGPathElement>(
            ".exp-bracket-path"
          );
          const sweep = entry.querySelector<HTMLElement>(".exp-sweep");
          const period = entry.querySelector<HTMLElement>(".exp-period");
          const title = entry.querySelector<HTMLElement>(".exp-title");
          const bullets = entry.querySelectorAll<HTMLElement>(".exp-bullet");

          // Seed corner-bracket stroke-dash so they "draw" in.
          bracketPaths.forEach((p) => {
            const len = p.getTotalLength?.() ?? 40;
            p.style.strokeDasharray = `${len}`;
            p.style.strokeDashoffset = `${len}`;
          });

          // Node: pulse when entry hits the activation line (top 65%).
          if (node && nodeFill && nodeRing) {
            gsap.set(nodeFill, { scale: 0, transformOrigin: "center" });
            gsap.set(nodeRing, { scale: 1, opacity: 0 });
            ScrollTrigger_onEnter(entry, "top 65%", () => {
              gsap.to(nodeFill, {
                scale: 1,
                duration: 0.35,
                ease: "back.out(2.2)"
              });
              gsap.fromTo(
                nodeRing,
                { scale: 1, opacity: 0.9 },
                { scale: 2.4, opacity: 0, duration: 0.7, ease: "power2.out" }
              );
              gsap.to(node, {
                rotation: "+=60",
                duration: 0.6,
                ease: "power2.out"
              });
            });
          }

          // Branch connector from rail to card — grows from 0 to full.
          if (branch) {
            gsap.set(branch, { scaleX: 0, transformOrigin: "left center" });
            ScrollTrigger_onEnter(entry, "top 65%", () => {
              gsap.to(branch, {
                scaleX: 1,
                duration: 0.45,
                ease: "power2.out"
              });
            });
          }

          // Corner brackets draw in with stagger.
          if (bracketPaths.length > 0) {
            ScrollTrigger_onEnter(entry, "top 72%", () => {
              gsap.to(bracketPaths, {
                strokeDashoffset: 0,
                duration: 0.55,
                stagger: 0.06,
                ease: "power2.out"
              });
            });
          }

          // Laser sweep — a bright amber line moves top→bottom across
          // the card, leaving content visible behind it.
          if (sweep) {
            gsap.set(sweep, { yPercent: -100, opacity: 0 });
            ScrollTrigger_onEnter(entry, "top 70%", () => {
              gsap
                .timeline()
                .to(sweep, {
                  opacity: 1,
                  duration: 0.08,
                  ease: "power2.out"
                })
                .to(
                  sweep,
                  {
                    yPercent: 120,
                    duration: 0.7,
                    ease: "power2.inOut"
                  },
                  0
                )
                .to(sweep, { opacity: 0, duration: 0.2 }, ">-0.15");
            });
          }

          // Period + title + bullets reveal — each uses a different
          // technique so the cascade feels composed, not uniform.
          if (period) {
            gsap.set(period, {
              opacity: 0,
              y: 6,
              filter: "blur(6px)"
            });
            ScrollTrigger_onEnter(entry, "top 72%", () => {
              gsap.to(period, {
                opacity: 1,
                y: 0,
                filter: "blur(0px)",
                duration: 0.5,
                ease: "power2.out",
                delay: 0.15
              });
            });
          }

          if (title) {
            gsap.set(title, { clipPath: "inset(0 100% 0 0)" });
            ScrollTrigger_onEnter(entry, "top 72%", () => {
              gsap.to(title, {
                clipPath: "inset(0 0% 0 0)",
                duration: 0.9,
                ease: "power3.out",
                delay: 0.2
              });
            });
          }

          if (bullets.length > 0) {
            gsap.set(bullets, {
              opacity: 0,
              x: -14,
              clipPath: "inset(0 100% 0 0)"
            });
            ScrollTrigger_onEnter(entry, "top 70%", () => {
              gsap.to(bullets, {
                opacity: 1,
                x: 0,
                clipPath: "inset(0 0% 0 0)",
                duration: 0.55,
                stagger: 0.09,
                ease: "power2.out",
                delay: 0.35
              });
            });
          }
        });
      };

      void boot();

      return () => {
        cancelled = true;
        const ring = sceneStore.timelineRing.ref;
        if (ring) ring.visible = false;
      };
    },
    { scope: rootRef, dependencies: [] }
  );

  return (
    <SectionFrame
      id="experience"
      ref={rootRef}
      ariaLabelledBy="experience-heading"
      bare
      style={{ minHeight: "150svh" }}
    >
      {/* Giant "05" top-right, amber */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[clamp(48px,6vw,96px)] top-[clamp(64px,8vh,140px)] z-0 hidden select-none font-mono font-bold leading-none opacity-[0.95] md:block"
        style={{
          color: "#FF7A1A",
          letterSpacing: "-0.02em",
          fontSize: "clamp(6rem,12vw,14rem)"
        }}
      >
        05
      </div>

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-l from-[#0b0f19] via-[#0b0f19]/60 to-transparent md:block"
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-12 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim">
          <span className="text-[#FF7A1A]">SYS.TIMELINE // 05</span>
          <span className="opacity-40">—</span>
          <span>SHORT HISTORY OF SHIPPING</span>
        </div>
        <KineticTitle
          id="experience-heading"
          text="CAREER"
          subtitle=".LOG"
          triggerId="experience"
          className="mb-14"
          titleClassName="text-5xl md:text-7xl"
        />

        {/* ───────── Timeline ───────── */}
        <div className="relative max-w-[46rem]">
          {/* Rail — full-height animated SVG progress bar on the left. */}
          <div
            ref={railRef}
            aria-hidden
            className="pointer-events-none absolute bottom-2 left-0 top-2 w-[22px]"
          >
            {/* Dashed base line — faint, always visible */}
            <div
              className="absolute left-[10px] top-0 h-full w-px"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(180deg, rgba(255,122,26,0.35) 0 4px, transparent 4px 10px)"
              }}
            />
            {/* Bright amber progress fill — scaleY from 0 to 1. The
                gradient makes the head of the fill a hot bloom. */}
            <div
              ref={progressRef}
              className="absolute left-[9px] top-0 h-full w-[3px]"
              style={{
                backgroundImage:
                  "linear-gradient(180deg, rgba(255,213,150,0.0) 0%, rgba(255,122,26,0.95) 40%, #FF7A1A 100%)",
                boxShadow: "0 0 8px rgba(255,122,26,0.75)",
                borderRadius: "2px"
              }}
            />
            {/* Scan pulse — rides the progress front. */}
            <div
              ref={scanRef}
              className="absolute left-[4px] top-0 h-[14px] w-[14px]"
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, rgba(255,213,150,1) 0%, rgba(255,122,26,0.7) 40%, rgba(255,122,26,0) 75%)",
                  filter: "drop-shadow(0 0 10px rgba(255,122,26,0.95))"
                }}
              />
              <div
                className="absolute inset-[4px] rounded-full"
                style={{
                  background: "#FFE0BD",
                  boxShadow:
                    "0 0 6px #FFD7A8, 0 0 14px rgba(255,122,26,0.95)"
                }}
              />
            </div>
            {/* Top cap — a small bracket so the rail reads as a tool,
                not just a line. */}
            <svg
              className="absolute -top-[2px] left-0"
              width="22"
              height="10"
              viewBox="0 0 22 10"
              fill="none"
            >
              <path
                d="M0 1 L10 1 L10 9 M22 1 L13 1 L13 9"
                stroke="rgba(255,122,26,0.7)"
                strokeWidth="1"
              />
            </svg>
            {/* Bottom cap */}
            <svg
              className="absolute -bottom-[2px] left-0"
              width="22"
              height="10"
              viewBox="0 0 22 10"
              fill="none"
            >
              <path
                d="M0 9 L10 9 L10 1 M22 9 L13 9 L13 1"
                stroke="rgba(255,122,26,0.7)"
                strokeWidth="1"
              />
            </svg>
          </div>

          {/* Entries — pl shrinks on narrow viewports so the card body
              has breathing room on 375/414px. Rail still sits at the
              left edge of the section. */}
          <ul className="exp-list flex flex-col gap-14 pl-[44px] sm:pl-[70px]">
            {experience.map((e, i) => (
              <li
                key={e.company}
                className="exp-entry group relative"
              >
                {/* Branch connector — short horizontal amber line that
                    grows from rail to the card's left edge. */}
                <div
                  className="exp-branch pointer-events-none absolute left-[-60px] top-[30px] h-px w-[56px]"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(255,122,26,0.0) 0%, rgba(255,122,26,0.85) 25%, rgba(255,122,26,0.85) 100%)",
                    boxShadow: "0 0 6px rgba(255,122,26,0.5)"
                  }}
                />

                {/* Hex node — perched on the rail at the branch join */}
                <div
                  className="exp-node pointer-events-none absolute left-[-69px] top-[22px] h-[18px] w-[18px]"
                >
                  <svg
                    viewBox="-1.2 -1.2 2.4 2.4"
                    className="h-full w-full overflow-visible"
                  >
                    {/* Outer ring — pulses out at activation */}
                    <polygon
                      className="exp-node-ring"
                      points="0,-1 0.866,-0.5 0.866,0.5 0,1 -0.866,0.5 -0.866,-0.5"
                      fill="none"
                      stroke="#FF7A1A"
                      strokeWidth={0.12}
                      style={{
                        filter: "drop-shadow(0 0 4px rgba(255,122,26,1))"
                      }}
                    />
                    {/* Base hex — faint outline */}
                    <polygon
                      points="0,-1 0.866,-0.5 0.866,0.5 0,1 -0.866,0.5 -0.866,-0.5"
                      fill="#0b0f19"
                      stroke="rgba(255,122,26,0.55)"
                      strokeWidth={0.08}
                    />
                    {/* Filled hex — scales up when active */}
                    <polygon
                      className="exp-node-fill"
                      points="0,-0.72 0.62,-0.36 0.62,0.36 0,0.72 -0.62,0.36 -0.62,-0.36"
                      fill="#FF7A1A"
                      style={{
                        filter: "drop-shadow(0 0 6px rgba(255,122,26,1))"
                      }}
                    />
                  </svg>
                </div>

                {/* Card body — corner brackets + sweep + content */}
                <div
                  className="relative overflow-hidden rounded-sm border border-[#FF7A1A]/10 bg-[#0b0f19]/35 px-7 pb-8 pt-6 backdrop-blur-[2px] transition-colors duration-300 group-hover:border-[#FF7A1A]/40"
                >
                  {/* Corner brackets */}
                  <svg
                    aria-hidden
                    className="pointer-events-none absolute inset-0 h-full w-full"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 100"
                  >
                    {/* Top-left */}
                    <path
                      className="exp-bracket-path"
                      d="M 0 10 L 0 0 L 10 0"
                      vectorEffect="non-scaling-stroke"
                      stroke="#FF7A1A"
                      strokeWidth="1.4"
                      fill="none"
                      style={{
                        filter:
                          "drop-shadow(0 0 3px rgba(255,122,26,0.8))"
                      }}
                    />
                    {/* Top-right */}
                    <path
                      className="exp-bracket-path"
                      d="M 90 0 L 100 0 L 100 10"
                      vectorEffect="non-scaling-stroke"
                      stroke="#FF7A1A"
                      strokeWidth="1.4"
                      fill="none"
                      style={{
                        filter:
                          "drop-shadow(0 0 3px rgba(255,122,26,0.8))"
                      }}
                    />
                    {/* Bottom-right */}
                    <path
                      className="exp-bracket-path"
                      d="M 100 90 L 100 100 L 90 100"
                      vectorEffect="non-scaling-stroke"
                      stroke="#FF7A1A"
                      strokeWidth="1.4"
                      fill="none"
                      style={{
                        filter:
                          "drop-shadow(0 0 3px rgba(255,122,26,0.8))"
                      }}
                    />
                    {/* Bottom-left */}
                    <path
                      className="exp-bracket-path"
                      d="M 10 100 L 0 100 L 0 90"
                      vectorEffect="non-scaling-stroke"
                      stroke="#FF7A1A"
                      strokeWidth="1.4"
                      fill="none"
                      style={{
                        filter:
                          "drop-shadow(0 0 3px rgba(255,122,26,0.8))"
                      }}
                    />
                  </svg>

                  {/* Laser sweep — amber gradient bar that wipes top→bottom once */}
                  <div
                    aria-hidden
                    className="exp-sweep pointer-events-none absolute inset-x-0 h-[40%]"
                    style={{
                      top: 0,
                      background:
                        "linear-gradient(180deg, rgba(255,122,26,0) 0%, rgba(255,122,26,0.12) 50%, rgba(255,213,150,0.35) 95%, rgba(255,255,255,0.9) 100%)",
                      mixBlendMode: "screen"
                    }}
                  />

                  {/* Meta row: period + index */}
                  <div className="flex items-baseline justify-between gap-4">
                    <div
                      className="exp-period flex min-w-0 flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-[#FF7A1A] sm:tracking-[0.32em]"
                    >
                      {i === 0 && (
                        <span
                          aria-hidden
                          className="inline-block h-[6px] w-[6px] rounded-full bg-[#FF7A1A]"
                          style={{
                            boxShadow: "0 0 8px #FF7A1A",
                            animation: "pulse-glow 1.8s ease-in-out infinite"
                          }}
                        />
                      )}
                      <span>{e.period}</span>
                      {i === 0 && (
                        <span className="text-[9px] opacity-70">{"// ACTIVE"}</span>
                      )}
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim/70">
                      {String(i + 1).padStart(2, "0")} /{" "}
                      {String(experience.length).padStart(2, "0")}
                    </span>
                  </div>

                  {/* Title — clip-path wipe reveals the whole heading. */}
                  <h3
                    className="exp-title mt-3 font-display text-2xl leading-tight tracking-[-0.02em] text-ink md:text-3xl"
                    style={{ fontWeight: 700 }}
                  >
                    {e.role}
                    <span className="text-ink-dim"> · {e.company}</span>
                  </h3>

                  {/* Bullets — each wipes in left→right behind a clip-path */}
                  <ul className="mt-5 space-y-2.5">
                    {e.highlights.map((h, bi) => (
                      <li
                        key={h}
                        className="exp-bullet flex min-w-0 gap-3 font-mono text-[12px] leading-relaxed text-ink-dim"
                      >
                        <span className="mt-1 shrink-0 font-mono text-[10px] text-[#FF7A1A]/85">
                          {String(bi + 1).padStart(2, "0")}
                        </span>
                        <span
                          aria-hidden
                          className="mt-[7px] h-px w-3 shrink-0 bg-[#FF7A1A]/60"
                        />
                        <span className="min-w-0 flex-1 break-words">{h}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionFrame>
  );
}

/**
 * Helper: one-shot ScrollTrigger firing at a given start position.
 * Lives here because we use it many times and it would pollute the
 * component body otherwise.
 */
function ScrollTrigger_onEnter(
  trigger: Element,
  start: string,
  cb: () => void
) {
  let fired = false;
  ScrollTrigger.create({
    trigger,
    start,
    onEnter: () => {
      if (fired) return;
      fired = true;
      cb();
    }
  });
}

export const ExperienceSection = memo(ExperienceSectionImpl);
export default ExperienceSection;
