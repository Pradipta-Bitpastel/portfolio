"use client";

import { KineticTitle } from "./KineticTitle";
import { cn } from "@/lib/cn";

export interface SectionHeaderProps {
  eyebrow: string;
  title: string;
  subtitle?: string;
  color: string;
  /** Giant ghost index drawn behind the title, e.g. "01". */
  index?: string;
  className?: string;
  titleClassName?: string;
}

/**
 * Shared section header: a color-keyed eyebrow tag, an optional giant
 * ghost index numeral, and the kinetic (per-char reveal) title. Keeps
 * every section's heading visually consistent.
 */
export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  color,
  index,
  className,
  titleClassName,
}: SectionHeaderProps) {
  return (
    <div className={cn("relative", className)}>
      {index ? (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-10 -left-2 select-none font-display text-[24vw] leading-none opacity-[0.04] md:text-[14rem]"
          style={{ fontWeight: 800 }}
        >
          {index}
        </span>
      ) : null}

      <span
        data-reveal
        className="relative inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.32em]"
        style={{ color }}
      >
        <span
          aria-hidden
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: color, boxShadow: `0 0 10px ${color}` }}
        />
        {eyebrow}
      </span>

      <KineticTitle
        as="h2"
        text={title}
        subtitle={subtitle}
        className="mt-4"
        titleClassName={cn("text-[clamp(2.5rem,8vw,6rem)]", titleClassName)}
      />
    </div>
  );
}

export default SectionHeader;
