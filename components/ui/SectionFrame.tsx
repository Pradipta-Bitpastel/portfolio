"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import { forwardRef } from "react";
import { cn } from "@/lib/cn";

/**
 * SectionFrame — shared section wrapper that keeps every scrolling
 * section's content INSIDE the global HudFrame border.
 *
 * The HudFrame draws a 1px border at `inset: 24px` and corner labels
 * sit at `inset: 32px`. Section content needs a clear gap from those
 * labels, so we pad each section by ~64px on every side so there's a
 * visible 32px breathing zone between the label row and the content.
 *
 * The padding uses `clamp()` so it shrinks gracefully on smaller
 * viewports while still leaving the frame visible.
 */
type SectionFrameProps = {
  id: string;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  ariaLabelledBy?: string;
  /**
   * If true, do NOT inject the default min-h-screen + flex/items-center
   * layout. Used by sections that need fully custom heights (Skills,
   * Projects).
   */
  bare?: boolean;
};

export const SectionFrame = forwardRef<HTMLElement, SectionFrameProps>(
  function SectionFrame(
    { id, children, className = "", style, ariaLabelledBy, bare = false },
    ref: Ref<HTMLElement>
  ) {
    return (
      <section
        id={id}
        ref={ref}
        aria-labelledby={ariaLabelledBy}
        className={cn(
          "relative w-full overflow-hidden",
          // Inside-the-frame padding. 24px frame + 8px gap to labels +
          // 32px breathing room = ~64px target on desktop.
          "px-[clamp(16px,5vw,96px)] py-[clamp(32px,5vh,120px)]",
          // min-h-[100svh] (small viewport units) accounts for iOS
          // Safari's collapsing address bar — using min-h-screen (100vh)
          // here causes content to jump as the URL bar shows/hides.
          !bare && "flex min-h-[100svh] items-center",
          className
        )}
        style={style}
      >
        {children}
      </section>
    );
  }
);

export default SectionFrame;
