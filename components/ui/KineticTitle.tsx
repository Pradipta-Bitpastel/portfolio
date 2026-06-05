"use client";

import {
  memo,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { gsap, registerAll, SplitText } from "@/lib/gsap";
import { cn } from "@/lib/cn";

/**
 * KineticTitle — a display heading whose characters rise + fade in,
 * staggered, the first time the heading scrolls into view. Uses GSAP
 * SplitText (free since 3.13) for the per-char split and reverts it on
 * unmount so the DOM text stays clean + accessible.
 *
 * `prefers-reduced-motion` collapses to a single soft fade.
 */
type KineticTitleProps = {
  text: string;
  subtitle?: string;
  className?: string;
  after?: ReactNode;
  style?: CSSProperties;
  titleClassName?: string;
  titleStyle?: CSSProperties;
  id?: string;
  as?: "h1" | "h2" | "h3";
};

function KineticTitleImpl({
  text,
  subtitle,
  className,
  after,
  style,
  titleClassName,
  titleStyle,
  id,
  as = "h2",
}: KineticTitleProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const subRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const textEl = textRef.current;
    if (!wrap || !textEl) return;

    let cancelled = false;
    let split: InstanceType<typeof SplitText> | null = null;
    let ctx: ReturnType<typeof gsap.context> | null = null;

    const boot = async () => {
      await registerAll();
      if (cancelled || !wrapRef.current) return;

      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      ctx = gsap.context(() => {
        if (reduced) {
          gsap.from([textEl, subRef.current].filter(Boolean), {
            opacity: 0,
            duration: 0.5,
            scrollTrigger: { trigger: wrap, start: "top 85%", once: true },
          });
          return;
        }

        split = new SplitText(textEl, { type: "chars" });
        gsap.from(split.chars, {
          opacity: 0,
          yPercent: 120,
          rotateX: -60,
          duration: 0.8,
          ease: "power3.out",
          stagger: 0.03,
          scrollTrigger: { trigger: wrap, start: "top 82%", once: true },
        });

        if (subRef.current) {
          gsap.from(subRef.current, {
            opacity: 0,
            y: 18,
            duration: 0.6,
            delay: 0.25,
            ease: "power2.out",
            scrollTrigger: { trigger: wrap, start: "top 82%", once: true },
          });
        }
      }, wrap);
    };

    void boot();

    return () => {
      cancelled = true;
      ctx?.revert();
      split?.revert();
    };
  }, [text, subtitle]);

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
        <span ref={textRef} className="block">
          {text}
        </span>
        {subtitle ? (
          // Readable subtitle: explicitly reset the inherited giant
          // title size/weight so it doesn't render as a wall of text.
          <span
            ref={subRef}
            className="mt-4 block max-w-2xl text-[clamp(0.95rem,1.5vw,1.2rem)] font-normal leading-relaxed tracking-normal text-ink-dim"
            style={{ fontWeight: 400 }}
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
