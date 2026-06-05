"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, registerAll } from "@/lib/gsap";

/**
 * SYS.STACK — a velocity-driven tech-stack band that sits between METRICS
 * and the SKILLS module rig as a designed palette cleanser. Two counter-
 * scrolling rows give the band rhythm and depth; the typography is treated
 * (alternating weight, accent-tinted anchors, serif index numerals as
 * separators) so it reads as a composed marquee rather than a ticker.
 *
 * Implementation notes:
 *   - ONE rAF loop writes a single `translate3d(...) skewX(...)` transform
 *     per row (transform-only → compositor-cheap, no layout/reflow). Each
 *     track holds two copies of its list so wrapping at -50% is seamless.
 *   - Scroll velocity (from a passive ScrollTrigger) surges + skews both
 *     rows in opposite directions, then decays back to a calm base drift.
 *   - `prefers-reduced-motion` → fully static rows, no rAF, no skew.
 *   - The loop pauses while the band is off-screen (ScrollTrigger toggles a
 *     flag) so it never burns frames you can't see.
 */

type Item = { label: string; accent?: string };

// Truthful to content/skills.ts + profile — the stack actually owned/run.
const PRIMARY: ReadonlyArray<Item> = [
  { label: "React", accent: "var(--blue)" },
  { label: "Next.js" },
  { label: "TypeScript" },
  { label: "React Native", accent: "var(--cyan)" },
  { label: "Expo" },
  { label: "Node.js" },
  { label: "Django" },
  { label: "Tailwind", accent: "var(--blue)" },
  { label: "Redux" },
  { label: "React Query" },
];

const SECONDARY: ReadonlyArray<Item> = [
  { label: "Azure", accent: "var(--purple)" },
  { label: "GCP", accent: "var(--purple)" },
  { label: "CI / CD", accent: "var(--green)" },
  { label: "GitHub Actions" },
  { label: "Nginx" },
  { label: "Linux" },
  { label: "SSL / DNS" },
  { label: "OpenAI", accent: "var(--green)" },
  { label: "Gemini" },
  { label: "WordPress" },
];

function Row({
  items,
  trackRef,
  size,
  muted,
}: {
  items: ReadonlyArray<Item>;
  trackRef: React.RefObject<HTMLDivElement>;
  size: string;
  muted?: boolean;
}) {
  return (
    <div
      ref={trackRef}
      className="flex w-max items-baseline whitespace-nowrap will-change-transform"
    >
      {[...items, ...items].map((item, i) => {
        const n = i % items.length;
        return (
          <span key={i} className="flex shrink-0 items-baseline">
            {/* serif index numeral — editorial separator / typographic anchor */}
            <span
              className="font-serif italic leading-none"
              style={{
                fontSize: `calc(${size} * 0.42)`,
                color: item.accent ?? "var(--ink-faint)",
                opacity: item.accent ? 0.85 : 0.4,
                marginRight: "0.5em",
              }}
            >
              {String(n + 1).padStart(2, "0")}
            </span>
            <span
              className="select-none font-grotesk tracking-[-0.03em]"
              style={{
                fontSize: size,
                fontWeight: item.accent ? 700 : 500,
                lineHeight: 0.9,
                color: item.accent
                  ? item.accent
                  : muted
                    ? "color-mix(in srgb, var(--ink) 42%, transparent)"
                    : "color-mix(in srgb, var(--ink) 72%, transparent)",
                paddingRight: "0.9em",
              }}
            >
              {item.label}
            </span>
            {/* hairline tick between items for measured rhythm */}
            <span
              aria-hidden
              className="mr-[0.9em] inline-block h-[0.55em] w-px self-center"
              style={{ background: "var(--line)" }}
            />
          </span>
        );
      })}
    </div>
  );
}

export function StackMarquee() {
  const rootRef = useRef<HTMLElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const botRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const top = topRef.current;
    const bot = botRef.current;
    if (!top || !bot) return;

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      // Static visible end-state: center both rows, no transform churn.
      top.style.transform = "translate3d(-12%,0,0)";
      bot.style.transform = "translate3d(-26%,0,0)";
      return;
    }

    let cancelled = false;
    let rafId = 0;
    let st: ScrollTrigger | null = null;
    const clampSkew = gsap.utils.clamp(-10, 10);
    const wrap = gsap.utils.wrap(-50, 0); // seamless wrap in BOTH directions

    // Motion model: a slow constant base drift, plus a scroll-velocity
    // component that's *smoothed* so the rows ramp up as you scroll and ease
    // back down to the calm base when you stop. Velocity is signed, so the
    // scroll direction steers the rows (down → fan apart, up → converge).
    const BASE_TOP = 0.09; // %/frame — slow, readable idle drift (~5%/s)
    const BASE_BOT = 0.07;
    const SCROLL_GAIN = 0.00022; // scroll px/s → %/frame boost
    const xTop = { current: 0 };
    const xBot = { current: -25 };
    const rawVel = { current: 0 }; // latest scroll velocity from ScrollTrigger
    const vel = { current: 0 }; // smoothed velocity that actually drives motion
    const hover = { current: 0 }; // 0 = free, 1 = hovered (smoothed)
    let hovering = false;
    let onScreen = true;

    // Interaction: hovering the band eases it down so the labels are readable.
    const root = rootRef.current;
    const onEnter = () => (hovering = true);
    const onLeave = () => (hovering = false);
    root?.addEventListener("pointerenter", onEnter);
    root?.addEventListener("pointerleave", onLeave);

    const boot = async () => {
      await registerAll();
      if (cancelled) return;

      st = ScrollTrigger.create({
        trigger: rootRef.current ?? top,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => (rawVel.current = self.getVelocity()),
        onToggle: (self) => (onScreen = self.isActive),
      });

      const loop = () => {
        if (onScreen) {
          // Smooth toward the live velocity, then decay it toward rest so the
          // rows accelerate into a scroll and glide back down when it stops.
          vel.current += (rawVel.current - vel.current) * 0.08;
          rawVel.current *= 0.9;

          // Ease hover toward target → speed multiplier (hover ≈ 20% speed).
          hover.current += ((hovering ? 1 : 0) - hover.current) * 0.1;
          const ease = 1 - hover.current * 0.8;

          const boost = vel.current * SCROLL_GAIN; // signed → direction-aware

          // Top drifts left, bottom drifts right; the shared boost fans them
          // apart on scroll-down and pulls them together on scroll-up.
          xTop.current = wrap(xTop.current - (BASE_TOP + boost) * ease);
          xBot.current = wrap(xBot.current + (BASE_BOT + boost) * ease);

          const skew = clampSkew(vel.current * -0.0016);
          top.style.transform = `translate3d(${xTop.current}%,0,0) skewX(${skew}deg)`;
          bot.style.transform = `translate3d(${xBot.current}%,0,0) skewX(${-skew}deg)`;
        }
        rafId = requestAnimationFrame(loop);
      };
      rafId = requestAnimationFrame(loop);
    };

    void boot();

    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      st?.kill();
      root?.removeEventListener("pointerenter", onEnter);
      root?.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <section
      ref={rootRef}
      aria-hidden
      className="marquee-band relative w-full overflow-hidden py-12 sm:py-16"
    >
      {/* Hairline rules top + bottom — define the band as a deliberate strip. */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--line-strong)] to-transparent" />

      {/* HUD kicker — anchors the band in the dossier system. */}
      <div className="pointer-events-none absolute left-4 top-3 z-20 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-faint sm:left-8 sm:top-4">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: "var(--cyan)", boxShadow: "0 0 8px var(--cyan)" }}
        />
        SYS.STACK
      </div>
      <div className="pointer-events-none absolute right-4 top-3 z-20 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-faint sm:right-8 sm:top-4">
        20 NODES · LIVE
      </div>

      {/* Edge fades so the rows melt into the page rather than hard-cutting. */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-bg to-transparent sm:w-40" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-bg to-transparent sm:w-40" />

      <div className="flex flex-col gap-3 sm:gap-5">
        <Row
          items={PRIMARY}
          trackRef={topRef}
          size="clamp(2.4rem,6.5vw,5rem)"
        />
        <Row
          items={SECONDARY}
          trackRef={botRef}
          size="clamp(1.6rem,4.2vw,3.1rem)"
          muted
        />
      </div>
    </section>
  );
}

export default StackMarquee;
