"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gsap, registerAll } from "@/lib/gsap";
import { SectionFrame } from "@/components/ui/SectionFrame";
import { useDeviceCapabilities } from "@/lib/usePerfTier";

// This whole section floats over the app's ambient 3D canvas, whose
// backdrop stays DARK in BOTH day + night (it lives in components/three
// + the layout shell, outside this file). So the section's own text and
// hairlines must remain light on BOTH themes to stay readable on that
// dark stage — using theme-flipping ink tokens here would render
// dark-on-dark in day mode. The bright accents (amber/green) read on both.
const ON_DARK_BONE = "#ece7df";
const ON_DARK_STEEL = "#8b93a7";
const AMBER = "#ff7a1a";
const AMBER_HI = "#ff8a3c";
const GREEN = "#39ffa5";

const ArtifactModel = dynamic(
  () => import("@/components/three/ArtifactModel").then((m) => m.ArtifactModel),
  { ssr: false, loading: () => null }
);

/**
 * Annotation callouts are anchored to a normalized point on the stage
 * (ax/ay in %) and render their label card on a side. A leader line is
 * drawn between the anchor and the card via SVG so the whole thing reads
 * like a technical specimen plate, not floating chips.
 */
const CALLOUTS = [
  { n: "01", side: "left", ax: 38, ay: 30, label: "PBR materials", sub: "albedo · normal · metal-rough · AO" },
  { n: "02", side: "right", ax: 62, ay: 40, label: "HDR reflections", sub: "image-based lighting" },
  { n: "03", side: "left", ax: 46, ay: 62, label: "Emissive visor", sub: "additive bloom pass" },
  { n: "04", side: "right", ax: 58, ay: 72, label: "React Three Fiber", sub: "real-time · 60 fps · WebGL" },
] as const;

const SPECS: ReadonlyArray<[string, string]> = [
  ["MESH", "DamagedHelmet"],
  ["FORMAT", "glTF 2.0 / PBR"],
  ["TRIS", "~46K"],
  ["RUNTIME", "WebGL2"],
];

/**
 * SYS.RENDER — an editorial 3D product-shot framed as an operative
 * specimen dossier. A physically-based model you DRAG to orbit, set on a
 * bordered plate with registration corners, leader-line annotations, and
 * a spec ledger. NO scroll pin (that locked scroll + janked) — the
 * section scrolls normally and the GLB is prefetched so arriving never
 * hitches. Desktop only; mobile gets an editorial spec poster.
 */
export function ShowcaseSection() {
  const { isMobile, isLowEnd, prefersReducedMotion } = useDeviceCapabilities();
  const use3D = !isMobile && !isLowEnd && !prefersReducedMotion;

  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  // Prefetch the GLB early (idle) so the canvas mount doesn't hitch.
  useEffect(() => {
    if (!use3D || typeof document === "undefined") return;
    const run = () => {
      const link = document.createElement("link");
      link.rel = "prefetch";
      link.as = "fetch";
      link.href = "/models/DamagedHelmet.glb";
      link.crossOrigin = "anonymous";
      document.head.appendChild(link);
    };
    const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
    if (ric) ric(run);
    else setTimeout(run, 1200);
  }, [use3D]);

  // In-view gate for the canvas frameloop + pause the ambient global
  // scene so only one WebGL canvas renders at a time (kills the jank).
  useEffect(() => {
    if (!use3D) return;
    const el = rootRef.current;
    const setActive = (v: boolean) => {
      setInView(v);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("portfolio:bg-pause", { detail: v }));
      }
    };
    if (!el || typeof IntersectionObserver === "undefined") { setActive(true); return; }
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.15 });
    io.observe(el);
    return () => {
      io.disconnect();
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("portfolio:bg-pause", { detail: false }));
    };
  }, [use3D]);

  // Reveal overlay + callouts once on enter (no pin, no scrub).
  useEffect(() => {
    if (!use3D) return;
    let cancelled = false;
    let ctx: ReturnType<typeof gsap.context> | null = null;
    const boot = async () => {
      await registerAll();
      if (cancelled || !rootRef.current) return;
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        // Visible end-state — nothing left at opacity:0.
        gsap.set("[data-intro],[data-callout],[data-plate],[data-corner],[data-spec-row],[data-leader]", {
          opacity: 1, x: 0, y: 0, scale: 1,
        });
        gsap.set("[data-leader-line]", { strokeDashoffset: 0 });
        return;
      }
      ctx = gsap.context(() => {
        // The specimen plate frame draws open from center.
        gsap.from("[data-plate]", {
          opacity: 0, scale: 0.985, duration: 1.1, ease: "power3.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 70%", once: true },
        });
        // Registration corner ticks scale in.
        gsap.from("[data-corner]", {
          opacity: 0, scale: 0, duration: 0.6, stagger: 0.06, ease: "back.out(2)",
          scrollTrigger: { trigger: rootRef.current, start: "top 68%", once: true },
        });
        // Editorial intro lifts in.
        gsap.from("[data-intro]", {
          opacity: 0, y: 30, stagger: 0.1, duration: 0.9, ease: "power3.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 65%", once: true },
        });
        // Spec ledger rows wipe in.
        gsap.from("[data-spec-row]", {
          opacity: 0, x: 16, stagger: 0.07, duration: 0.6, ease: "power3.out",
          scrollTrigger: { trigger: "[data-spec]", start: "top 88%", once: true },
        });
        // Annotation cards slide from their side.
        gsap.from("[data-callout]", {
          opacity: 0, x: (i) => (CALLOUTS[i].side === "left" ? -28 : 28),
          stagger: 0.13, duration: 0.8, ease: "power3.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 55%", once: true },
        });
        // Leader lines "draw" toward the model using stroke-dash.
        gsap.utils.toArray<SVGPathElement>("[data-leader-line]").forEach((line, i) => {
          const len = line.getTotalLength();
          gsap.set(line, { strokeDasharray: len, strokeDashoffset: len });
          gsap.to(line, {
            strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut",
            delay: 0.15 + i * 0.13,
            scrollTrigger: { trigger: rootRef.current, start: "top 55%", once: true },
          });
        });
      }, rootRef.current);
    };
    void boot();
    return () => { cancelled = true; ctx?.revert(); };
  }, [use3D]);

  // ---- Mobile / reduced-motion: editorial poster ----
  if (!use3D) {
    return (
      <SectionFrame id="showcase" ariaLabelledBy="showcase-title">
        <div className="mx-auto w-full max-w-3xl" style={{ color: ON_DARK_BONE }}>
          <div className="flex items-center justify-between border-t pt-3 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ borderColor: `${ON_DARK_BONE}22`, color: ON_DARK_STEEL }}>
            <span>SYS.RENDER · <span style={{ color: AMBER }}>REAL-TIME 3D</span></span>
            <span style={{ color: `${ON_DARK_STEEL}99` }}>SPEC-01</span>
          </div>
          <h2 id="showcase-title" className="mt-6 font-grotesk leading-[0.84] tracking-[-0.03em]" style={{ fontWeight: 800, fontSize: "clamp(2.4rem,9vw,4rem)" }}>
            Rendered<br />in the browser.
          </h2>
          <p className="mt-5 font-serif text-[clamp(1.1rem,4.5vw,1.5rem)] italic leading-snug" style={{ color: `${ON_DARK_BONE}bb` }}>
            Physically-based 3D, lit and shaded live in WebGL — the same React Three Fiber stack behind this site.
          </p>

          {/* Editorial specimen plate (static poster) — dark stage in both themes */}
          <figure className="crop-frame relative mt-8 overflow-hidden border" style={{ borderColor: `${ON_DARK_BONE}22`, background: `${ON_DARK_BONE}05` }}>
            <div className="grid aspect-[4/3] w-full place-items-center" style={{ background: "radial-gradient(circle at 50% 42%, #14161f 0%, #0a0b10 70%)" }}>
              {/* Poster removed (asset was missing → 404). The gradient stage +
                  caption read as a spec placeholder on mobile/low-tier. */}
              <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: ON_DARK_STEEL }}>
                specimen · render offline
              </span>
            </div>
            <figcaption className="flex items-center justify-between border-t px-3 py-2 font-mono text-[10px] uppercase tracking-[0.2em]" style={{ borderColor: `${ON_DARK_BONE}1a`, color: ON_DARK_STEEL }}>
              <span style={{ color: AMBER }}>FIG.01</span>
              <span>DamagedHelmet · glTF 2.0</span>
            </figcaption>
          </figure>

          <ul className="mt-7 grid grid-cols-2 gap-x-6 gap-y-3 font-mono text-[11px] uppercase tracking-[0.14em]" style={{ color: ON_DARK_STEEL }}>
            {CALLOUTS.map((c) => (
              <li key={c.n} className="border-t py-2" style={{ borderColor: `${ON_DARK_BONE}1a` }}>
                <span style={{ color: AMBER }}>{c.n}</span> <span style={{ color: `${ON_DARK_BONE}cc` }}>{c.label}</span>
              </li>
            ))}
          </ul>
        </div>
      </SectionFrame>
    );
  }

  // ---- Desktop: interactive 3D specimen dossier (no pin) ----
  return (
    <section
      id="showcase"
      aria-labelledby="showcase-title"
      ref={rootRef}
      className="relative flex min-h-[100svh] w-full items-center overflow-hidden px-[clamp(16px,5vw,96px)] py-[clamp(48px,7vh,120px)]"
    >
      {/* local atmosphere */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 h-[66vh] w-[66vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.13] blur-[120px]" style={{ background: AMBER }} />
        <div className="absolute right-[6%] top-[16%] h-[34vh] w-[34vh] rounded-full opacity-[0.05] blur-[120px]" style={{ background: "#4f9cff" }} />
        <div className="grid-bg absolute inset-0 opacity-[0.16]" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl">
        {/* Dossier header rule */}
        <div data-intro className="flex items-end justify-between border-t pt-3 font-mono text-[11px] uppercase tracking-[0.3em]" style={{ borderColor: `${ON_DARK_BONE}22`, color: ON_DARK_STEEL }}>
          <span className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: GREEN, boxShadow: `0 0 8px ${GREEN}` }} />
            SYS.RENDER · <span style={{ color: AMBER }}>REAL-TIME 3D</span>
          </span>
          <span className="hidden items-center gap-3 sm:flex" style={{ color: `${ON_DARK_STEEL}99` }}>
            <span>SPECIMEN · DH-01</span>
            <span style={{ color: AMBER }}>05 / 06</span>
          </span>
        </div>

        {/* Title row */}
        <div className="mt-6 grid items-end gap-6 md:grid-cols-[1fr_auto]">
          <div className="overflow-hidden">
            <h2
              data-intro
              id="showcase-title"
              className="font-grotesk leading-[0.82] tracking-[-0.035em]"
              style={{ fontWeight: 800, fontSize: "clamp(2.6rem,6.4vw,5.6rem)", color: ON_DARK_BONE }}
            >
              Rendered <span className="font-serif italic" style={{ fontWeight: 400, color: AMBER_HI }}>live</span>
              <br />in the browser.
            </h2>
          </div>
          <p data-intro className="max-w-xs pb-2 font-serif text-[clamp(1rem,1.4vw,1.25rem)] italic leading-snug md:text-right" style={{ color: `${ON_DARK_BONE}b3` }}>
            Physically-based, lit and shaded in WebGL — the same React&nbsp;Three&nbsp;Fiber stack this whole site runs on.
          </p>
        </div>

        {/* ── The specimen plate ── */}
        <div
          data-plate
          className="relative mt-7 aspect-[16/9] w-full overflow-hidden border"
          style={{
            borderColor: `${ON_DARK_BONE}22`,
            background:
              "radial-gradient(120% 90% at 50% 38%, #15171f 0%, #0b0c11 58%, #08090c 100%)",
            boxShadow: `inset 0 0 120px rgba(0,0,0,0.55), inset 0 1px 0 ${ON_DARK_BONE}10`,
          }}
        >
          {/* registration corner ticks */}
          {([["top-3","left-3"],["top-3","right-3"],["bottom-3","left-3"],["bottom-3","right-3"]] as const).map(([v, h], i) => (
            <div key={i} data-corner aria-hidden className={`pointer-events-none absolute ${v} ${h} h-3.5 w-3.5`}>
              <span className="absolute h-full w-px" style={{ background: `${AMBER}99`, [h.startsWith("left") ? "left" : "right"]: 0 }} />
              <span className="absolute w-full" style={{ height: 1, background: `${AMBER}99`, [v.startsWith("top") ? "top" : "bottom"]: 0 }} />
            </div>
          ))}

          {/* plate corner labels — on the dark stage, stay light in both themes */}
          <div data-intro className="pointer-events-none absolute left-5 top-4 font-mono text-[10px] uppercase tracking-[0.26em]" style={{ color: `${ON_DARK_STEEL}cc` }}>
            FIG.01 — ARTIFACT
          </div>
          <div data-intro className="pointer-events-none absolute right-5 top-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.26em]" style={{ color: `${ON_DARK_STEEL}cc` }}>
            <span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: GREEN, boxShadow: `0 0 6px ${GREEN}` }} />
            ORBIT · LIVE
          </div>

          {/* Draggable artifact fills the plate */}
          <div className="absolute inset-0">
            <ArtifactModel active={inView} />
          </div>

          {/* SVG leader lines from anchor → card edge (drawn on reveal) */}
          <svg aria-hidden className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {CALLOUTS.map((c) => {
              const edgeX = c.side === "left" ? 4 : 96;
              return (
                <g key={c.n} data-leader>
                  <path
                    data-leader-line
                    d={`M ${edgeX} ${c.ay} L ${(edgeX + c.ax) / 2} ${c.ay} L ${c.ax} ${c.ay}`}
                    fill="none"
                    stroke={`${AMBER}`}
                    strokeOpacity="0.55"
                    strokeWidth="0.18"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle cx={c.ax} cy={c.ay} r="0.55" fill={AMBER_HI} />
                  <circle cx={c.ax} cy={c.ay} r="1.4" fill="none" stroke={AMBER} strokeOpacity="0.4" strokeWidth="0.12" vectorEffect="non-scaling-stroke" />
                </g>
              );
            })}
          </svg>

          {/* Annotation cards pinned to plate edges */}
          {CALLOUTS.map((c) => (
            <div
              key={c.n}
              data-callout
              className="pointer-events-none absolute max-w-[40%]"
              style={{
                top: `${c.ay}%`,
                transform: "translateY(-50%)",
                ...(c.side === "left" ? { left: "clamp(14px,2vw,28px)" } : { right: "clamp(14px,2vw,28px)" }),
                textAlign: c.side === "right" ? "right" : "left",
              }}
            >
              <div className="font-mono text-[10px] tracking-[0.24em]" style={{ color: AMBER }}>{c.n}</div>
              <div className="font-grotesk text-[clamp(0.95rem,1.2vw,1.15rem)] leading-tight" style={{ fontWeight: 700, color: ON_DARK_BONE }}>{c.label}</div>
              <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: ON_DARK_STEEL }}>{c.sub}</div>
            </div>
          ))}

          {/* drag affordance */}
          <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: `${ON_DARK_STEEL}cc` }}>
            ⊹ drag to orbit ⊹
          </div>
        </div>

        {/* Spec ledger strip beneath the plate */}
        <div data-spec className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 border-t pt-4 font-mono text-[11px] uppercase tracking-[0.16em] sm:grid-cols-4" style={{ borderColor: `${ON_DARK_BONE}1a`, color: ON_DARK_STEEL }}>
          {SPECS.map(([k, v], i) => (
            <div key={k} data-spec-row className="flex items-center gap-3">
              <span style={{ color: `${AMBER}99` }}>{String(i + 1).padStart(2, "0")}</span>
              <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                <span>{k}</span>
                <span className="truncate text-right" style={{ color: ON_DARK_BONE, letterSpacing: "0.06em" }}>{v}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default ShowcaseSection;
