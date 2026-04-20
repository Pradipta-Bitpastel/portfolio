"use client";

import { memo, useRef } from "react";
import type * as THREE from "three";
import { useGSAP } from "@gsap/react";
import { gsap, registerAll } from "@/lib/gsap";
import { sceneStore } from "@/lib/sceneStore";
import { experience } from "@/content/experience";
import { SectionFrame } from "@/components/ui/SectionFrame";

/**
 * Experience — "SYS.TIMELINE // 05". Vertical timeline list on LEFT,
 * 3D on RIGHT (SceneDock owns position). Dashed-brackets framing.
 *
 * Scene reveals: timeline ring visibility + panel entry stagger.
 * No per-section camera tween — SceneDock owns it.
 */

function ExperienceSectionImpl() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;
      let cancelled = false;

      const boot = async () => {
        await registerAll();
        if (cancelled) return;

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
              trigger: rootRef.current,
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

        // Entry stagger for the timeline entries.
        const panels = rootRef.current!.querySelectorAll<HTMLElement>(
          ".exp-entry"
        );
        gsap.fromTo(
          panels,
          { y: 40, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            stagger: 0.15,
            ease: "power2.out",
            scrollTrigger: {
              trigger: rootRef.current,
              start: "top 70%"
            }
          }
        );
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
      style={{ minHeight: "150vh" }}
    >
      {/* Giant "05" top-right, amber — anchored inside the frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[clamp(48px,6vw,96px)] top-[clamp(64px,8vh,140px)] z-0 hidden select-none font-mono text-[10rem] font-bold leading-none opacity-[0.95] md:block lg:text-[14rem]"
        style={{ color: "#FF7A1A", letterSpacing: "-0.02em" }}
      >
        05
      </div>

      {/* Right-side scrim so left text stays readable */}
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
        <h2
          id="experience-heading"
          className="mb-14 font-display text-5xl leading-[0.9] tracking-[-0.03em] text-ink md:text-7xl"
          style={{ fontWeight: 800 }}
        >
          <span className="block">CAREER</span>
          <span className="block text-ink-dim">.LOG</span>
        </h2>

        {/* Vertical timeline — dashed connector line on the left. */}
        <div className="relative max-w-[40rem]">
          <div
            aria-hidden
            className="absolute bottom-0 left-[6px] top-0 w-px"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, rgba(255,122,26,0.6) 0 4px, transparent 4px 10px)"
            }}
          />
          <ul className="flex flex-col gap-10 pl-10">
            {experience.map((e, i) => (
              <li
                key={e.company}
                className="exp-entry relative border-t border-dashed border-[#FF7A1A]/30 pt-5"
              >
                {/* Amber bullet on the timeline */}
                <span
                  aria-hidden
                  className="absolute left-[-40px] top-3 h-3 w-3 rounded-full"
                  style={{
                    background: "#FF7A1A",
                    boxShadow: "0 0 12px #FF7A1A"
                  }}
                />
                <div className="flex items-baseline justify-between gap-4">
                  <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#FF7A1A]">
                    {e.period}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim/70">
                    {String(i + 1).padStart(2, "0")} / {String(experience.length).padStart(2, "0")}
                  </span>
                </div>
                <h3
                  className="mt-2 font-display text-2xl leading-tight tracking-[-0.02em] text-ink md:text-3xl"
                  style={{ fontWeight: 700 }}
                >
                  {e.role}
                  <span className="text-ink-dim"> · {e.company}</span>
                </h3>
                <ul className="mt-3 space-y-1.5">
                  {e.highlights.map((h) => (
                    <li
                      key={h}
                      className="flex gap-2 font-mono text-[12px] leading-relaxed text-ink-dim"
                    >
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#FF7A1A]/70" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionFrame>
  );
}

export const ExperienceSection = memo(ExperienceSectionImpl);
export default ExperienceSection;
