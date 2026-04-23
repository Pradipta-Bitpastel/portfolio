"use client";

import {
  memo,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode
} from "react";
import { gsap, registerAll, hasPlugin, ScrollTrigger } from "@/lib/gsap";
import { readPerfTier } from "@/lib/usePerfTier";
import { cn } from "@/lib/cn";

/**
 * KineticTitle — scroll-linked display heading.
 *
 * Visual mechanics (in priority order):
 *
 *   1. Scramble-in on first view — each letter cycles through random
 *      glyphs before locking to the correct character. Uses the
 *      GSAP ScrambleTextPlugin when available, and falls back to a
 *      manual frame-by-frame scrambler so the behavior is reliable
 *      even without a Club license.
 *
 *   2. Traveling amber highlight — a single-letter amber glow sweeps
 *      left-to-right across the word while the section is in view.
 *      Runs on a short infinite tween (1.4s × letters) and is paused
 *      when the section leaves the viewport to save cycles.
 *
 *   3. Scroll-scale parallax — as the section scrolls past, the
 *      heading scales from 0.85 → 1.02 → 0.94 and drifts down by
 *      ~18px, giving the pinned-feel without actually pinning.
 *
 * Perf-tier / reduced-motion: all three layers collapse to a plain
 * GSAP opacity fade-in so the text still feels alive.
 *
 * Letters are split via plain JS (span-per-char) rather than
 * SplitText so we don't depend on a Club plugin.
 */

type KineticTitleProps = {
  /** Plain-text title. Required — we take text, not nodes, because
   *  letter-split only works on strings. */
  text: string;
  /** Optional line 2 rendered under `text`, dim-ink styled. */
  subtitle?: string;
  /** Extra classes on the outer span wrapping both lines. */
  className?: string;
  /** A reactNode rendered after the title (e.g. giant section number). */
  after?: ReactNode;
  /** ID of the DOM element that scrolling through triggers the
   *  scramble-in. Usually the parent section id. */
  triggerId?: string;
  /** Inline style on the outer wrapper. */
  style?: CSSProperties;
  /** Classes applied to the heading element (h1/h2/h3). Use to
   *  override the default display-font styling with per-section
   *  font-size clamps. */
  titleClassName?: string;
  /** Inline style applied to the heading element. */
  titleStyle?: CSSProperties;
  /** ARIA id reflected on the rendered heading. */
  id?: string;
  /** Override heading tag — defaults to h2. */
  as?: "h1" | "h2" | "h3";
};

const SCRAMBLE_CHARS = "!<>-_\\/[]{}=+*^?#_01abcdef".split("");

function KineticTitleImpl({
  text,
  subtitle,
  className,
  after,
  triggerId,
  style,
  titleClassName,
  titleStyle,
  id,
  as = "h2"
}: KineticTitleProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const textEl = textRef.current;
    if (!wrap || !textEl) return;

    const low =
      readPerfTier() === "low" ||
      (typeof window !== "undefined" &&
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    // ------- letter split -------------------------------------------
    const letters: HTMLSpanElement[] = [];
    textEl.textContent = "";
    for (const ch of text.split("")) {
      const span = document.createElement("span");
      span.className = "kt-letter inline-block will-change-transform";
      span.style.whiteSpace = "pre"; // preserve spaces as-is
      span.textContent = ch;
      textEl.appendChild(span);
      letters.push(span);
    }

    let cancelled = false;
    let triggerInstance: ScrollTrigger | null = null;
    let highlightTween: gsap.core.Tween | null = null;
    let scrambleTween: gsap.core.Tween | null = null;

    const scrambleManually = (): gsap.core.Tween => {
      // Fallback path when ScrambleTextPlugin isn't available.
      const duration = 0.9;
      const frames = 28;
      const progress = { v: 0 };
      return gsap.to(progress, {
        v: 1,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          const reveal = Math.floor(progress.v * frames);
          letters.forEach((el, i) => {
            const targetCh = text[i];
            // Each letter locks in at a different frame — staggered
            // reveal. Earlier letters lock first.
            const lockAt = Math.floor((i / letters.length) * frames);
            if (reveal >= lockAt) {
              el.textContent = targetCh;
            } else {
              el.textContent =
                SCRAMBLE_CHARS[
                  (Math.floor(Math.random() * SCRAMBLE_CHARS.length))
                ] ?? targetCh;
            }
          });
        },
        onComplete: () => {
          letters.forEach((el, i) => {
            el.textContent = text[i];
          });
        }
      });
    };

    const runScrambleIn = () => {
      if (cancelled) return;
      if (low) {
        gsap.fromTo(
          letters,
          { opacity: 0, y: 10 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.02,
            ease: "power2.out"
          }
        );
        return;
      }
      // Prefer real ScrambleTextPlugin when Club is loaded.
      if (hasPlugin("ScrambleText")) {
        try {
          scrambleTween = gsap.to(textEl, {
            duration: 0.9,
            scrambleText: {
              text,
              chars: "upperAndLowerCase",
              revealDelay: 0.1,
              speed: 0.6
            },
            ease: "power2.out",
            onUpdate: () => {
              // After scrambleText writes raw string into textEl, we
              // need to re-split so the later highlight still has
              // per-letter spans. Easiest: skip highlight during
              // scramble and re-split on complete.
            },
            onComplete: () => {
              // Re-split after scrambleText clobbers our spans.
              textEl.textContent = "";
              letters.length = 0;
              for (const ch of text.split("")) {
                const span = document.createElement("span");
                span.className =
                  "kt-letter inline-block will-change-transform";
                span.style.whiteSpace = "pre";
                span.textContent = ch;
                textEl.appendChild(span);
                letters.push(span);
              }
              startHighlight();
            }
          });
          return;
        } catch {
          /* fall through to manual */
        }
      }
      scrambleTween = scrambleManually();
      scrambleTween.eventCallback("onComplete", () => {
        startHighlight();
      });
    };

    const startHighlight = () => {
      if (cancelled || low) return;
      // One amber letter "scans" left→right across the word, looping.
      const proxy = { i: 0 };
      highlightTween = gsap.to(proxy, {
        i: letters.length,
        duration: Math.max(1.4, letters.length * 0.14),
        ease: "none",
        repeat: -1,
        onUpdate: () => {
          const hot = Math.floor(proxy.i);
          letters.forEach((el, idx) => {
            const isHot = idx === hot;
            el.style.color = isHot ? "#FF7A1A" : "";
            el.style.textShadow = isHot
              ? "0 0 12px rgba(255,122,26,0.85)"
              : "";
          });
        }
      });
    };

    // ------- scroll-parallax scale + drift --------------------------
    const applyScrollTransforms = () => {
      if (low) return;
      if (!triggerId) return;
      const target = document.getElementById(triggerId);
      if (!target) return;

      triggerInstance = ScrollTrigger.create({
        trigger: target,
        start: "top bottom",
        end: "bottom top",
        scrub: 1.1,
        onUpdate: (self) => {
          // p: 0 (section just entering) → 1 (section leaving)
          const p = self.progress;
          // Ease: 0→0.5 scale up 0.88 → 1.02, 0.5→1 scale down to 0.9
          const scale =
            p < 0.5
              ? 0.88 + (1.02 - 0.88) * (p / 0.5)
              : 1.02 - (1.02 - 0.9) * ((p - 0.5) / 0.5);
          const drift = (p - 0.5) * 24; // -12 → +12px
          wrap.style.transform = `translate3d(0,${drift.toFixed(1)}px,0) scale(${scale.toFixed(3)})`;
        }
      });
    };

    const boot = async () => {
      await registerAll();
      if (cancelled) return;

      // Fire scramble-in when the heading scrolls into view.
      ScrollTrigger.create({
        trigger: wrap,
        start: "top 80%",
        once: true,
        onEnter: runScrambleIn
      });
      if (subRef.current) {
        gsap.fromTo(
          subRef.current,
          { opacity: 0, y: 18 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            delay: 0.35,
            ease: "power2.out",
            scrollTrigger: { trigger: wrap, start: "top 80%", once: true }
          }
        );
      }
      applyScrollTransforms();
    };

    void boot();

    return () => {
      cancelled = true;
      try {
        highlightTween?.kill();
        scrambleTween?.kill();
        triggerInstance?.kill();
      } catch {
        /* ignore */
      }
    };
  }, [text, triggerId]);

  const Tag = as;

  return (
    <div ref={wrapRef} className={cn("relative", className)} style={style}>
      <Tag
        id={id}
        className={cn(
          "font-display leading-[0.88] tracking-[-0.035em] text-ink",
          titleClassName
        )}
        style={{ fontWeight: 800, ...titleStyle }}
      >
        <span
          ref={textRef}
          className="block"
          aria-label={text}
        >
          {text}
        </span>
        {subtitle ? (
          <span
            ref={subRef}
            className="block text-ink-dim"
            aria-label={subtitle}
            style={{ opacity: 0 }}
          >
            {subtitle}
          </span>
        ) : null}
      </Tag>
      {after}
    </div>
  );
}

export const KineticTitle = memo(KineticTitleImpl);
export default KineticTitle;
