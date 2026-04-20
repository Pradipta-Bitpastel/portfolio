"use client";

import { cn } from "@/lib/cn";

export interface SkillBarProps {
  name: string;
  level: number; // 0..100
  color: string;
  className?: string;
}

/**
 * Labelled horizontal progress bar for a single skill.
 *
 * The filled `.skillbar-fill` span exposes a `data-level` attribute so
 * GSAP timelines in SkillsSection can animate `width` from 0 -> level%
 * when the row enters view. Initial width is 0 so the anim is
 * authoritative; renders cleanly even without JS once CSS `width:
 * var(--level)` reads the inline style.
 *
 * The glow is a color-tinted box-shadow at ~40% alpha of the accent.
 */
export function SkillBar({ name, level, color, className }: SkillBarProps) {
  const clamped = Math.max(0, Math.min(100, level));
  const glow = `${color}66`; // ~40% alpha

  return (
    <div
      className={cn(
        "skillbar group flex w-full flex-col gap-1",
        className
      )}
    >
      <div className="flex items-baseline justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-ink-dim">
        <span className="truncate text-ink">{name}</span>
        <span style={{ color }}>{clamped}%</span>
      </div>
      <div
        className="skillbar-track relative h-1.5 w-full overflow-hidden rounded-full bg-white/5"
        style={{ borderColor: `${color}33` }}
      >
        <span
          className="skillbar-fill absolute left-0 top-0 h-full rounded-full"
          data-level={clamped}
          style={{
            width: "0%",
            background: `linear-gradient(90deg, ${color}, ${color}cc)`,
            boxShadow: `0 0 10px ${glow}, 0 0 20px ${glow}`,
          }}
        />
      </div>
    </div>
  );
}

export default SkillBar;
