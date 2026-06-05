import * as THREE from "three";

/**
 * Scene poses — one per section. The 3D centerpiece is a single
 * shader-displaced "Reactive Core". As the page scrolls, a normalized
 * progress value (0..1, from `sceneStore.progress`) is mapped onto this
 * curve and every visual property is damped toward the sampled target
 * in the render loop. No GSAP tween touches THREE objects, so there is
 * no scrub lag — the core simply morphs, recolors and dollies as you go.
 *
 * Colors mirror the section accent palette in `lib/sections.ts`.
 */
export interface ScenePose {
  /** Core + particle accent color. */
  color: THREE.Color;
  /** Noise displacement amplitude on the core surface. */
  displaceAmp: number;
  /** Noise frequency — higher = tighter, busier surface. */
  displaceFreq: number;
  /** Idle rotation speed of the core (rad/s). */
  rotSpeed: number;
  /** Camera offset on X — drives the per-section orbit. */
  camX: number;
  /** Camera offset on Y (height). */
  camY: number;
  /** Camera distance on Z. */
  camZ: number;
  /** Y height the camera looks at (the subject's torso line). */
  lookY: number;
  /** Particle field dispersion multiplier. */
  particleSpread: number;
  /** Traveling model world position [x, y, z]. */
  pos: readonly [number, number, number];
  /** Traveling model Euler rotation [x, y, z] (radians). */
  rot: readonly [number, number, number];
  /** Traveling model uniform scale. */
  scale: number;
}

const c = (hex: string) => new THREE.Color(hex);

/**
 * One waypoint per section. The camera X/Y/Z + lookY together trace a
 * continuous cinematic journey around the character:
 *   far observe → dolly in (left) → orbit right → recede broad →
 *   orbit left → pull back centred.
 * The accent color still tints the rim light + particle field per
 * section, preserving the original "recolor as you scroll" identity.
 */
export const SCENE_POSES: readonly ScenePose[] = [
  // 01 hero / boot — far, slightly high, observing.
  //     The robot is COMPOSITED INTO the Firewatch hero: the ambient canvas
  //     sits at z-10, BETWEEN the mid ridges (z<10) and the foreground trees
  //     (z 12/13), so the trees occlude its feet — it stands GROUNDED in the
  //     valley on the RIGHT, opposite the hiker on the left cliff, yawed to
  //     face the name. This pose 0 IS its on-screen hero placement; keep its
  //     feet low enough that the foreground silhouettes cover them.
  { color: c("#4f9cff"), displaceAmp: 0.20, displaceFreq: 1.6, rotSpeed: 0.16, camX: 0.0,  camY: 0.7, camZ: 8.4, lookY: 0.05, particleSpread: 1.0,
    pos: [2.2, -0.15, 0.05], rot: [0.14, -0.58, 0.04], scale: 1.0 },
  // NOTE (margins pass): in the lower sections the robot is a small TRAVELING
  // ACCENT, not a mascot — it drifts through the UPPER margin / side corners,
  // pushed BACK (negative z) and SMALL (scale ~0.55–0.75), alternating
  // left/right so it still visibly journeys without sitting on top of the
  // editorial text. (The hero pose 0 above is the only large/grounded one.)
  // 02 about / init — small, settle into the CENTER starfield strip (the
  //     bio is on the left, the telemetry card on the right; keep OFF both).
  { color: c("#9b5cff"), displaceAmp: 0.12, displaceFreq: 2.2, rotSpeed: 0.10, camX: -1.6, camY: 0.4, camZ: 6.2, lookY: 0.15, particleSpread: 0.85,
    pos: [0.0, 0.8, -0.4], rot: [-0.05, 0.4, -0.05], scale: 0.45 },
  // 03 skills / activation — small, drift center of the skill rows.
  { color: c("#00d4ff"), displaceAmp: 0.30, displaceFreq: 2.9, rotSpeed: 0.30, camX: 2.4,  camY: 0.9, camZ: 6.0, lookY: 0.25, particleSpread: 1.3,
    pos: [-0.8, 1.2, -0.6], rot: [0.1, -0.7, 0.14], scale: 0.45 },
  // 04 projects / execution — recede HIGH above the horizontal cards.
  { color: c("#ff8a3c"), displaceAmp: 0.16, displaceFreq: 1.5, rotSpeed: 0.18, camX: 0.0,  camY: 0.2, camZ: 9.2, lookY: 0.0,  particleSpread: 1.55,
    pos: [2.2, 3.2, -1.8], rot: [0.3, -1.6, -0.06], scale: 0.45 },
  // 05 experience / timeline — small, hold in the RIGHT margin past the cards.
  { color: c("#39ffa5"), displaceAmp: 0.22, displaceFreq: 2.0, rotSpeed: 0.13, camX: -2.2, camY: 0.6, camZ: 6.6, lookY: 0.2,  particleSpread: 1.1,
    pos: [4.5, 1.5, -0.7], rot: [-0.12, 0.7, 0.08], scale: 0.45 },
  // 06 contact / signal — small, settle in the CENTER (off the right card).
  { color: c("#4f9cff"), displaceAmp: 0.36, displaceFreq: 3.3, rotSpeed: 0.42, camX: 0.0,  camY: 0.5, camZ: 8.6, lookY: 0.1,  particleSpread: 0.6,
    pos: [0.6, -0.3, -0.3], rot: [0.04, -0.4, 0.0], scale: 0.5 },
];

/** Mutable target a consumer fills each frame (avoids per-frame allocs). */
export interface ScenePoseTarget {
  color: THREE.Color;
  displaceAmp: number;
  displaceFreq: number;
  rotSpeed: number;
  camX: number;
  camY: number;
  camZ: number;
  lookY: number;
  particleSpread: number;
  /** Traveling model world position. */
  pos: THREE.Vector3;
  /** Traveling model Euler rotation (radians). */
  rot: THREE.Vector3;
  /** Traveling model uniform scale. */
  scale: number;
}

export function makePoseTarget(): ScenePoseTarget {
  const p0 = SCENE_POSES[0];
  return {
    color: p0.color.clone(),
    displaceAmp: p0.displaceAmp,
    displaceFreq: p0.displaceFreq,
    rotSpeed: p0.rotSpeed,
    camX: p0.camX,
    camY: p0.camY,
    camZ: p0.camZ,
    lookY: p0.lookY,
    particleSpread: p0.particleSpread,
    pos: new THREE.Vector3(p0.pos[0], p0.pos[1], p0.pos[2]),
    rot: new THREE.Vector3(p0.rot[0], p0.rot[1], p0.rot[2]),
    scale: p0.scale,
  };
}

const lerp = THREE.MathUtils.lerp;

/**
 * Sample the pose curve at the given progress (0..1) into `out`,
 * mutating it in place. Linearly blends between the two nearest poses.
 */
export function samplePose(progress: number, out: ScenePoseTarget): void {
  const n = SCENE_POSES.length;
  const t = THREE.MathUtils.clamp(progress, 0, 1) * (n - 1);
  const i = Math.floor(t);
  const f = t - i;
  const a = SCENE_POSES[i];
  const b = SCENE_POSES[Math.min(i + 1, n - 1)];

  out.color.copy(a.color).lerp(b.color, f);
  out.displaceAmp = lerp(a.displaceAmp, b.displaceAmp, f);
  out.displaceFreq = lerp(a.displaceFreq, b.displaceFreq, f);
  out.rotSpeed = lerp(a.rotSpeed, b.rotSpeed, f);
  out.camX = lerp(a.camX, b.camX, f);
  out.camY = lerp(a.camY, b.camY, f);
  out.camZ = lerp(a.camZ, b.camZ, f);
  out.lookY = lerp(a.lookY, b.lookY, f);
  out.particleSpread = lerp(a.particleSpread, b.particleSpread, f);

  out.pos.set(
    lerp(a.pos[0], b.pos[0], f),
    lerp(a.pos[1], b.pos[1], f),
    lerp(a.pos[2], b.pos[2], f)
  );
  out.rot.set(
    lerp(a.rot[0], b.rot[0], f),
    lerp(a.rot[1], b.rot[1], f),
    lerp(a.rot[2], b.rot[2], f)
  );
  out.scale = lerp(a.scale, b.scale, f);
}
