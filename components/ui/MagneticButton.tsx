"use client";

import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode
} from "react";
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef
} from "react";
import { gsap } from "gsap";
import { cn } from "@/lib/cn";

/**
 * Magnetic button — translates its element toward the cursor on
 * pointermove and eases back to origin on pointerleave. Uses
 * `gsap.quickTo` for smooth, per-frame writes.
 *
 * Polymorphic: pass `href` to render an anchor; otherwise a button.
 * Strength is the max px the button can drift (default 14).
 */

type CommonProps = {
  className?: string;
  children?: ReactNode;
  strength?: number;
};

type BtnProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "type"> & {
    href?: undefined;
    type?: ButtonHTMLAttributes<HTMLButtonElement>["type"];
  };

type AnchorProps = CommonProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
  };

export type MagneticButtonProps = BtnProps | AnchorProps;

export const MagneticButton = forwardRef<
  HTMLElement,
  MagneticButtonProps
>(function MagneticButton(props, forwardedRef) {
  const { className, children, strength = 14, ...rest } = props;
  const localRef = useRef<HTMLElement | null>(null);
  useImperativeHandle(forwardedRef, () => localRef.current as HTMLElement);

  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    const qx = gsap.quickTo(el, "x", { duration: 0.4, ease: "power3.out" });
    const qy = gsap.quickTo(el, "y", { duration: 0.4, ease: "power3.out" });

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      // Normalize by half-size so the pull is proportional, then clamp.
      const nx = Math.max(-1, Math.min(1, dx / (rect.width / 2)));
      const ny = Math.max(-1, Math.min(1, dy / (rect.height / 2)));
      qx(nx * strength);
      qy(ny * strength);
    };
    const onLeave = () => {
      qx(0);
      qy(0);
    };

    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, [strength]);

  const classes = cn(
    "magnetic-button inline-flex items-center justify-center will-change-transform",
    className
  );

  if ("href" in props && props.href !== undefined) {
    const anchorProps = rest as AnchorHTMLAttributes<HTMLAnchorElement>;
    return (
      <a
        {...anchorProps}
        ref={(node) => {
          localRef.current = node;
        }}
        className={classes}
      >
        {children}
      </a>
    );
  }

  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      {...buttonProps}
      ref={(node) => {
        localRef.current = node;
      }}
      className={classes}
    >
      {children}
    </button>
  );
});

export default MagneticButton;
