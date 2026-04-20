"use client";

import { memo, useRef } from "react";
import * as THREE from "three";
import { useGSAP } from "@gsap/react";
import { gsap, registerAll, hasPlugin } from "@/lib/gsap";
import { sceneStore } from "@/lib/sceneStore";
import { projects, type Project } from "@/content/projects";
import { SectionFrame } from "@/components/ui/SectionFrame";

/**
 * Projects — "SYS.EXEC // 04". Framed cards (not glass). Amber
 * corner brackets, square-bracket stack chips, project numbers.
 * 3D dock top-center (handled by SceneDock). Horizontal pinned
 * carousel on lg+.
 */

function CornerBrackets({ color }: { color: string }) {
  // Renders 4 bracket SVGs as absolutely-positioned decorations.
  const size = 14;
  const thickness = 1.5;
  const brackets = [
    { pos: "top-2 left-2", rotate: "rotate-0" },
    { pos: "top-2 right-2", rotate: "rotate-90" },
    { pos: "bottom-2 right-2", rotate: "rotate-180" },
    { pos: "bottom-2 left-2", rotate: "-rotate-90" }
  ];
  return (
    <>
      {brackets.map((b, i) => (
        <svg
          key={i}
          aria-hidden="true"
          width={size}
          height={size}
          viewBox="0 0 14 14"
          className={`absolute ${b.pos} ${b.rotate}`}
          style={{ color }}
        >
          <path
            d="M0 0 L6 0 M0 0 L0 6"
            stroke="currentColor"
            strokeWidth={thickness}
            fill="none"
          />
        </svg>
      ))}
    </>
  );
}

function ProjectCard({
  project,
  index
}: {
  project: Project;
  index: number;
}) {
  const cardRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const card = cardRef.current;
      if (!card) return;

      gsap.fromTo(
        card,
        { rotateY: -12, y: 40, opacity: 0 },
        {
          rotateY: 0,
          y: 0,
          opacity: 1,
          duration: 1,
          ease: "power2.out",
          scrollTrigger: {
            trigger: card,
            start: "top 80%",
            end: "top 50%",
            toggleActions: "play none none reverse"
          }
        }
      );

      const onXY = (nx: number, ny: number) => {
        const rect = card.getBoundingClientRect();
        const cx = (nx - rect.left) / rect.width - 0.5;
        const cy = (ny - rect.top) / rect.height - 0.5;
        gsap.to(card, {
          rotateY: cx * 10,
          rotateX: -cy * 10,
          duration: 0.6,
          ease: "power2.out",
          overwrite: "auto"
        });
      };
      const onLeave = () => {
        gsap.to(card, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.8,
          ease: "power3.out",
          overwrite: "auto"
        });
      };

      let cleanup = () => undefined as void;
      const move = (e: PointerEvent) => onXY(e.clientX, e.clientY);
      card.addEventListener("pointermove", move, { passive: true });
      card.addEventListener("pointerleave", onLeave, { passive: true });
      cleanup = () => {
        card.removeEventListener("pointermove", move);
        card.removeEventListener("pointerleave", onLeave);
      };
      return cleanup;
    },
    { scope: cardRef, dependencies: [] }
  );

  const num = String(index + 1).padStart(3, "0");

  return (
    <div
      ref={cardRef}
      data-project-id={project.id}
      data-index={index}
      className="project-card relative will-change-transform"
      style={{
        perspective: "1600px",
        transformStyle: "preserve-3d"
      }}
    >
      <div
        className="relative overflow-hidden border border-white/15 bg-[#05080f]/85 p-8 backdrop-blur-sm transition-all duration-300"
        style={{
          borderColor: `${project.color}44`,
          boxShadow: `0 0 40px ${project.color}22, inset 0 0 0 1px ${project.color}10`,
          width: "520px",
          height: "620px"
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow =
            `0 0 60px ${project.color}88, inset 0 0 0 1px ${project.color}44`;
          (e.currentTarget as HTMLElement).style.borderColor =
            `${project.color}cc`;
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.boxShadow =
            `0 0 40px ${project.color}22, inset 0 0 0 1px ${project.color}10`;
          (e.currentTarget as HTMLElement).style.borderColor =
            `${project.color}44`;
        }}
      >
        <CornerBrackets color="#FF7A1A" />

        {/* Top bar: project number + color strip */}
        <div className="mb-6 flex items-center justify-between">
          <span
            className="font-mono text-[10px] uppercase tracking-[0.32em]"
            style={{ color: "#FF7A1A" }}
          >
            [ {num} ]
          </span>
          <span
            className="h-[2px] w-24"
            style={{ background: project.color }}
          />
        </div>

        {/* Title */}
        <h3
          className="font-display text-4xl leading-[0.95] tracking-[-0.02em] text-ink"
          style={{ fontWeight: 800 }}
        >
          {project.name}
        </h3>

        {/* Tagline */}
        <p
          className="mt-3 font-mono text-xs uppercase tracking-[0.2em]"
          style={{ color: project.color }}
        >
          {project.tagline}
        </p>

        {/* Dashed divider */}
        <div
          className="my-6 h-px w-full"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.25) 0 6px, transparent 6px 12px)"
          }}
        />

        {/* Description */}
        <p className="font-mono text-[13px] leading-relaxed text-ink-dim line-clamp-5">
          {project.description}
        </p>

        {/* Stack chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          {project.stack.map((s) => (
            <span
              key={s}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-dim"
              style={{
                padding: "4px 10px",
                border: `1px solid ${project.color}55`,
                background: `${project.color}10`
              }}
            >
              [ {s} ]
            </span>
          ))}
        </div>

        {/* Footer: id */}
        <div className="absolute bottom-6 left-8 right-8 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em] text-ink-dim/70">
          <span>{project.id}</span>
          <span style={{ color: project.color }}>&#9654; VIEW</span>
        </div>
      </div>
    </div>
  );
}

function ProjectsSectionImpl() {
  const rootRef = useRef<HTMLElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;
      let cancelled = false;

      const boot = async () => {
        await registerAll();
        if (cancelled) return;

        // Connection line opacity reveal (no core transform — SceneDock).
        const connGroup = sceneStore.connections.ref;
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: rootRef.current,
            start: "top 60%",
            end: "top 10%",
            scrub: 1
          }
        });

        if (connGroup) {
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
                (mat as unknown as { blending?: THREE.Blending }).blending ===
                THREE.AdditiveBlending;
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
      };

      void boot();

      // Pinned horizontal carousel on lg+ screens only.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ST = (gsap as any).core?.globals?.()?.ScrollTrigger;
      let mm: { revert: () => void } | null = null;
      if (ST && typeof ST.matchMedia === "function") {
        mm = ST.matchMedia({
          "(min-width: 1024px)": () => {
            const outer = carouselRef.current;
            const track = trackRef.current;
            if (!outer || !track) return;
            const compute = () =>
              Math.max(0, track.scrollWidth - outer.clientWidth);
            gsap.to(track, {
              x: () => -compute(),
              ease: "none",
              scrollTrigger: {
                trigger: outer,
                start: "top top",
                end: () => `+=${compute() + 600}`,
                pin: true,
                scrub: 1,
                invalidateOnRefresh: true
              }
            });
          }
        });
      }

      // Silence "unused" in minimal build paths.
      void hasPlugin;

      return () => {
        cancelled = true;
        try {
          mm?.revert();
        } catch {
          /* ignore */
        }
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
      style={{ minHeight: "240vh" }}
    >
      {/* Giant "04" top-left, amber — anchored inside the frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[clamp(48px,6vw,96px)] top-[clamp(64px,8vh,140px)] z-0 hidden select-none font-mono text-[10rem] font-bold leading-none opacity-[0.95] md:block lg:text-[14rem]"
        style={{ color: "#FF7A1A", letterSpacing: "-0.02em" }}
      >
        04
      </div>

      <div className="mx-auto mb-12 max-w-7xl pl-0 md:pl-56 lg:pl-72">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim">
          <span className="text-[#FF7A1A]">SYS.EXEC // 04</span>
          <span className="opacity-40">—</span>
          <span>BUILDING IN PRODUCTION</span>
        </div>
        <h2
          id="projects-heading"
          className="mt-3 font-display text-5xl leading-[0.9] tracking-[-0.03em] text-ink md:text-7xl"
          style={{ fontWeight: 800 }}
        >
          <span className="block">EXECUTION</span>
          <span className="block text-ink-dim">.LAYER</span>
        </h2>
      </div>

      {/* Mobile + tablet: vertical grid fallback */}
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 md:grid-cols-2 lg:hidden">
        {projects.map((p, i) => (
          <ProjectCard key={p.id} project={p} index={i} />
        ))}
      </div>

      {/* lg+ : pinned horizontal carousel */}
      <div
        ref={carouselRef}
        className="relative hidden h-screen w-full overflow-hidden lg:block"
      >
        <div
          ref={trackRef}
          className="flex h-full items-center gap-8 pl-24 pr-24"
          style={{ width: "max-content" }}
        >
          {projects.map((p, i) => (
            <div
              key={p.id}
              className="shrink-0"
            >
              <ProjectCard project={p} index={i} />
            </div>
          ))}
        </div>
      </div>
    </SectionFrame>
  );
}

export const ProjectsSection = memo(ProjectsSectionImpl);
export default ProjectsSection;
