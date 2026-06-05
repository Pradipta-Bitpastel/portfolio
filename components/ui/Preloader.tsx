"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";

/**
 * SYS.PRELOAD — a one-shot, full-screen boot sequence that frames the
 * whole site as a system powering on. It runs entirely client-side and
 * overlays everything (the lazy 3D Canvas loads *underneath* it, so the
 * wait becomes part of the show).
 *
 * Behaviour:
 *   - A 000 → 100 counter + streaming boot lines + a fill bar.
 *   - Then a curtain wipe up (`yPercent: -100`) revealing the hero.
 *   - Scroll is locked while it's visible so the reveal lands at the top.
 *   - `prefers-reduced-motion` collapses it to a brief fade (no counter
 *     animation, no curtain slide) so motion-sensitive users aren't held.
 *
 * It is mounted ONCE per page load (single-page site). It removes itself
 * from the tree on completion so it costs nothing afterwards.
 */

const BOOT_LINES = [
  "> mounting filesystem … ok",
  "> linking [ web · mobile · cloud ] … ok",
  "> warming runtime · next 14.2 … ok",
  "> core online",
];

const ACCENT = "#FF7A1A";

export function Preloader() {
  const rootRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const counter = counterRef.current;
    if (!root) return;

    // Lock scroll while the curtain is up — WITHOUT a layout shift. Plain
    // `overflow:hidden` removes the scrollbar, which widens the page; the
    // hero would then jump sideways the instant the curtain lifts. Reserve
    // the lost scrollbar width as padding so the reveal stays rock-steady.
    // (On overlay-scrollbar systems scrollbarW is 0 → no padding, no change.)
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    const prevPaddingRight = html.style.paddingRight;
    const scrollbarW = window.innerWidth - html.clientWidth;
    html.style.overflow = "hidden";
    if (scrollbarW > 0) html.style.paddingRight = `${scrollbarW}px`;
    const restoreLock = () => {
      html.style.overflow = prevOverflow;
      html.style.paddingRight = prevPaddingRight;
    };

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let ctx: ReturnType<typeof gsap.context> | null = null;

    const finish = () => {
      restoreLock();
      setDone(true);
    };

    if (reduced) {
      // Brief, motion-free dismissal.
      if (counter) counter.textContent = "100";
      const t = window.setTimeout(() => {
        gsap.to(root, { autoAlpha: 0, duration: 0.3, onComplete: finish });
      }, 320);
      return () => {
        window.clearTimeout(t);
        restoreLock();
      };
    }

    ctx = gsap.context(() => {
      const count = { v: 0 };
      const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } });

      tl.to(count, {
        v: 100,
        duration: 2.0,
        onUpdate: () => {
          if (counter) {
            counter.textContent = String(Math.round(count.v)).padStart(3, "0");
          }
        },
      });
      tl.fromTo(
        ".preload-row",
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, stagger: 0.42, duration: 0.4 },
        0
      );
      tl.fromTo(
        ".preload-bar",
        { scaleX: 0 },
        { scaleX: 1, duration: 2.0 },
        0
      );
      // Curtain up — but only once the web fonts have actually swapped in, so
      // the hero reveals in its FINAL typography. Lifting on a blind timer
      // can expose the headline in the fallback font for a frame, then reflow
      // to Oxanium (FOUT) right as it appears — that's the reveal flicker.
      // A GSAP delayedCall caps the wait so a stalled fonts.ready can't hang
      // the boot screen (and it's auto-killed with the context on unmount).
      tl.call(
        () => {
          let lifted = false;
          const lift = () => {
            if (lifted) return;
            lifted = true;
            cap.kill();
            gsap.to(root, {
              yPercent: -100,
              duration: 0.85,
              ease: "power4.inOut",
              onComplete: finish,
            });
          };
          const cap = gsap.delayedCall(1.2, lift); // safety ceiling
          const fontsReady =
            typeof document !== "undefined" && "fonts" in document
              ? document.fonts.ready
              : Promise.resolve();
          void fontsReady.then(lift);
        },
        undefined,
        "+=0.25"
      );
    }, root);

    return () => {
      ctx?.revert();
      restoreLock();
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={rootRef}
      // Above the HUD frame (z-60) and everything else.
      className="fixed inset-0 z-[100] flex flex-col justify-end bg-black p-6 font-mono will-change-transform sm:p-10"
      style={{ color: ACCENT }}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="mb-6 space-y-1">
        {BOOT_LINES.map((line) => (
          <div key={line} className="preload-row text-[11px] opacity-0 sm:text-sm">
            {line}
          </div>
        ))}
      </div>

      <div className="flex items-end justify-between">
        <span
          ref={counterRef}
          className="font-display text-6xl leading-none tabular-nums sm:text-8xl"
          style={{ fontWeight: 800 }}
        >
          000
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em] opacity-60">
          SYS.PRELOAD
        </span>
      </div>

      <div className="mt-4 h-px w-full overflow-hidden bg-white/10">
        <div
          className="preload-bar h-full origin-left"
          style={{ background: ACCENT, transform: "scaleX(0)" }}
        />
      </div>
    </div>
  );
}

export default Preloader;
