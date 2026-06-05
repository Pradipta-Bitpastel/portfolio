/**
 * Shared mutable state for the Universe-in-Numbers section. The section
 * (DOM, ScrollTrigger-pinned) writes these every scroll tick; the orb's
 * separate Canvas reads them every frame. Kept as a plain singleton so
 * neither side triggers React re-renders on scroll.
 */
export const metricsStore = {
  /** Active metric index. */
  index: 0,
  /** 0 = orb fully closed, 1 = fully split open (drives the gap). */
  open: 0,
  /** Upper-dome accent of the active metric (hex). */
  dome: "#9b5cff",
};
