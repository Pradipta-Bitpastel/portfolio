"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface ModuleBadgeProps {
  label: string;
  color: string;
  icon?: ReactNode;
  className?: string;
}

/**
 * A HUD chip showing the active module name. Colored left bar +
 * optional icon + monospaced, tracked label. Used at the top of each
 * Skills sub-slide and as a general section tag.
 */
export function ModuleBadge({
  label,
  color,
  icon,
  className
}: ModuleBadgeProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-md border border-white/10 bg-white/5 pr-3 font-mono text-xs uppercase tracking-[0.2em] text-ink",
        "backdrop-blur-sm",
        className
      )}
      style={{
        boxShadow: `0 0 18px ${color}22`
      }}
    >
      <span
        aria-hidden
        className="h-5 w-1 rounded-l-md"
        style={{ background: color, boxShadow: `0 0 10px ${color}99` }}
      />
      {icon ? (
        <span className="text-sm" style={{ color }}>
          {icon}
        </span>
      ) : null}
      <span className="py-1" style={{ color }}>
        {label}
      </span>
    </div>
  );
}

export default ModuleBadge;
