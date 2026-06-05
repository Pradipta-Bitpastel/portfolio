"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useAnimations, useGLTF } from "@react-three/drei";
import { sceneStore } from "@/lib/sceneStore";
import { makePoseTarget, samplePose } from "@/lib/scenePoses";

/**
 * The single persistent traveling object: the three.js "RobotExpressive"
 * GLB (MIT) — a stylized, fully-rigged PBR robot with named animation
 * clips. It replaces the old procedural holographic core the user
 * disliked.
 *
 * It lives in the global ambient canvas and FLIES through the page: every
 * frame the group damps toward the position / rotation / scale sampled
 * from the scene-pose curve at `sceneStore.progress` — the SAME render-
 * loop damp the camera + particle field use (no GSAP scrub). Layered on
 * top: a subtle idle bob (sin on Y) and a slow continuous yaw spin so it
 * always feels alive. (This pose/damp/bob block is preserved verbatim
 * from the previous core, only the visual payload changed.)
 *
 * SCROLL-DRIVEN PERFORMANCE: the page is 6 sections. We derive a section
 * index from progress and crossfade the robot into a clip per section
 * (Wave → Walking → Running → Jump → ThumbsUp → Dance). Clip changes
 * fadeOut the old action and fadeIn the new over ~0.4s. The animation
 * mixer is advanced by drei's `useAnimations` (it registers its own
 * useFrame that calls mixer.update(delta) for the actions it owns), so we
 * only drive PLAY/CROSSFADE here — no second mixer-update mechanism.
 *
 * PAUSE: because it shares the single <Canvas> with ParticleField, when
 * the canvas frameloop flips to 'never' (the `portfolio:bg-pause` event
 * from the Showcase section, or tab-hidden) BOTH our useFrame AND drei's
 * mixer useFrame stop with it — one WebGL canvas active at a time. We add
 * no second pause path. Low-tier / touch / reduced-motion never reach
 * here at all: SceneContainer renders the SvgCoreFallback instead.
 *
 * LIGHTING: the robot is lit by the shared scene <Lights/> (ambient +
 * hemisphere + a cyan/violet point pair). We deliberately do NOT mount a
 * drei <Environment> here — it would write `scene.environment` on the
 * SHARED ambient scene and tint the ParticleField / MorphCore too, plus
 * cost an extra render target. The tri-tone neon wash already gives the
 * PBR robot a clean read.
 */

const MODEL = "/models/RobotExpressive.glb";

const damp = THREE.MathUtils.damp;

// Slightly slower than the camera (3) so the robot trails the camera move.
const POS_RATE = 2.6;
const ROT_RATE = 2.4;
const SCALE_RATE = 3.2;

const BOB_AMP = 0.12;
const BOB_SPEED = 1.1;
const SPIN_SPEED = 0.12; // rad/s gentle idle yaw (low so the clip still reads)

const CROSSFADE = 0.4; // seconds, per requirement (~0.4s)

// How tall (world units, before the per-section pose `scale` multiplier)
// we normalise the robot to. ~1.9 reads as a clear accent that mostly
// shows in the sections below the opaque hero, without dominating.
const TARGET_HEIGHT = 1.9;

/**
 * Map normalized scroll progress (0..1) to a section index (0..5) for the
 * 6-section page. Mirrors the pose-curve segmentation in scenePoses.
 */
const SECTION_COUNT = 6;
function sectionFromProgress(progress: number): number {
  const p = THREE.MathUtils.clamp(progress, 0, 1);
  // round-to-nearest waypoint so a clip "belongs" to the section you are
  // closest to, matching how samplePose blends between adjacent poses.
  return Math.min(SECTION_COUNT - 1, Math.round(p * (SECTION_COUNT - 1)));
}

/**
 * Per-section clip. Energy roughly follows the journey: greet → travel →
 * sprint → leap → approve → celebrate. All names exist in the GLB
 * (Dance, Death, Idle, Jump, No, Punch, Running, Sitting, Standing,
 * ThumbsUp, Walking, WalkJump, Wave, Yes).
 */
const SECTION_CLIPS: readonly string[] = [
  "Wave",     // 01 hero / boot — greet the visitor
  "Walking",  // 02 about / init — start moving in
  "Running",  // 03 skills / activation — full speed
  "Jump",     // 04 projects / execution — leap into action
  "ThumbsUp", // 05 experience / timeline — approve / endorse
  "Dance",    // 06 contact / signal — celebrate
];

// Clips that should play once-and-hold rather than loop. One-shots (Jump,
// ThumbsUp) look best clamped on their final frame while the section is
// held, rather than snapping back to the start.
const ONCE_CLIPS = new Set<string>(["Jump", "ThumbsUp"]);

export function TravelerModel() {
  const group = useRef<THREE.Group>(null);
  const target = useMemo(() => makePoseTarget(), []);
  const spin = useRef(0);

  // The robot is a rigged GLB with a SkinnedMesh + skeleton. There is a
  // single persistent instance (not reused), so we drive the loaded
  // `scene` directly — no clone, which keeps the skeleton bindings intact
  // and avoids per-mount allocation.
  const { scene, animations } = useGLTF(MODEL);
  const inner = useRef<THREE.Group>(null);
  const { actions } = useAnimations(animations, inner);

  // Tracks which section's clip is currently playing so we only crossfade
  // on an actual section change (allocation-free per frame).
  const currentSection = useRef<number>(-1);

  // Fit + recenter the model ONCE from its real world bounding box, so we
  // don't depend on the GLB's pivot (RobotExpressive's origin is at its
  // feet). State (not a ref) so the computed scale/offset are applied on
  // the very next render — refs alone wouldn't re-render the inner group.
  const [fit, setFit] = useState<{ scale: number; offsetY: number }>({
    scale: 1,
    offsetY: 0,
  });

  useLayoutEffect(() => {
    scene.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(scene);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const h = size.y || 1;
    const s = TARGET_HEIGHT / h;
    // Recenter vertically: after scaling, shift so the model's bbox center
    // sits on y=0 of the inner group.
    setFit({ scale: s, offsetY: -center.y * s });

    // Clean PBR read: no shadow casting/receiving (the ambient canvas has
    // no shadow map), keep materials tone-mapped (they're lit, not emissive).
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = false;
        mesh.receiveShadow = false;
        const mat = mesh.material as THREE.Material | THREE.Material[];
        const mats = Array.isArray(mat) ? mat : [mat];
        for (const m of mats) {
          (m as THREE.MeshStandardMaterial).toneMapped = true;
        }
      }
    });
  }, [scene]);

  // Crossfade into a section's clip. Called on section transitions only.
  const playSection = (section: number) => {
    if (!actions) return;
    const nextName = SECTION_CLIPS[section] ?? "Idle";
    const next = actions[nextName];
    if (!next) return;

    const prevName = SECTION_CLIPS[currentSection.current];
    const prev = currentSection.current >= 0 ? actions[prevName] : undefined;

    if (prev && prev !== next) {
      prev.fadeOut(CROSSFADE);
    }

    next.reset();
    if (ONCE_CLIPS.has(nextName)) {
      next.setLoop(THREE.LoopOnce, 1);
      next.clampWhenFinished = true;
    } else {
      next.setLoop(THREE.LoopRepeat, Infinity);
      next.clampWhenFinished = false;
    }
    next.enabled = true;
    next.setEffectiveTimeScale(1);
    next.setEffectiveWeight(1);
    next.fadeIn(CROSSFADE);
    next.play();
  };

  // Kick off the first clip once the actions exist.
  useEffect(() => {
    if (!actions) return;
    const initial = sectionFromProgress(sceneStore.progress);
    currentSection.current = -1;
    playSection(initial);
    currentSection.current = initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);

    // --- Scroll-driven clip selection (crossfade only on change) ---
    const section = sectionFromProgress(sceneStore.progress);
    if (section !== currentSection.current) {
      playSection(section);
      currentSection.current = section;
    }

    // --- Pose travel + idle bob/spin (preserved from the old core) ---
    samplePose(sceneStore.progress, target);

    spin.current += dt * SPIN_SPEED;
    const bob = Math.sin(state.clock.elapsedTime * BOB_SPEED) * BOB_AMP;

    g.position.x = damp(g.position.x, target.pos.x, POS_RATE, dt);
    g.position.y = damp(g.position.y, target.pos.y + bob, POS_RATE, dt);
    g.position.z = damp(g.position.z, target.pos.z, POS_RATE, dt);

    g.rotation.x = damp(g.rotation.x, target.rot.x, ROT_RATE, dt);
    g.rotation.y = damp(g.rotation.y, target.rot.y + spin.current, ROT_RATE, dt);
    g.rotation.z = damp(g.rotation.z, target.rot.z, ROT_RATE, dt);

    const s = damp(g.scale.x, target.scale, SCALE_RATE, dt);
    g.scale.setScalar(s);

    // DEBUG (QA only): project the robot's anchor to screen fractions so the
    // verify scripts can read exactly where it lands per section. Cheap; gated
    // off in production. Remove the window write before shipping.
    if (process.env.NODE_ENV !== "production") {
      const v = g.position.clone().project(state.camera);
      (window as unknown as { __robotNDC?: { x: number; y: number } }).__robotNDC = {
        x: +(v.x * 0.5 + 0.5).toFixed(3),
        y: +(1 - (v.y * 0.5 + 0.5)).toFixed(3),
      };
    }

    // NOTE: the animation mixer is advanced by drei's useAnimations
    // (its own internal useFrame calls mixer.update(delta)). We do not
    // update it here — doing so would double-advance the clips.
  });

  return (
    <group
      ref={group}
      position={[target.pos.x, target.pos.y, target.pos.z]}
      scale={target.scale}
    >
      {/* Inner group carries the fit-scale + recenter so the robot's
          feet-origin is centred on the pose curve, independent of the
          GLB pivot. useAnimations is bound to THIS group so the mixer
          targets the attached scene graph. */}
      <group ref={inner} scale={fit.scale} position={[0, fit.offsetY, 0]}>
        <primitive object={scene} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL);

export default TravelerModel;
