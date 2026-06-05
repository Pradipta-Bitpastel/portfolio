/**
 * Scroll progress (0..1) for the 3D showcase section, written by the
 * pinned ScrollTrigger and read each frame by the artifact model. Plain
 * singleton so the pinned section never re-renders on scroll (which would
 * fight GSAP's pin-spacer reparenting).
 */
export const showcaseStore = { progress: 0 };
