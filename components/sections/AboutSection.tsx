"use client";

import { memo, useRef } from "react";
import type * as THREE from "three";
import { useGSAP } from "@gsap/react";
import { gsap, registerAll, hasPlugin } from "@/lib/gsap";
import { sceneStore } from "@/lib/sceneStore";
import { profile } from "@/content/profile";
import { SectionFrame } from "@/components/ui/SectionFrame";
import { KineticTitle } from "@/components/ui/KineticTitle";

/**
 * About / "SYS.INIT // 02". Asymmetric layout: text left, 3D right
 * (docked by SceneDock). Giant amber "02" top-right.
 *
 * Retains: bio line reveal, module-dim scrub, ring-glow pulse.
 * Drops: per-section core position / camera tweens (SceneDock owns).
 */

const BIO_LINES = [
  "I build scalable, production-ready systems",
  "that span the full stack.",
  "Web, mobile, cloud — one control surface,",
  "five modules, always online."
];

function splitLines(el: HTMLElement): HTMLSpanElement[] {
  const text = el.textContent ?? "";
  el.textContent = "";
  const spans: HTMLSpanElement[] = [];
  for (const line of text.split("\n")) {
    const row = document.createElement("span");
    row.className = "block overflow-hidden";
    const inner = document.createElement("span");
    inner.className = "inline-block will-change-transform";
    inner.textContent = line;
    row.appendChild(inner);
    el.appendChild(row);
    spans.push(inner);
  }
  return spans;
}

function AboutSectionImpl() {
  const rootRef = useRef<HTMLElement>(null);
  const bioRef = useRef<HTMLParagraphElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;
      let cancelled = false;

      const boot = async () => {
        await registerAll();
        if (cancelled) return;

        // ---- Bio line reveal --------------------------------------
        const bio = bioRef.current;
        let lines: Element[] | null = null;
        if (bio) {
          if (hasPlugin("SplitText")) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const SplitText = (gsap as any).core?.globals?.()?.SplitText;
              if (SplitText) {
                const split = new SplitText(bio, { type: "lines" });
                lines = split.lines as Element[];
              }
            } catch {
              /* ignore */
            }
          }
          if (!lines) {
            lines = splitLines(bio);
          }
        }

        if (lines && lines.length > 0) {
          // Dropped the animated filter:blur() — compositing a blur
          // every frame across each line is expensive on integrated
          // GPUs. y + opacity alone reads the same visually.
          gsap.fromTo(
            lines,
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.8,
              stagger: 0.1,
              ease: "power3.out",
              scrollTrigger: {
                trigger: rootRef.current,
                start: "top 70%"
              }
            }
          );
        }

        // ---- Stats: stagger in ------------------------------------
        const stats = statsRef.current?.querySelectorAll(".about-stat");
        if (stats && stats.length > 0) {
          gsap.fromTo(
            stats,
            { y: 20, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.5,
              stagger: 0.1,
              ease: "back.out(1.6)",
              scrollTrigger: {
                trigger: rootRef.current,
                start: "top 60%"
              }
            }
          );
        }

        // ---- Stats: count-up 0 → target when section enters view --
        const counters = statsRef.current
          ? Array.from(
              statsRef.current.querySelectorAll<HTMLElement>("[data-counter]")
            )
          : [];
        counters.forEach((el) => {
          const target = Number(el.dataset.counter ?? 0);
          const pad = Number(el.dataset.pad ?? 0);
          const prefix = el.dataset.prefix ?? "";
          const obj = { v: 0 };
          // seed visible text so initial paint isn't blank
          el.textContent = prefix + String(0).padStart(pad, "0");
          gsap.to(obj, {
            v: target,
            duration: 1.6,
            ease: "power3.out",
            scrollTrigger: {
              trigger: el,
              start: "top 85%",
              once: true
            },
            onUpdate: () => {
              const n = Math.round(obj.v);
              el.textContent = prefix + String(n).padStart(pad, "0");
            }
          });
        });

        // ---- Counter bars: scaleX 0 → 1 alongside the count-up ----
        const bars = statsRef.current
          ? Array.from(
              statsRef.current.querySelectorAll<HTMLElement>("[data-counter-bar]")
            )
          : [];
        if (bars.length > 0) {
          gsap.fromTo(
            bars,
            { scaleX: 0 },
            {
              scaleX: 1,
              duration: 1.6,
              ease: "power3.out",
              scrollTrigger: {
                trigger: statsRef.current,
                start: "top 85%",
                once: true
              }
            }
          );
        }

        // ---- Scene-enter scrub: glow boost + dim modules ----------
        const glow = sceneStore.core.glow;
        const moduleMeshes = [
          sceneStore.modules.frontend.mesh,
          sceneStore.modules.backend.mesh,
          sceneStore.modules.devops.mesh,
          sceneStore.modules.cloud.mesh,
          sceneStore.modules.mobile.mesh
        ].filter(Boolean);

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 60%",
            end: "top 10%",
            scrub: 1
          }
        });

        if (glow) tl.to(glow, { intensity: 5, ease: "none" }, 0);

        moduleMeshes.forEach((mesh) => {
          if (!mesh) return;
          const raw = mesh.material;
          const mat = (Array.isArray(raw) ? raw[0] : raw) as
            | (THREE.Material & {
                emissiveIntensity?: number;
                opacity?: number;
                transparent?: boolean;
              })
            | undefined;
          if (!mat) return;
          mat.transparent = true;
          if ("emissiveIntensity" in mat) {
            tl.to(mat, { emissiveIntensity: 0.2, ease: "none" }, 0);
          }
          if ("opacity" in mat) {
            tl.to(mat, { opacity: 0.35, ease: "none" }, 0);
          }
        });
      };

      void boot();

      return () => {
        cancelled = true;
      };
    },
    { scope: rootRef, dependencies: [] }
  );

  return (
    <SectionFrame
      id="about"
      ref={rootRef}
      ariaLabelledBy="about-heading"
    >
      {/* Giant "02" top-right, amber — anchored to the SectionFrame's
          inner padding so it never sits over the HUD label band. */}
      <div
        aria-hidden
        className="pointer-events-none absolute right-[clamp(48px,6vw,96px)] top-[clamp(64px,8vh,140px)] z-0 hidden select-none font-mono font-bold leading-none opacity-[0.95] md:block"
        style={{
          color: "#FF7A1A",
          letterSpacing: "-0.02em",
          fontSize: "clamp(6rem,12vw,14rem)"
        }}
      >
        02
      </div>

      {/* Right-side scrim so left text stays readable while 3D docks right */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 hidden bg-gradient-to-l from-[#0b0f19] via-[#0b0f19]/60 to-transparent md:block"
      />

      <div className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 gap-10 md:grid-cols-12">
        <div className="flex flex-col items-start gap-8 md:col-span-7 md:col-start-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim">
            <span className="text-[#FF7A1A]">SYS.INIT // 02</span>
            <span className="opacity-40">—</span>
            <span>OPERATOR // ONLINE</span>
            <span className="hidden opacity-40 md:inline">—</span>
            <span className="hidden md:inline">LAT 37.77°N / LON −122.42°W</span>
          </div>

          <KineticTitle
            id="about-heading"
            text="IDENTITY"
            subtitle=".INIT"
            triggerId="about"
            titleClassName="text-5xl md:text-7xl"
          />

          <p
            ref={bioRef}
            className="max-w-[44ch] whitespace-pre-line font-mono text-sm leading-relaxed text-ink md:text-lg"
          >
            {BIO_LINES.join("\n")}
          </p>

          <p className="max-w-[52ch] font-mono text-sm leading-relaxed text-ink-dim">
            {profile.summary}
          </p>

          {/* 3-column stats row */}
          <div
            ref={statsRef}
            className="mt-4 grid w-full max-w-xl grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4"
          >
            {[
              { label: "YEARS_DEV", target: 3, pad: 2, prefix: "", initial: "00" },
              { label: "STACKS", target: 5, pad: 2, prefix: "", initial: "00" },
              { label: "CLOUDS", target: 2, pad: 2, prefix: "", initial: "00" }
            ].map((s) => (
              <div
                key={s.label}
                className="about-stat border-t border-[#FF7A1A]/40 pt-3"
              >
                <div
                  className="font-display text-5xl text-ink md:text-6xl"
                  style={{ fontWeight: 800 }}
                  data-counter={s.target}
                  data-pad={s.pad}
                  data-prefix={s.prefix}
                >
                  {s.initial}
                </div>
                <div
                  className="mt-2 h-[2px] origin-left bg-[#FF7A1A]/60"
                  data-counter-bar
                />
                <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.28em] text-[#FF7A1A]">
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}

export const AboutSection = memo(AboutSectionImpl);
export default AboutSection;
