"use client";

import { memo, useRef } from "react";
import * as THREE from "three";
import { useGSAP } from "@gsap/react";
import { gsap, registerAll, ScrollTrigger } from "@/lib/gsap";
import { sceneStore } from "@/lib/sceneStore";
import { projects } from "@/content/projects";
import { SectionFrame } from "@/components/ui/SectionFrame";
import { KineticTitle } from "@/components/ui/KineticTitle";
import { PROJECT_VISUALS } from "@/components/ui/ProjectVisuals";

/**
 * Projects — "SYS.EXEC // 04" — pinned scroll-scrubbed feature
 * rotator. One project at a time is "featured":
 *
 *   - LEFT pane: a large animated SVG visual unique to the project.
 *     All 5 visuals are mounted at once and crossfaded via opacity +
 *     scale as the user scrolls. Each one also rotates into view with
 *     a brief hex-mask reveal.
 *   - RIGHT pane: name, tagline, description, stack chips. Each
 *     project's info block is its own absolutely-positioned layer so
 *     they crossfade the same way.
 *   - TOP HUD: section meta + kinetic title.
 *   - BOTTOM HUD: progress bar, clickable nav dots, frame ticker.
 *
 * Scroll math: the section is pinned for (N-1) viewports of scroll —
 * one viewport per "slide". `scrub: 1` smooths the active-index drive.
 * ScrollTrigger's `progress` is the single source of truth; all
 * tweens compose off it via a scrubbed timeline.
 *
 * The previous tilted-carousel implementation is gone. This one's
 * explicitly pinned + scrub-driven, which gives a tighter link
 * between scroll distance and state than the horizontal x-slide did.
 */

function ProjectsSectionImpl() {
  const rootRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current || !stageRef.current) return;
      let cancelled = false;
      const mmHandlers: Array<() => void> = [];

      const boot = async () => {
        await registerAll();
        if (cancelled) return;

        /* ---- 3D scene: amber connection line breath (scrub) ---- */
        const connGroup = sceneStore.connections.ref;
        if (connGroup) {
          const tl = gsap.timeline({
            scrollTrigger: {
              trigger: rootRef.current,
              start: "top 60%",
              end: "top 10%",
              scrub: 1
            }
          });
          const pulseTargets: Array<
            THREE.Material & { opacity?: number }
          > = [];
          connGroup.traverse((child) => {
            const obj = child as THREE.Object3D & {
              material?:
                | (THREE.Material & { opacity?: number })
                | THREE.Material[];
            };
            const raw = obj.material;
            const mat = (Array.isArray(raw) ? raw[0] : raw) as
              | (THREE.Material & { opacity?: number })
              | undefined;
            if (mat && "opacity" in mat) {
              const isOuter =
                (mat as unknown as { blending?: THREE.Blending })
                  .blending === THREE.AdditiveBlending;
              const target = isOuter ? 0.35 : 1.0;
              tl.fromTo(
                mat,
                { opacity: 0 },
                { opacity: target, ease: "none" },
                0
              );
              pulseTargets.push(mat);
            }
          });
          if (pulseTargets.length > 0) {
            gsap.to(pulseTargets, {
              opacity: "+=0.15",
              duration: 1.4,
              ease: "sine.inOut",
              repeat: -1,
              yoyo: true,
              overwrite: false
            });
          }
        }

        /* ---- Desktop pinned rotator ---- */
        const mm = gsap.matchMedia();
        mm.add("(min-width: 1024px)", () => {
          const stage = stageRef.current!;
          const visuals = stage.querySelectorAll<HTMLElement>(".proj-visual");
          const infos = stage.querySelectorAll<HTMLElement>(".proj-info");
          const dots = dotsRef.current?.querySelectorAll<HTMLElement>(
            ".proj-dot"
          );

          if (visuals.length === 0 || infos.length === 0) return;

          // Seed initial state: only the first visual + info are visible.
          // autoAlpha = opacity + visibility, so hidden slides are truly
          // removed from compositing (no faint bleed-through behind the
          // active slide during scrub).
          visuals.forEach((v, i) => {
            gsap.set(v, {
              autoAlpha: i === 0 ? 1 : 0,
              scale: i === 0 ? 1 : 0.9,
              clipPath:
                i === 0
                  ? "polygon(0 0, 100% 0, 100% 100%, 0 100%)"
                  : "polygon(50% 50%, 50% 50%, 50% 50%, 50% 50%)"
            });
          });
          infos.forEach((inf, i) => {
            gsap.set(inf, {
              autoAlpha: i === 0 ? 1 : 0,
              x: i === 0 ? 0 : 40
            });
          });
          dots?.forEach((d, i) => {
            d.classList.toggle("is-active", i === 0);
          });
          // Seed progress bar at 0; driven via scrollTrigger.onUpdate
          // below so it tracks scroll progress 1:1 with slide position.
          if (progressRef.current) {
            gsap.set(progressRef.current, {
              scaleX: 0,
              transformOrigin: "left center"
            });
          }

          const total = projects.length;
          // Each slide gets ~2 viewports of scroll (was 1.5) so a
          // scroll gesture comfortably lands on a project instead of
          // flying through two at a time. + longer tail on the last
          // slide for a real "dwell" before un-pinning.
          const scrollDistance = (total - 1) * 200 + 100;

          // Snap points — one per slide. Progress 0 = slide 1, 0.25 =
          // slide 2, ..., 1.0 = slide 5. A big scroll flick settles
          // onto the nearest slide instead of flying past.
          const snapPoints = Array.from(
            { length: total },
            (_, i) => i / (total - 1)
          );

          const tl = gsap.timeline({
            defaults: { ease: "power2.inOut" },
            scrollTrigger: {
              trigger: rootRef.current,
              start: "top top",
              end: `+=${scrollDistance}%`,
              pin: stageRef.current,
              scrub: 1.5,
              anticipatePin: 1,
              invalidateOnRefresh: true,
              snap: {
                snapTo: snapPoints,
                duration: { min: 0.3, max: 0.7 },
                delay: 0.15,
                ease: "power2.inOut"
              },
              onUpdate: (self) => {
                // Drive the integer "activeIdx" for dot highlighting
                // + counter text. We snap to the nearest slide.
                const raw = self.progress * (total - 1);
                const idx = Math.round(raw);
                dots?.forEach((d, i) => {
                  d.classList.toggle("is-active", i === idx);
                });
                if (counterRef.current) {
                  counterRef.current.textContent = `${String(
                    idx + 1
                  ).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
                }
                // Progress bar tracks scroll 1:1 — at slide N (of M),
                // the bar reads (N-1)/(M-1). Driving it here instead
                // of via a timeline tween avoids GSAP's default 0.5s
                // duration filling the bar before the last slide.
                if (progressRef.current) {
                  gsap.set(progressRef.current, { scaleX: self.progress });
                }
              }
            }
          });

          // Build transition segments: from i to i+1.
          const seg = 1 / (total - 1);
          for (let i = 0; i < total - 1; i++) {
            const at = i * seg;
            const endAt = (i + 1) * seg;
            const mid = (at + endAt) / 2;

            // Outgoing visual: shrink + clip to a hex pinpoint + fade.
            tl.to(
              visuals[i],
              {
                autoAlpha: 0,
                scale: 0.88,
                clipPath:
                  "polygon(50% 0, 100% 50%, 50% 100%, 0 50%, 50% 50%)",
                duration: seg * 0.55
              },
              at
            );
            // Incoming visual: grow from hex pinpoint + fade in.
            tl.fromTo(
              visuals[i + 1],
              {
                autoAlpha: 0,
                scale: 0.9,
                clipPath:
                  "polygon(50% 0, 100% 50%, 50% 100%, 0 50%, 50% 50%)"
              },
              {
                autoAlpha: 1,
                scale: 1,
                clipPath:
                  "polygon(0 0, 100% 0, 100% 100%, 0 100%)",
                duration: seg * 0.6
              },
              mid - seg * 0.05
            );
            // Outgoing info slides out left.
            tl.to(
              infos[i],
              {
                autoAlpha: 0,
                x: -60,
                duration: seg * 0.45
              },
              at
            );
            // Incoming info slides in from right.
            tl.fromTo(
              infos[i + 1],
              { autoAlpha: 0, x: 60 },
              {
                autoAlpha: 1,
                x: 0,
                duration: seg * 0.5
              },
              mid
            );
          }

          // Clickable dots — jump to that slide's scroll offset.
          const stInst = tl.scrollTrigger;
          dots?.forEach((d, i) => {
            const onClick = () => {
              if (!stInst) return;
              const targetProgress = i / (total - 1);
              const startPx = stInst.start;
              const endPx = stInst.end;
              const y = startPx + (endPx - startPx) * targetProgress;
              // Lenis-smooth if present, else native.
              window.scrollTo({ top: y, behavior: "smooth" });
            };
            d.addEventListener("click", onClick);
            mmHandlers.push(() =>
              d.removeEventListener("click", onClick)
            );
          });

          return () => {
            // gsap.matchMedia cleanup also kills the timeline.
          };
        });

        /* ---- Mobile: grid fallback fade-in stagger ---- */
        mm.add("(max-width: 1023px)", () => {
          const cards = rootRef.current!.querySelectorAll<HTMLElement>(
            ".proj-mobile-card"
          );
          gsap.fromTo(
            cards,
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.7,
              stagger: 0.12,
              ease: "power2.out",
              scrollTrigger: {
                trigger: rootRef.current,
                start: "top 70%"
              }
            }
          );
        });

        try {
          ScrollTrigger.refresh();
        } catch {
          /* ignore */
        }

        mmHandlers.push(() => mm.revert());
      };

      void boot();

      return () => {
        cancelled = true;
        mmHandlers.forEach((h) => h());
      };
    },
    { scope: rootRef, dependencies: [] }
  );

  return (
    <SectionFrame
      id="projects"
      ref={rootRef}
      ariaLabelledBy="projects-heading"
      bare
      style={{ minHeight: "100vh" }}
    >
      {/* Giant "04" background */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[clamp(48px,6vw,96px)] top-[clamp(64px,8vh,140px)] z-0 hidden select-none font-mono text-[10rem] font-bold leading-none opacity-[0.08] md:block lg:text-[14rem]"
        style={{ color: "#FF7A1A", letterSpacing: "-0.02em" }}
      >
        04
      </div>

      {/* =========== Desktop: pinned rotator =========== */}
      <div
        ref={stageRef}
        className="relative hidden h-screen w-full overflow-hidden lg:block"
      >
        {/* HUD top bar */}
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-start justify-between px-12 pt-12">
          <div>
            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim">
              <span className="text-[#FF7A1A]">SYS.EXEC // 04</span>
              <span className="opacity-40">—</span>
              <span>FEATURED PROJECTS</span>
            </div>
            <KineticTitle
              id="projects-heading"
              text="EXECUTION"
              subtitle=".LAYER"
              triggerId="projects"
              className="mt-2"
              titleClassName="text-5xl md:text-6xl"
            />
          </div>
          <div
            ref={counterRef}
            className="font-display text-5xl font-extrabold leading-none tracking-[-0.02em] text-[#FF7A1A]"
            style={{
              textShadow:
                "0 0 14px rgba(255,122,26,0.65), 0 0 30px rgba(255,122,26,0.25)"
            }}
          >
            01 / {String(projects.length).padStart(2, "0")}
          </div>
        </div>

        {/* Main stage
            Layout: LEFT col-span-6 = info content; RIGHT col-span-6 =
            BIG project-specific SVG visual (~500px square). Each
            project has its own SVG diorama (NeuralNet / OrbitRings /
            Pipeline / BarStack / ModuleGrid), shown one at a time and
            hex-clip-crossfaded by the scroll timeline. The 3D laptop
            is pushed into the background in the scene pose so the
            SVG visual is the featured right-side subject. */}
        <div className="absolute inset-x-0 top-[min(200px,24vh)] bottom-[120px] flex items-center">
          <div className="mx-auto grid w-full max-w-7xl grid-cols-12 gap-10 px-12">
            {/* ───── INFO PANE (LEFT, col-span-6) ───── */}
            <div className="relative col-span-6 flex min-h-[480px] items-center">
              <div className="relative w-full">
                {projects.map((p, i) => (
                  <div
                    key={p.id}
                    className="proj-info absolute inset-0 flex flex-col justify-center"
                    style={{
                      pointerEvents: i === 0 ? "auto" : "none"
                    }}
                  >
                    {/* Index + accent bar */}
                    <div className="mb-4 flex items-center gap-4">
                      <span
                        className="font-mono text-[11px] uppercase tracking-[0.32em]"
                        style={{ color: p.color }}
                      >
                        [ {String(i + 1).padStart(3, "0")} ]
                      </span>
                      <span
                        className="h-[3px] flex-1 max-w-[240px]"
                        style={{
                          background: `linear-gradient(90deg, ${p.color} 0%, ${p.color}00 100%)`
                        }}
                      />
                    </div>
                    <h3
                      className="font-display text-4xl leading-[0.95] tracking-[-0.02em] text-ink md:text-5xl lg:text-6xl"
                      style={{ fontWeight: 800 }}
                    >
                      {p.name}
                    </h3>
                    <p
                      className="mt-5 font-mono text-[12px] uppercase leading-relaxed tracking-[0.22em]"
                      style={{ color: p.color }}
                    >
                      {p.tagline}
                    </p>
                    <div
                      className="my-6 h-px w-full max-w-md"
                      style={{
                        backgroundImage:
                          "repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0 6px, transparent 6px 12px)"
                      }}
                    />
                    <p className="max-w-xl font-mono text-[13px] leading-relaxed text-ink-dim">
                      {p.description}
                    </p>
                    <div className="mt-6 flex max-w-xl flex-wrap gap-2">
                      {p.stack.map((s) => (
                        <span
                          key={s}
                          className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim transition-colors"
                          style={{
                            padding: "5px 12px",
                            border: `1px solid ${p.color}55`,
                            background: `${p.color}10`,
                            borderRadius: 0
                          }}
                        >
                          [ {s} ]
                        </span>
                      ))}
                    </div>
                    <div className="mt-8 flex items-center gap-4 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-dim/70">
                      <span>{p.id}</span>
                      <span className="h-px flex-1 bg-white/10" />
                      <span
                        className="inline-flex items-center gap-2"
                        style={{ color: p.color }}
                      >
                        <span>&#9654; VIEW CASE</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ───── BIG SVG VISUAL PANE (RIGHT, col-span-6) ─────
                Capped to min(460px, 50vh) square — slightly smaller
                than before so the decorative -inset dashed ring and
                corner brackets can live OUTSIDE the SVG area without
                getting clipped by the stage's overflow-hidden or the
                HudFrame's bottom matte.
                `overflow-visible` ensures the dashed outer ring never
                gets cropped even when it extends past the column. */}
            <div
              className="relative col-span-6 aspect-square w-full self-center justify-self-center"
              style={{
                maxWidth: "min(460px, 50vh)",
                maxHeight: "min(460px, 50vh)",
                overflow: "visible"
              }}
            >
              {/* Subtle pane backdrop — a very faint radial so the
                  square boundary is visually obvious and the SVG
                  content isn't swimming in a starfield. Reads as a
                  "display panel" without dominating. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at 50% 50%, rgba(255,122,26,0.06) 0%, rgba(255,122,26,0.02) 55%, rgba(255,122,26,0) 85%)"
                }}
              />
              {/* 1px inset border — gives the pane a crisp visible
                  rectangle so you can see where the SVG "ends" and
                  the empty viewport begins. */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  border: "1px solid rgba(255,122,26,0.28)"
                }}
              />
              {/* Outer dashed ring — static decorative. */}
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-4 rounded-full"
                style={{
                  border: "1px dashed rgba(255,122,26,0.35)"
                }}
              />
              {/* Corner brackets */}
              {[
                { top: -10, left: -10, rot: 0 },
                { top: -10, right: -10, rot: 90 },
                { bottom: -10, right: -10, rot: 180 },
                { bottom: -10, left: -10, rot: 270 }
              ].map((pos, bi) => (
                <svg
                  key={bi}
                  aria-hidden
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  className="pointer-events-none absolute"
                  style={{
                    ...pos,
                    transform: `rotate(${pos.rot}deg)`,
                    color: "#FF7A1A"
                  }}
                >
                  <path
                    d="M0 0 L10 0 M0 0 L0 10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    fill="none"
                  />
                </svg>
              ))}

              {/* Five SVGs stacked, one visible at a time */}
              {projects.map((p) => {
                const Visual = PROJECT_VISUALS[p.id];
                return (
                  <div
                    key={p.id}
                    data-id={p.id}
                    className="proj-visual absolute inset-0 flex items-center justify-center"
                  >
                    {Visual && <Visual color={p.color} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* HUD bottom: progress bar + nav dots.
            Pushed UP to bottom-32 (128px) so it clears the global
            HudFrame's bottom-left LAT/LON + bottom-right SID labels
            (anchored at bottom-8). Anything closer made the orange
            progress bar visually crowd the LAT/LON line. */}
        <div className="pointer-events-none absolute bottom-32 left-12 right-12 z-20">
          <div className="flex items-end justify-between gap-8">
            {/* Progress bar */}
            <div className="flex flex-1 flex-col gap-3">
              <div className="flex items-baseline justify-between font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim">
                <span className="text-[#FF7A1A]">SCROLL //</span>
                <span>TRANSMISSION</span>
              </div>
              <div className="relative h-[4px] w-full bg-white/10">
                <div
                  ref={progressRef}
                  className="absolute inset-y-0 left-0 w-full origin-left"
                  style={{
                    background:
                      "linear-gradient(90deg, rgba(255,215,160,1) 0%, #FF7A1A 100%)",
                    boxShadow:
                      "0 0 12px rgba(255,122,26,0.9), 0 0 20px rgba(255,122,26,0.5)"
                  }}
                />
              </div>
            </div>
            {/* Nav dots */}
            <div
              ref={dotsRef}
              className="pointer-events-auto flex items-center gap-3"
            >
              {projects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-label={`Jump to ${p.name}`}
                  className="proj-dot group relative flex h-8 w-8 items-center justify-center"
                  style={
                    {
                      "--dot-color": p.color
                    } as React.CSSProperties
                  }
                >
                  <span
                    className="absolute inset-0 border border-white/15 transition-colors group-[.is-active]:border-[var(--dot-color)]"
                    style={{ clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }}
                  />
                  <span
                    className="h-[6px] w-[6px] bg-white/30 transition-all group-[.is-active]:scale-150 group-[.is-active]:bg-[var(--dot-color)]"
                    style={{ clipPath: "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)" }}
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* =========== Mobile / tablet: grid fallback =========== */}
      <div className="lg:hidden">
        <div className="mx-auto mb-10 max-w-7xl px-[clamp(16px,5vw,48px)]">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim">
            <span className="text-[#FF7A1A]">SYS.EXEC // 04</span>
            <span className="opacity-40">—</span>
            <span>FEATURED PROJECTS</span>
          </div>
          <KineticTitle
            id="projects-heading-mobile"
            text="EXECUTION"
            subtitle=".LAYER"
            triggerId="projects"
            className="mt-3"
            titleClassName="text-5xl md:text-6xl"
          />
        </div>

        <ul className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-8 px-[clamp(16px,5vw,48px)] sm:grid-cols-2">
          {projects.map((p, i) => {
            const Visual = PROJECT_VISUALS[p.id];
            return (
              <li
                key={p.id}
                className="proj-mobile-card relative border bg-[#05080f]/70 p-6 backdrop-blur-sm"
                style={{
                  borderColor: `${p.color}44`,
                  boxShadow: `0 0 30px ${p.color}22`
                }}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span
                    className="font-mono text-[10px] uppercase tracking-[0.32em]"
                    style={{ color: p.color }}
                  >
                    [ {String(i + 1).padStart(3, "0")} ]
                  </span>
                  <span
                    className="h-[2px] w-16"
                    style={{ background: p.color }}
                  />
                </div>
                <div className="mb-4 aspect-square w-full">
                  {Visual && <Visual color={p.color} />}
                </div>
                <h3
                  className="font-display text-2xl leading-tight tracking-[-0.02em] text-ink"
                  style={{ fontWeight: 800 }}
                >
                  {p.name}
                </h3>
                <p
                  className="mt-2 font-mono text-[10px] uppercase tracking-[0.2em]"
                  style={{ color: p.color }}
                >
                  {p.tagline}
                </p>
                <p className="mt-4 font-mono text-[12px] leading-relaxed text-ink-dim">
                  {p.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {p.stack.slice(0, 5).map((s) => (
                    <span
                      key={s}
                      className="font-mono text-[9px] uppercase tracking-[0.18em] text-ink-dim"
                      style={{
                        padding: "3px 8px",
                        border: `1px solid ${p.color}55`,
                        background: `${p.color}10`
                      }}
                    >
                      [ {s} ]
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </SectionFrame>
  );
}

export const ProjectsSection = memo(ProjectsSectionImpl);
export default ProjectsSection;
