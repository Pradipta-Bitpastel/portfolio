"use client";

import { memo, useRef } from "react";
import type * as THREE from "three";
import { useGSAP } from "@gsap/react";
import { gsap, registerAll, ScrollTrigger } from "@/lib/gsap";
import { sceneStore, type ModuleId } from "@/lib/sceneStore";
import { SkillBar } from "@/components/ui/SkillBar";
import { skills, MODULE_ORDER } from "@/content/skills";
import { SectionFrame } from "@/components/ui/SectionFrame";
import { useDeviceCapabilities } from "@/lib/usePerfTier";

/**
 * Skills — "SYS.ACTIVATE // 03". Pinned, 5 sub-slides.
 * Layout: 3D docks LEFT, content HUD window on RIGHT.
 *
 * SceneDock owns the dock pose; we only drive per-module emissive,
 * scale boosts, and sub-slide content fades.
 */

type ModuleAccent = {
  id: ModuleId;
  label: string;
  accent: string;
  tagline: string;
  items: ReadonlyArray<string>;
};

function getMat(mesh: THREE.Mesh | null):
  | (THREE.Material & { emissiveIntensity?: number })
  | null {
  if (!mesh) return null;
  const raw = mesh.material;
  const m = Array.isArray(raw) ? raw[0] : raw;
  if (m && "emissiveIntensity" in m) {
    return m as THREE.Material & { emissiveIntensity?: number };
  }
  return null;
}

function activate(activeId: ModuleId) {
  MODULE_ORDER.forEach((id) => {
    const mesh = sceneStore.modules[id].mesh;
    const mat = getMat(mesh);
    const isActive = id === activeId;

    if (mat) {
      gsap.to(mat, {
        emissiveIntensity: isActive ? 1.6 : 0.15,
        duration: 0.6,
        ease: "power2.out",
        overwrite: "auto"
      });
    }

    if (mesh) {
      const target = isActive ? 1.4 : 0.85;
      gsap.to(mesh.scale, {
        x: target,
        y: target,
        z: target,
        duration: 0.6,
        ease: "back.out(1.4)",
        overwrite: "auto"
      });
    }
  });
}

function resetAllModules() {
  MODULE_ORDER.forEach((id) => {
    const mesh = sceneStore.modules[id].mesh;
    const mat = getMat(mesh);
    if (mat) {
      gsap.to(mat, {
        emissiveIntensity: 0.3,
        duration: 0.6,
        overwrite: "auto"
      });
    }
    if (mesh) {
      gsap.to(mesh.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.6,
        overwrite: "auto"
      });
    }
  });
}

function levelFor(idx: number): number {
  return 60 + ((idx * 3) % 35);
}

function SkillsPanel({
  module: m,
  index,
  total,
  panelRef
}: {
  module: ModuleAccent;
  index: number;
  total: number;
  panelRef: (el: HTMLDivElement | null) => void;
}) {
  const dots = Array.from({ length: total }, (_, i) => i);
  return (
    <div
      ref={panelRef}
      data-module-id={m.id}
      data-index={index}
      className="skills-panel pointer-events-none absolute inset-0 flex items-center justify-end px-6 opacity-0 md:px-16"
    >
      {/* Raw HUD window — not glass. Thick amber top border, mono labels. */}
      <div
        className="pointer-events-auto w-full max-w-xl border border-white/10 bg-[#05080f]/90 shadow-[0_0_60px_rgba(0,0,0,0.6)] backdrop-blur"
      >
        {/* Top amber strip */}
        <div
          className="flex items-center justify-between border-b border-white/10 px-5 py-2"
          style={{ backgroundColor: `${m.accent}12` }}
        >
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim">
            <span style={{ color: m.accent }}>MOD.{String(index + 1).padStart(2, "0")}</span>
            <span className="opacity-40">{"//"}</span>
            <span className="text-ink">{m.id.toUpperCase()}</span>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#FF7A1A]">
            ACTIVE
          </div>
        </div>

        <div className="p-6 md:p-8">
          <h3
            className="font-display text-5xl leading-[0.9] tracking-[-0.03em] md:text-7xl"
            style={{ color: m.accent, fontWeight: 800 }}
          >
            {m.label}
          </h3>

          <p className="mt-3 font-mono text-xs leading-relaxed text-ink-dim">
            {m.tagline}
          </p>

          <ul className="skills-grid mt-6 flex flex-col gap-3">
            {m.items.map((s, i) => (
              <li key={s} className="skill-item">
                <SkillBar name={s} level={levelFor(i)} color={m.accent} />
              </li>
            ))}
          </ul>

          {/* Sub-slide dots */}
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
            <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim">
              [ {String(index + 1).padStart(2, "0")} / {String(total).padStart(2, "0")} ]
            </div>
            <div className="flex items-center gap-1.5">
              {dots.map((d) => (
                <span
                  key={d}
                  className="h-1.5 w-1.5 rounded-full"
                  style={{
                    background:
                      d === index ? m.accent : "rgba(255,255,255,0.2)",
                    boxShadow: d === index ? `0 0 8px ${m.accent}` : "none"
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkillsSectionImpl() {
  const rootRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const panelsRef = useRef<Array<HTMLDivElement | null>>([]);
  const caps = useDeviceCapabilities();
  const isLowEnd = caps.isLowEnd;

  useGSAP(
    () => {
      if (!rootRef.current || !pinRef.current) return;
      let cancelled = false;

      const boot = async () => {
        await registerAll();
        if (cancelled) return;

        // Low-end: skip the pinned carousel entirely. The mobile
        // vertical-stack layout is already in the DOM and visible at
        // narrow widths; we just don't pin or scrub anything.
        if (isLowEnd) return;

        // Only run the pinned carousel on xl+ (was lg/1024px). On
        // smaller screens the panels render as a static vertical
        // stack — bump matches the lg:!h-[500vh] / xl:flex pairs.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ST = (gsap as any).core?.globals?.()?.ScrollTrigger;
        if (!ST || !ST.matchMedia || typeof window === "undefined" ||
            !window.matchMedia("(min-width: 1280px)").matches) {
          return;
        }

        // Single master timeline for the whole carousel.
        // Was: 1 master pin trigger + N per-panel scrub triggers (5
        // separate ScrollTrigger instances all running every scroll
        // tick). Now: 1 trigger that drives every panel via fromTo +
        // stagger inside one timeline, plus discrete onEnter callbacks
        // for the sceneStore module activation.
        const panels = panelsRef.current.filter(
          (p): p is HTMLDivElement => !!p
        );
        const total = panels.length;
        if (total === 0) return;
        const step = 1 / total;

        // Pre-seed: only first panel visible at progress 0.
        panels.forEach((panel, i) => {
          gsap.set(panel, { autoAlpha: i === 0 ? 1 : 0 });
        });

        const master = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current!,
            start: "top top",
            end: "bottom bottom",
            pin: pinRef.current!,
            pinSpacing: false,
            scrub: 1,
            snap: {
              snapTo: Array.from({ length: total + 1 }, (_, i) => i / total),
              duration: { min: 0.25, max: 0.55 },
              delay: 0.08,
              ease: "power2.inOut"
            },
            onUpdate: (self) => {
              // Drive the integer "active panel" for sceneStore module
              // emissive boost. Cheap — runs once per scroll tick.
              const idx = Math.min(
                total - 1,
                Math.floor(self.progress * total)
              );
              const panel = panels[idx];
              const moduleId = panel?.dataset.moduleId as ModuleId | undefined;
              if (moduleId && (master as unknown as { _lastIdx?: number })
                ._lastIdx !== idx) {
                (master as unknown as { _lastIdx?: number })._lastIdx = idx;
                activate(moduleId);
                // Animate the just-revealed panel's skill-fill bars.
                const fills = panel.querySelectorAll<HTMLElement>(
                  ".skillbar-fill"
                );
                fills.forEach((el, fIdx) => {
                  const lvl = Number(el.dataset.level ?? 0);
                  gsap.fromTo(
                    el,
                    { width: "0%" },
                    {
                      width: `${lvl}%`,
                      duration: 0.8,
                      ease: "power3.out",
                      delay: fIdx * 0.06,
                      overwrite: "auto"
                    }
                  );
                });
              }
            }
          }
        });

        // Per-panel cross-fades sequenced inside the one master
        // timeline. Each panel fades out as the next fades in.
        for (let i = 0; i < total - 1; i++) {
          const at = (i + 0.6) * step;
          master.to(
            panels[i],
            { autoAlpha: 0, duration: step * 0.4, ease: "none" },
            at
          );
          master.fromTo(
            panels[i + 1],
            { autoAlpha: 0 },
            { autoAlpha: 1, duration: step * 0.4, ease: "none" },
            at
          );
        }

        // Reset on leave section.
        ScrollTrigger.create({
          trigger: rootRef.current!,
          start: "top top",
          end: "bottom bottom",
          onLeave: () => {
            resetAllModules();
          },
          onLeaveBack: () => {
            resetAllModules();
          }
        });
      };

      void boot();

      return () => {
        cancelled = true;
        resetAllModules();
      };
    },
    { scope: rootRef, dependencies: [isLowEnd] }
  );

  const accents: ModuleAccent[] = MODULE_ORDER.map((id) => ({
    id,
    label: skills[id].label,
    accent: skills[id].accent,
    tagline: skills[id].tagline,
    items: skills[id].items
  }));

  return (
    <SectionFrame
      id="skills"
      ref={rootRef}
      ariaLabelledBy="skills-heading"
      bare
      className="!px-0 !py-0 xl:!h-[500vh]"
    >
      {/* Mobile / tablet: simple vertical stack, no pin */}
      <div className="flex flex-col gap-8 px-[clamp(16px,5vw,96px)] py-[clamp(32px,5vh,120px)] xl:hidden">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim">
          <span className="text-[#FF7A1A]">SYS.ACTIVATE // 03</span>
          <span className="opacity-40">—</span>
          <span>MODULES ONLINE</span>
        </div>
        <h2 id="skills-heading-mobile" className="sr-only">Skills</h2>
        {accents.map((m, i) => (
          <div
            key={m.id}
            className="w-full border border-white/10 bg-[#05080f]/90 backdrop-blur"
          >
            <div
              className="flex items-center justify-between border-b border-white/10 px-5 py-2"
              style={{ backgroundColor: `${m.accent}12` }}
            >
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim">
                <span style={{ color: m.accent }}>MOD.{String(i + 1).padStart(2, "0")}</span>
                <span className="opacity-40">{"//"}</span>
                <span className="text-ink">{m.id.toUpperCase()}</span>
              </div>
              <div className="font-mono text-[10px] uppercase tracking-[0.32em] text-[#FF7A1A]">ACTIVE</div>
            </div>
            <div className="p-5">
              <h3
                className="font-display text-4xl leading-[0.9] tracking-[-0.03em] sm:text-5xl"
                style={{ color: m.accent, fontWeight: 800 }}
              >
                {m.label}
              </h3>
              <p className="mt-2 font-mono text-xs leading-relaxed text-ink-dim">{m.tagline}</p>
              <ul className="mt-5 flex flex-col gap-3">
                {m.items.map((s, idx) => (
                  <li key={s}>
                    <SkillBar name={s} level={levelFor(idx)} color={m.accent} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* lg+: pinned sub-slide carousel */}
      <div
        ref={pinRef}
        className="sticky top-0 hidden h-[100svh] w-full items-center overflow-hidden px-[clamp(48px,6vw,96px)] py-[clamp(56px,7vh,120px)] xl:flex"
      >
        {/* Giant "03" top-left, amber — anchored inside the frame */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-[clamp(48px,6vw,96px)] top-[clamp(64px,8vh,140px)] z-0 hidden select-none font-mono font-bold leading-none opacity-[0.95] md:block"
          style={{
            color: "#FF7A1A",
            letterSpacing: "-0.02em",
            fontSize: "clamp(6rem,12vw,14rem)"
          }}
        >
          03
        </div>

        {/* Top meta label — kept inside the section padding band */}
        <div className="pointer-events-none absolute left-[clamp(48px,6vw,96px)] top-[clamp(56px,7vh,120px)] z-10 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim">
          <span className="text-[#FF7A1A]">SYS.ACTIVATE // 03</span>
          <span className="opacity-40">—</span>
          <span>MODULES ONLINE</span>
          <span className="opacity-40">—</span>
          <span>UPTIME 99.982%</span>
        </div>

        {/* Heading: current module name rendered full-size in display */}
        <h2
          id="skills-heading"
          className="sr-only"
        >
          Skills: five modules, one runtime
        </h2>

        {/* Stacked HUD panels; ScrollTrigger fades the active one in */}
        {accents.map((m, i) => (
          <SkillsPanel
            key={m.id}
            module={m}
            index={i}
            total={accents.length}
            panelRef={(el) => {
              panelsRef.current[i] = el;
            }}
          />
        ))}
      </div>
    </SectionFrame>
  );
}

export const SkillsSection = memo(SkillsSectionImpl);
export default SkillsSection;
