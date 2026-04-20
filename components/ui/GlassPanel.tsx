import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface GlassPanelProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
}

/**
 * Frosted-glass card primitive. Tailwind-only: white-on-transparent
 * fill, heavy blur, 1-px inner border and a soft cyan/blue glow halo.
 * Callers can pass a `className` to override spacing, radius, etc.
 */
export function GlassPanel({
  children,
  className,
  ...rest
}: GlassPanelProps) {
  return (
    <div
      {...rest}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl",
        "shadow-[0_0_40px_rgba(79,156,255,0.15)]",
        "px-6 py-5",
        className
      )}
    >
      {children}
    </div>
  );
}

export default GlassPanel;
