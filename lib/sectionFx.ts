/**
 * Per-section scroll-driven values for the in-section 3D models. The
 * sections (DOM, ScrollTrigger) write these on scroll; the section's own
 * lazy Canvas reads them every frame. Plain singleton → no re-renders.
 */
export const sectionFx = {
  /** About capsule: 0 = sealed, 1 = fully opened. */
  aboutOpen: 0,
  /** Skills carousel position, 0..(modules-1), continuous. */
  skillsPos: 0,
};
