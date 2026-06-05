"use client";

import { useEffect, useRef } from "react";
import { gsap, registerAll } from "@/lib/gsap";
import { profile } from "@/content/profile";
import { getSection } from "@/lib/sections";
import { useTheme } from "@/lib/useTheme";

// NOTE: the ONE robot now lives in the ambient global scene ([TravelerModel] in
// Scene.tsx) and TRAVELS scroll-driven through all sections. The hero-scoped
// robot canvas was removed so there's a single continuous model (no
// hero-model-fades-then-traveler-appears). HeroRobot*.tsx stay on disk unused.

const HERO = getSection("hero")!;

// Floating emoji that orbit the bot on the left cliff (x/y are % of the stage,
// clustered over the robot). `s` size, `d` anim delay, `u` anim duration — all
// bob via the .hero-emoji CSS keyframes; the whole cluster streams down on
// scroll (driven in the rAF loop). DOM (crisp text, zero GPU cost).

const ROLES = [
  "FRONTEND DEVELOPER",
  "FULL-STACK ENGINEER",
  "REACT NATIVE DEVELOPER",
  "CLOUD / DEVOPS ENGINEER",
];

/* ------------------------------------------------------------------ *
 *  Firewatch parallax — 7 real photographic layers (m7-0 sky/back ..
 *  m7-6 foreground trees/front) + a celestial sky slotted into the
 *  painted sky. Each layer is rendered object-cover and oversized via
 *  the WRAPPER (negative inset, NOT a transform utility) because the
 *  rAF engine below OWNS every layer's inline `transform`.
 *
 *  TRUE Firewatch parallax via CSS STICKY (no GSAP pin): the <section>
 *  is tall (130vh) and the stage is `sticky top-0 h-[100svh]`, so it
 *  stays pinned while the user scrolls through the section. The rAF
 *  loop reads the section's OWN scroll progress and translates each
 *  layer UP by `progress * travel * vh`.
 *
 *  DIRECTION — "drone craning DOWN the mountain, peaks → valley". The
 *  scene SPREADS vertically as you scroll: the far sky + moon lift UP and
 *  out (negative travel) while the near foreground SINKS DOWN (positive),
 *  mid ridges passing through ~zero. The eye is pulled from the departing
 *  peaks down into the opening valley (a top→bottom, looking-DOWN read);
 *  the near foreground sinking keeps the bottom covered (no void), and the
 *  robot rides that same downward motion (HeroRobot). Mouse parallax
 *  (translate X by mouse * depth, near = more) layers on top.
 *
 *  PER-LAYER VERTICAL TRAVEL at progress=1 (NEG = up, POS = down):
 *    far/sky ≈ -0.16  →  near/front ≈ +0.27   (see LAYERS)
 *  data-depth = horizontal mouse factor (far ≈ 4 → near ≈ 44).
 * ------------------------------------------------------------------ */
type Layer = { night: string; day: string; z: number; travel: number; depth: number };

// 7 merged layers (recolor/dissolve/wordmark BAKED in), each with NIGHT (cool)
// + DAY (warm) variants that crossfade with the theme.
//
// PARALLAX DIRECTION — "drone craning DOWN the mountain, peaks → valley"
// (the user wants the gaze to sweep TOP→BOTTOM, not bottom→top).
// The trick: the scene SPREADS vertically as you scroll. The far sky + peaks
// lift UP and out of frame (negative travel) while the near foreground SINKS
// DOWN (positive travel); the mid ridges pass through ~zero. So your eye is
// pulled from the departing peaks down into the opening valley — a descending,
// looking-DOWN read. The near foreground still sinks (covers the bottom → no
// void), and the robot rides that same downward motion (see HeroRobot).
//   `travel` = vh the layer moves on full scroll; NEGATIVE = UP (far/sky),
//              POSITIVE = DOWN (near/front). `depth` = mouse-parallax px.
// ?v cache-buster: day PNGs were re-baked under the same filename.
const V = "?v=11";
const LAYERS: Layer[] = [
  { night: "/images/parallax/m7-0.png", day: "/images/parallax/m7-day0.png", z: 0, travel: -0.16, depth: 4 },
  { night: "/images/parallax/m7-1.png", day: "/images/parallax/m7-day1.png", z: 1, travel: -0.09, depth: 8 },
  { night: "/images/parallax/m7-2.png", day: "/images/parallax/m7-day2.png", z: 2, travel: -0.02, depth: 13 },
  { night: "/images/parallax/m7-3.png", day: "/images/parallax/m7-day3.png", z: 3, travel: 0.06, depth: 19 },
  { night: "/images/parallax/m7-4.png", day: "/images/parallax/m7-day4.png", z: 4, travel: 0.13, depth: 26 },
  { night: "/images/parallax/m7-5.png", day: "/images/parallax/m7-day5.png", z: 5, travel: 0.2, depth: 34 },
  { night: "/images/parallax/m7-6.png", day: "/images/parallax/m7-day6.png", z: 6, travel: 0.27, depth: 44 },
];

// ----- celestial sky (lives INSIDE the hero, in the painted sky) ------------
// Deterministic PRNG so SSR + client render identical stars (no hydration gap).
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0), s / 4294967296);
}
// Stars scattered across the UPPER sky only (top ~50%) — the mountain ridges
// sit in front and naturally occlude anything lower, so we never draw a star
// "inside" a mountain.
const STARS = (() => {
  const r = seeded(20260605);
  // 38 stars (was 70) — fewer always-animating compositor layers = smoother
  // scroll; sized a touch larger so the field still reads rich.
  return Array.from({ length: 38 }, () => ({
    x: +(r() * 100).toFixed(2),
    y: +(r() * 52).toFixed(2),
    size: +(1.0 + r() * 2.3).toFixed(2),
    delay: +(r() * 5).toFixed(2),
    dur: +(2.4 + r() * 3).toFixed(2),
    base: +(0.55 + r() * 0.45).toFixed(2),
  }));
})();
const SHOOTERS = [
  { top: "9%", left: "8%", delay: "2.5s", every: "14s" },
  { top: "16%", left: "52%", delay: "9s", every: "19s" },
];
const CLOUDS = [
  { top: "13%", w: 42, dur: "95s", delay: "-12s", o: 0.5 },
  { top: "26%", w: 58, dur: "135s", delay: "-64s", o: 0.34 },
  { top: "8%", w: 30, dur: "78s", delay: "-40s", o: 0.42 },
];

/**
 * Hero / SYS.BOOT — a true Firewatch-style 2.5D parallax built from the
 * 9 real photographic PNG layers, recolored to the site's cool blue-hour
 * palette. CSS sticky pins the stage through a tall section; one rAF loop
 * reads the section's own scroll progress + pointer and writes each
 * layer's inline transform (nearer = travels further up). Native scroll
 * only — nothing hijacks the scrollbar. Reduced motion freezes the static
 * first frame (no rAF).
 */
export function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const identityRef = useRef<HTMLDivElement>(null);
  const roleRef = useRef<HTMLSpanElement>(null);
  const { theme } = useTheme();
  const day = theme === "day";

  // Theme swap is hidden by the ThemeTransitionOverlay's instant opaque cover
  // (a layout-effect cover painted in the SAME frame as the swap), so the hero
  // just swaps each layer's <img src> directly — no per-layer cross-dissolve
  // (that used to linger into the reveal as a double-image). Both sets are
  // preloaded below so the swap paints from cache under the cover.

  // Preload BOTH theme image sets once, so toggling swaps instantly with no
  // flash (only the active set is mounted in the DOM at a time).
  useEffect(() => {
    LAYERS.forEach((l) => {
      [l.night, l.day].forEach((src) => {
        const img = new Image();
        img.src = src + V;
      });
    });
  }, []);

  // Parallax engine — ONE rAF, transform-only, all-browser. Each layer wrapper
  // gets a single translate3d combining the scroll-linked vertical rise and the
  // mouse-linked horizontal drift. We read `window.scrollY` (cheap, no layout)
  // against the hero's cached offsetTop/height — NOT getBoundingClientRect per
  // frame (that forced a layout read each frame). Five merged layers + one
  // transform write each = light enough to stay smooth; the loop pauses when
  // the hero is off-screen. Reduced motion = static first frame.
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const identity = identityRef.current;
    if (!section || !stage) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const wrappers = Array.from(
      stage.querySelectorAll<HTMLElement>(".hero-layer")
    );

    // Cache layout; refresh on resize (never read layout inside the rAF).
    let heroTop = 0;
    let heroH = 0;
    let vh = 0;
    const measure = () => {
      heroTop = section.offsetTop;
      heroH = section.offsetHeight;
      vh = window.innerHeight;
    };
    measure();

    let raf = 0;
    let mx = 0;
    let my = 0;
    let tx = 0;
    let ty = 0;
    let visible = true;

    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1;
      ty = (e.clientY / window.innerHeight) * 2 - 1;
    };

    const render = () => {
      mx += (tx - mx) * 0.08;
      my += (ty - my) * 0.08;

      const denom = Math.max(heroH - vh, 1);
      const progress = Math.min(
        Math.max((window.scrollY - heroTop) / denom, 0),
        1
      );

      for (const el of wrappers) {
        const travel = parseFloat(el.dataset.travel || "0");
        const depth = parseFloat(el.dataset.depth || "0");
        const x = mx * depth * -1;
        // +travel = DOWN (the foreground sinks past the descending drone).
        const y = progress * travel * vh + my * depth * -0.5;
        // TRANSLATE ONLY — cheapest composite (a per-frame scale was forcing
        // re-rasterization of large layers = flicker). The near layers' 0.26vh
        // downward sink already gives strong, visible front-driven depth.
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      }

      if (identity) {
        identity.style.opacity = String(Math.max(1 - progress * 1.5, 0));
        identity.style.transform = `translate3d(0, ${(-progress * vh * 0.12).toFixed(2)}px, 0) scale(${(1 - progress * 0.06).toFixed(3)})`;
      }

      raf = visible ? requestAnimationFrame(render) : 0;
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible && !raf) raf = requestAnimationFrame(render);
        else if (!visible && raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      },
      { threshold: 0 }
    );
    io.observe(section);

    window.addEventListener("resize", measure);
    window.addEventListener("pointermove", onMove, { passive: true });
    raf = requestAnimationFrame(render);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("pointermove", onMove);
    };
  }, []);

  // Intro + role text cycler.
  useEffect(() => {
    let cancelled = false;
    let ctx: ReturnType<typeof gsap.context> | null = null;
    let cycle: gsap.core.Timeline | null = null;

    const boot = async () => {
      await registerAll();
      if (cancelled || !stageRef.current) return;
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      ctx = gsap.context(() => {
        if (!reduced) {
          gsap.from("[data-hero]", {
            opacity: 0,
            y: 30,
            duration: 0.9,
            ease: "power3.out",
            stagger: 0.1,
            delay: 0.2,
          });
        }

        const roleEl = roleRef.current;
        if (roleEl && !reduced) {
          cycle = gsap.timeline({ repeat: -1, delay: 1 });
          ROLES.forEach((role) => {
            cycle!
              .to(roleEl, { duration: 0.5, text: role, ease: "none" })
              .to(roleEl, { duration: 1.6, text: role })
              .to(roleEl, { duration: 0.3, text: "", ease: "none" });
          });
        } else if (roleEl) {
          roleEl.textContent = ROLES[0];
        }
      }, identityRef.current ?? undefined);
    };
    void boot();
    return () => {
      cancelled = true;
      cycle?.kill();
      ctx?.revert();
    };
  }, []);

  return (
    <section
      id="hero"
      ref={sectionRef}
      aria-labelledby="hero-name"
      className="relative w-full min-h-[130vh] bg-bg"
    >
      {/* Sticky stage — CSS-pinned in the viewport while the tall section
          scrolls through it (NO GSAP pin). overflow-hidden lives HERE so
          the parallax never exposes an edge; the section above stays a
          normal block so `sticky` has room to travel.

          NOTE: deliberately NO `transform` here. A transform (translateZ(0))
          would make this sticky stage a STACKING CONTEXT, which would force
          ALL hero layers above/below the fixed ambient canvas as one block.
          Without it (sticky+overflow alone are NOT stacking contexts), each
          .hero-layer's z-index resolves in the ROOT context, so the fixed
          robot canvas (z-10) can slot BETWEEN the back layers (sky/ridges,
          z<10) and the FRONT foreground layers (trees, z>10) — the trees then
          occlude the robot's feet for true diorama depth. */}
      <div
        className="sticky top-0 h-[100svh] w-full overflow-hidden"
        style={{ backgroundColor: "var(--bg)" }}
      >
        <div ref={stageRef} className="absolute inset-0" aria-hidden>
          {LAYERS.map((layer) => (
            /* WRAPPER owns the parallax transform (rAF writes translate3d).
               ONLY the active theme's image is rendered (not both stacked) —
               stacking 2 variants × 7 layers = 14 full-screen retina textures,
               which thrashed GPU memory and flickered badly. One plain image
               per layer = the cheapest, smoothest composite. The inactive set
               is preloaded (effect below) so the toggle swap is instant. */
            <div
              key={layer.z}
              data-travel={layer.travel}
              data-depth={layer.depth}
              className="hero-layer absolute -inset-[8%]"
              style={{
                // Sky stays z0; the celestial layer slots in at z1; the mid
                // ridges (z2..4) sit just under the robot canvas (z-10). The
                // two FRONT foreground layers (z5 = ridge+hiker, z6 = near
                // trees) jump ABOVE the canvas (→ 12, 13) so they occlude the
                // robot's feet — the robot is composited BETWEEN the mid
                // ridges and the foreground, like a figure standing in the
                // valley. (vignette 16 / melt 17 / identity 20 sit on top.)
                zIndex:
                  layer.z <= 4
                    ? layer.z === 0
                      ? 0
                      : layer.z + 1
                    : layer.z + 7,
                willChange: "transform",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={(day ? layer.day : layer.night) + V}
                alt=""
                aria-hidden
                draggable={false}
                decoding="async"
                loading={layer.z <= 1 ? "eager" : "lazy"}
                fetchPriority={layer.z === 0 ? "high" : "auto"}
                className="absolute inset-0 h-full w-full select-none object-cover"
              />
            </div>
          ))}

          {/* ===================== CELESTIAL SKY =====================
              Sits at z1 — in front of the painted sky (z0), behind every
              mountain ridge (z2..7), so the ridges crop it like a real
              horizon. It's a `.hero-layer`, so the same rAF gives it a slow
              parallax (data-travel below the sky's so the moon lingers; tiny
              data-depth so it reads as very distant). Night ↔ day cross-fade
              on opacity. */}
          <div
            data-travel={-0.13}
            data-depth={3}
            className="hero-layer pointer-events-none absolute -inset-[8%]"
            style={{ zIndex: 1, willChange: "transform" }}
            aria-hidden
          >
            {/* ---------- NIGHT: glow + stars + shooting stars + moon ---------- */}
            <div
              className="absolute inset-0 transition-opacity duration-[1100ms] ease-in-out"
              style={{ opacity: day ? 0 : 1 }}
            >
              {/* Deepen the upper sky toward true NIGHT. The painted "night"
                  layer is really a bright blue-hour blue, so white stars wash
                  out against it. This deep-navy zenith → transparent-by-horizon
                  gradient turns the open sky to night (stars + moon glow pop),
                  while leaving the lower painting (mountains/lake) untouched. */}
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(6,10,28,0.80) 0%, rgba(8,13,32,0.58) 24%, rgba(10,16,38,0.28) 44%, rgba(10,16,38,0) 60%)",
                }}
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(44% 40% at 71% 15%, rgba(150,180,255,0.26), transparent 60%)",
                }}
              />
              {STARS.map((s, i) => (
                <span
                  key={i}
                  className="sky-star absolute rounded-full"
                  style={{
                    left: `${s.x}%`,
                    top: `${s.y}%`,
                    width: `${s.size}px`,
                    height: `${s.size}px`,
                    // @ts-expect-error custom prop
                    "--o": s.base,
                    animationDelay: `${s.delay}s`,
                    animationDuration: `${s.dur}s`,
                  }}
                />
              ))}
              {SHOOTERS.map((sh, i) => (
                <span
                  key={i}
                  className="sky-shooter"
                  style={{
                    top: sh.top,
                    left: sh.left,
                    animationDelay: sh.delay,
                    // @ts-expect-error custom prop
                    "--shoot-every": sh.every,
                  }}
                />
              ))}
              <div className="absolute" style={{ top: "11%", left: "71%" }}>
                <div className="sky-moon-disc" />
              </div>
            </div>

            {/* ---------- DAY: warm glow + drifting clouds + sun ---------- */}
            <div
              className="absolute inset-0 transition-opacity duration-[1100ms] ease-in-out"
              style={{ opacity: day ? 1 : 0 }}
            >
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(48% 44% at 70% 14%, rgba(255,216,140,0.42), transparent 58%)",
                }}
              />
              {CLOUDS.map((c, i) => (
                <span
                  key={i}
                  className="sky-cloud"
                  style={{
                    top: c.top,
                    width: `${c.w}vmin`,
                    height: `${c.w * 0.34}vmin`,
                    opacity: c.o,
                    animationDuration: c.dur,
                    animationDelay: c.delay,
                  }}
                />
              ))}
              <div className="sky-sun absolute" style={{ top: "9%", left: "71%" }}>
                <div className="sky-sun-rays" />
                <div className="sky-sun-disc" />
              </div>
            </div>
          </div>

          {/* Atmospheric haze — a soft glow band at the mid-horizon that makes
              the distant peaks RECEDE into air (the depth cue that sells the
              Firewatch diorama). zIndex 4 = in front of the far mountains
              (z0..4), behind the now-dark foreground (z5..7). Parallaxes
              gently; theme-tinted (warm day / cool night). */}
          <div
            data-travel={-0.04}
            data-depth={9}
            className="hero-layer pointer-events-none absolute -inset-[8%]"
            style={{ zIndex: 4, willChange: "transform" }}
            aria-hidden
          >
            <div
              className="absolute inset-0"
              style={{
                background: day
                  ? "linear-gradient(180deg, transparent 24%, rgba(255,198,122,0.32) 45%, rgba(255,168,88,0.11) 58%, transparent 72%)"
                  : "linear-gradient(180deg, transparent 27%, rgba(151,181,236,0.20) 46%, rgba(120,150,210,0.08) 59%, transparent 74%)",
              }}
            />
          </div>

          {/* Soft vignette — depth + text legibility. Theme-aware: a cool dark
              edge at night, a far gentler warm edge by day (a heavy dark
              vignette over the bright day sky reads as muddy). */}
          <div
            className="pointer-events-none absolute inset-0 z-[16]"
            style={{
              background: day
                ? "radial-gradient(130% 110% at 50% 26%, transparent 64%, rgba(40,30,10,0.22) 100%)"
                : "radial-gradient(130% 110% at 50% 28%, transparent 58%, rgba(5,8,18,0.42) 100%)",
            }}
          />
          {/* Bottom hand-off — a TALL, gentle melt of the lower scene into the
              page bg so the hero doesn't read as "the image just ends": the
              foreground/forest dissolves into var(--bg), and the next section
              emerges from that same clean field (seamless blend). Theme-aware. */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[17] h-[46%]"
            style={{
              background:
                "linear-gradient(180deg, transparent 0%, color-mix(in srgb, var(--bg) 32%, transparent) 44%, color-mix(in srgb, var(--bg) 78%, transparent) 74%, var(--bg) 100%)",
            }}
          />
        </div>

        {/* Identity — floats above every photo layer (z-20). Its fade /
            lift / scale on scroll is driven by the rAF loop (inline
            transform + opacity), so no transform utility classes here. */}
        <div
          ref={identityRef}
          className="hero-identity absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center will-change-transform"
        >
          <span
            data-hero
            className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.32em]"
            style={{ color: "#a9c6ff" }}
          >
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: "#4f9cff", boxShadow: "0 0 10px #4f9cff" }}
            />
            {HERO.eyebrow}
          </span>

          <h1
            id="hero-name"
            className="mt-5 font-display leading-[0.86] tracking-[-0.04em]"
            style={{
              fontWeight: 800,
              // Crisp legibility on BOTH the dark night sky and the bright day
              // sky — a tight dark edge + a small soft drop (NOT a 50px blur,
              // which showed as an ugly dark blob over the bright day scene).
              textShadow:
                "0 1px 2px rgba(0,0,0,0.6), 0 2px 10px rgba(0,0,0,0.45)",
            }}
          >
            <span data-hero className="block text-[clamp(3rem,12vw,8rem)] text-[#FF7A1A]">
              PRADIPTA
            </span>
            <span data-hero className="block text-[clamp(3rem,12vw,8rem)] text-[#eaf1ff]">
              JANA
            </span>
          </h1>

          <p
            data-hero
            className="mt-6 font-mono text-sm uppercase tracking-[0.28em]"
            style={{ color: "#c5d6f5" }}
          >
            <span className="opacity-50">role:: </span>
            <span ref={roleRef} className="text-[#4f9cff]" />
            <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-[#4f9cff] align-middle" />
          </p>

          <p
            data-hero
            className="mt-6 max-w-xl text-base leading-relaxed text-[#dbe6fb]/85 md:text-lg"
          >
            {profile.tagline}
          </p>

          <div
            data-hero
            className="mt-12 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.3em] text-[#c5d6f5]/70"
          >
            <span className="inline-block h-8 w-[1px] animate-pulse bg-white/40" />
            scroll to initialize
          </div>
        </div>
      </div>
    </section>
  );
}

export default HeroSection;
