import type * as THREE from "three";

/**
 * Scene poses — the cinnamon-style choreography config.
 *
 * Each pose defines, per section, where the core + camera sit AND
 * where each of the five module satellites ends up in world space.
 * SceneDock scrubs a master GSAP timeline across the whole document
 * and interpolates every object toward the current section's pose.
 *
 * The existing `Modules` component still spins the rig every frame;
 * we write the per-module position/rotation/scale on top so the
 * orbit-motion + pose-tween compose: modules DRIFT within their
 * section formation rather than snap between fixed coordinates.
 *
 * Rationale for each formation:
 *   - hero     — standard 5-module orbit around the core (intro)
 *   - about    — modules pull back + dim, core dominates foreground
 *   - skills   — modules elongate into a tall vertical totem on the
 *                 LEFT so the skill bars on the right stay readable
 *   - projects — modules stretch into a WIDE horizontal bar behind
 *                 the pinned projects carousel (runway lights)
 *   - exp      — modules collapse into a vertical TIMELINE next to
 *                 the glowing ring
 *   - contact  — modules converge to a tight cluster near the core,
 *                 signal coalescing before "transmit"
 *
 * All positions are in world units (the R3F scene uses 1u ≈ 1m).
 */

export type ModuleId = "frontend" | "backend" | "devops" | "cloud" | "mobile";

export type ModulePose = {
  /** World-space position override for the module group. */
  pos: [number, number, number];
  /** Scale multiplier applied to the module's inner group. */
  scale: number;
  /** 0..1 — drives emissiveIntensity + material.opacity on the
   *  primary mesh so off-section modules fade without vanishing. */
  brightness: number;
};

export type ScenePose = {
  id: "hero" | "about" | "skills" | "projects" | "exp" | "contact";
  /** DevStation (core group) — where the laptop sits. */
  core: {
    pos: [number, number, number];
    rotX: number;
    rotY: number;
    rotZ: number;
    scale: number;
  };
  /** Camera world position — lookAt is always origin. */
  cam: [number, number, number];
  /** FOV override — bigger = more dramatic, more fisheye. */
  fov: number;
  /** Per-module formation point. Missing → keep previous. */
  modules: Record<ModuleId, ModulePose>;
};

const RIM = 3.0;
const LOW = -2.0;
const HIGH = 2.0;

export const SCENE_POSES: ScenePose[] = [
  // ─── 01. HERO ────────────────────────────────────────────────────
  // Laptop rotated slightly, modules spread 72° apart at rim radius.
  {
    id: "hero",
    core: { pos: [2.2, -0.1, 0.0], rotX: 0.05, rotY: -0.12, rotZ: 0, scale: 1.55 },
    cam: [0.0, 0.1, 8.0],
    fov: 45,
    modules: {
      frontend: { pos: [ Math.cos(0)              * RIM, 0.30, Math.sin(0)              * RIM], scale: 1.0, brightness: 1.0 },
      backend:  { pos: [ Math.cos(Math.PI * 0.4)  * RIM, -0.20, Math.sin(Math.PI * 0.4)  * RIM], scale: 1.0, brightness: 1.0 },
      devops:   { pos: [ Math.cos(Math.PI * 0.8)  * RIM, 0.40, Math.sin(Math.PI * 0.8)  * RIM], scale: 1.0, brightness: 1.0 },
      cloud:    { pos: [ Math.cos(Math.PI * 1.2)  * RIM, -0.30, Math.sin(Math.PI * 1.2)  * RIM], scale: 1.0, brightness: 1.0 },
      mobile:   { pos: [ Math.cos(Math.PI * 1.6)  * RIM, 0.20, Math.sin(Math.PI * 1.6)  * RIM], scale: 1.0, brightness: 1.0 }
    }
  },
  // ─── 02. ABOUT ───────────────────────────────────────────────────
  // Core pushed right, modules retreat to background and dim — so the
  // bio copy on the left stays the focal point.
  {
    id: "about",
    core: { pos: [3.4, 0.25, -0.4], rotX: 0.10, rotY: -0.38, rotZ: 0, scale: 0.92 },
    cam: [-0.3, 0.25, 6.2],
    fov: 42,
    modules: {
      frontend: { pos: [ 4.0,  1.6, -4.5], scale: 0.55, brightness: 0.35 },
      backend:  { pos: [ 5.5, -1.4, -4.0], scale: 0.55, brightness: 0.35 },
      devops:   { pos: [ 2.0, -2.4, -5.0], scale: 0.55, brightness: 0.35 },
      cloud:    { pos: [ 6.0,  0.6, -5.5], scale: 0.55, brightness: 0.35 },
      mobile:   { pos: [ 3.0,  2.4, -5.0], scale: 0.55, brightness: 0.35 }
    }
  },
  // ─── 03. SKILLS ──────────────────────────────────────────────────
  // Modules stack into a VERTICAL TOTEM on the left. Each module
  // becomes a "skill block" floating in a column. Core drifts right.
  {
    id: "skills",
    core: { pos: [3.2, 0.0, -0.8], rotX: 0.0, rotY: 0.45, rotZ: 0, scale: 0.75 },
    cam: [0.6, 0.2, 7.2],
    fov: 50,
    modules: {
      mobile:   { pos: [-4.2,  2.2, -0.5], scale: 0.65, brightness: 1.0 },
      frontend: { pos: [-4.2,  1.1, -0.5], scale: 0.65, brightness: 1.0 },
      backend:  { pos: [-4.2,  0.0, -0.5], scale: 0.65, brightness: 1.0 },
      devops:   { pos: [-4.2, -1.1, -0.5], scale: 0.65, brightness: 1.0 },
      cloud:    { pos: [-4.2, -2.2, -0.5], scale: 0.65, brightness: 1.0 }
    }
  },
  // ─── 04. PROJECTS ────────────────────────────────────────────────
  // The SVG visual pane (right col-span-6) is the FEATURED subject
  // here — the 3D laptop is hidden by shrinking to scale 0.001
  // (subpixel, effectively invisible). Position is set to match the
  // EXPERIENCE pose so that:
  //   - entering projects = laptop flies left from skills and
  //     vanishes in place (smooth "swish away")
  //   - exiting projects to experience = laptop materializes in
  //     place and grows from 0 to full (no flying across screen)
  // Modules are also shrunk and dimmed to near-zero.
  {
    id: "projects",
    core: { pos: [-3.2, -0.3, 0.2], rotX: 0.0, rotY: -0.3, rotZ: 0, scale: 0.001 },
    cam: [0.0, 0.3, 8.5],
    fov: 48,
    modules: {
      mobile:   { pos: [-3.2, -0.3, 0.2], scale: 0.001, brightness: 0.0 },
      frontend: { pos: [-3.2, -0.3, 0.2], scale: 0.001, brightness: 0.0 },
      backend:  { pos: [-3.2, -0.3, 0.2], scale: 0.001, brightness: 0.0 },
      devops:   { pos: [-3.2, -0.3, 0.2], scale: 0.001, brightness: 0.0 },
      cloud:    { pos: [-3.2, -0.3, 0.2], scale: 0.001, brightness: 0.0 }
    }
  },
  // ─── 05. EXPERIENCE ──────────────────────────────────────────────
  // Modules collapse into a vertical timeline stack on the RIGHT,
  // mirroring the spinning timeline ring already in the scene.
  {
    id: "exp",
    core: { pos: [-3.2, -0.3, 0.2], rotX: 0.0, rotY: -0.55, rotZ: 0, scale: 0.82 },
    cam: [-0.4, 0.8, 7.0],
    fov: 48,
    modules: {
      frontend: { pos: [ 4.0,  HIGH * 0.9, -0.2], scale: 0.5, brightness: 0.9 },
      backend:  { pos: [ 4.2,  1.0,        -0.2], scale: 0.5, brightness: 0.9 },
      devops:   { pos: [ 4.4,  0.0,        -0.2], scale: 0.5, brightness: 0.9 },
      cloud:    { pos: [ 4.2, -1.0,        -0.2], scale: 0.5, brightness: 0.9 },
      mobile:   { pos: [ 4.0,  LOW * 0.9,  -0.2], scale: 0.5, brightness: 0.9 }
    }
  },
  // ─── 06. CONTACT ─────────────────────────────────────────────────
  // Final convergence — core centered + shrunk, modules pull tight
  // into a cluster right in front of the camera. "Signal coalescing".
  {
    id: "contact",
    core: { pos: [0.0, 0.0, 0.0], rotX: 0.0, rotY: 0.0, rotZ: 0, scale: 0.55 },
    cam: [0.0, 0.0, 8.5],
    fov: 45,
    modules: {
      frontend: { pos: [ 0.9,  0.9, 1.2], scale: 0.45, brightness: 1.0 },
      backend:  { pos: [-0.9,  0.9, 1.2], scale: 0.45, brightness: 1.0 },
      devops:   { pos: [ 0.0,  1.3, 1.4], scale: 0.45, brightness: 1.0 },
      cloud:    { pos: [ 0.9, -0.9, 1.2], scale: 0.45, brightness: 1.0 },
      mobile:   { pos: [-0.9, -0.9, 1.2], scale: 0.45, brightness: 1.0 }
    }
  }
];

/**
 * Given a world-space target and the module group's parent (the
 * rotating rig in `Modules`), compute the local-space position that
 * will put the module at the world target. The rig rotates around Y,
 * so this is effectively an inverse Y-rotation on (x, z).
 */
export function worldToRigLocal(
  worldX: number,
  worldY: number,
  worldZ: number,
  rigRotationY: number
): [number, number, number] {
  const cos = Math.cos(-rigRotationY);
  const sin = Math.sin(-rigRotationY);
  const lx = worldX * cos - worldZ * sin;
  const lz = worldX * sin + worldZ * cos;
  return [lx, worldY, lz];
}

/** Human-friendly section-id → pose-index lookup. */
export const POSE_INDEX: Record<ScenePose["id"], number> = {
  hero: 0,
  about: 1,
  skills: 2,
  projects: 3,
  exp: 4,
  contact: 5
};

/** Lerp helper used by the scrub handler. Stays allocation-free. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * The DOM section ids (HTML ids) paired with their pose index. The
 * experience section uses id="experience" in the DOM but "exp" in the
 * pose config — this array is the mapping of record.
 */
export const SECTION_TO_POSE: Array<{
  sectionId: string;
  poseIndex: number;
}> = [
  { sectionId: "hero",       poseIndex: 0 },
  { sectionId: "about",      poseIndex: 1 },
  { sectionId: "skills",     poseIndex: 2 },
  { sectionId: "projects",   poseIndex: 3 },
  { sectionId: "experience", poseIndex: 4 },
  { sectionId: "contact",    poseIndex: 5 }
];

/**
 * Apply brightness to a module's primary mesh material. Extracted so
 * the SceneDock can call it per-frame without allocating.
 */
export function applyBrightness(
  mesh: THREE.Mesh | null,
  brightness: number
): void {
  if (!mesh) return;
  const raw = mesh.material;
  const mat = Array.isArray(raw) ? raw[0] : raw;
  if (!mat) return;
  const any = mat as THREE.Material & {
    emissiveIntensity?: number;
    opacity?: number;
    transparent?: boolean;
  };
  any.transparent = true;
  if (typeof any.emissiveIntensity === "number") {
    any.emissiveIntensity = 0.2 + brightness * 0.8;
  }
  if (typeof any.opacity === "number") {
    any.opacity = 0.35 + brightness * 0.65;
  }
}
