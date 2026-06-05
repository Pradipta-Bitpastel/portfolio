"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";

/**
 * HeroRobot — the cute "RobotExpressive" mascot (CC0, three.js examples) that
 * stands on the hero's left cliff (replacing the painted hiker), waves "hi",
 * idles, and on scroll DIVES downward + shrinks to lead into the next section.
 *
 * This file is the Canvas CONTENTS only (lights + model). The <Canvas> itself
 * lives in HeroSection so hot-reload re-mounts cleanly (a Canvas instance does
 * not re-create on HMR → black canvas). Animations are driven by drei
 * useAnimations (its mixer auto-advances inside R3F's frameloop — never call
 * mixer.update yourself). Scroll handoff reads the hero's own 0..1 progress via
 * a shared ref written in HeroSection's rAF loop (no second scroll driver).
 */

const MODEL = "/models/RobotExpressive.glb";

// --- placement: bottom-RIGHT corner companion (tuned against screenshots) ---
const POS: [number, number, number] = [2.35, -1.2, 0];
const SCALE = 0.23;
const ROT_Y = -0.5; // face LEFT, looking up toward the name
// Scroll sync: drift DOWN with the descending scene, then add the dive. VIS_H =
// world units the camera shows over one viewport height (2*tan(fov/2)*dist,
// fov42 dist6) — converts the layer's vh travel into the robot's world sink.
const RIDE = 0.15;
const VIS_H = 4.6;

// one-shot emotes hold their last frame, then crossfade back to Idle
const ONE_SHOTS = new Set(["Wave", "ThumbsUp", "Yes", "No", "Jump", "Punch", "Death"]);
// friendly emotes cycled while the user lingers at the top of the hero
const EMOTE_CYCLE = ["Wave", "ThumbsUp", "Yes", "Wave"];

function Robot({ progressRef }: { progressRef: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null!);
  const { scene, animations } = useGLTF(MODEL);
  // CLONE the GLTF scene. useGLTF returns ONE shared, cached THREE.Scene per
  // URL and <primitive> REPARENTS whatever object it's given (a THREE object
  // has a single parent). Cloning gives this bot its own rig/mixer/morph state
  // so it's safe under StrictMode's double-mount and if any other component
  // ever loads the same GLB again (the retired TravelerModel did → a real bug).
  const model = useMemo(() => cloneSkeleton(scene), [scene]);
  const { actions, mixer } = useAnimations(animations, group);
  const current = useRef<string | null>(null);
  const head = useRef<THREE.Mesh | null>(null);

  // Locate the head SkinnedMesh that carries the facial morph targets
  // (Angry / Surprised / Sad) so we can react during the dive.
  useEffect(() => {
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      const dict = (m as unknown as { morphTargetDictionary?: Record<string, number> })
        .morphTargetDictionary;
      if (dict && dict.Surprised !== undefined) head.current = m;
      // Robot materials are stylised flat — keep them crisp on both skies.
      if (m.isMesh) m.frustumCulled = false;
    });
  }, [model]);

  // Animation state machine: idle base, wave "hi" on entry, periodic emotes,
  // and a clean crossfade back to Idle after every one-shot.
  useEffect(() => {
    const play = (name: string) => {
      const next = actions[name];
      if (!next) return;
      const once = ONE_SHOTS.has(name);
      next.reset();
      next.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
      next.clampWhenFinished = once;
      const prev = current.current ? actions[current.current] : null;
      if (prev && prev !== next) next.crossFadeFrom(prev, 0.3, false);
      next.play();
      current.current = name;
    };

    play("Idle");
    const hi = setTimeout(() => play("Wave"), 650); // greet on arrival

    const onFinished = (e: { action: THREE.AnimationAction }) => {
      const idle = actions.Idle;
      if (idle && e.action !== idle) {
        idle.reset().setLoop(THREE.LoopRepeat, Infinity);
        idle.clampWhenFinished = false;
        idle.crossFadeFrom(e.action, 0.4, false);
        idle.play();
        current.current = "Idle";
      }
    };
    mixer.addEventListener("finished", onFinished);

    let i = 0;
    const cycle = setInterval(() => {
      // Stay calm once the user starts scrolling into the handoff.
      if ((progressRef.current ?? 0) > 0.35) return;
      play(EMOTE_CYCLE[i % EMOTE_CYCLE.length]);
      i++;
    }, 5200);

    return () => {
      clearTimeout(hi);
      clearInterval(cycle);
      mixer.removeEventListener("finished", onFinished);
    };
  }, [actions, mixer, progressRef]);

  // Per-frame: idle bob + scroll-driven DIVE (down, forward, shrink) that
  // hands the eye off into the next section. Transform-only (cheap).
  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const p = progressRef.current ?? 0;
    const t = state.clock.elapsedTime;

    // dive window 0.62 → 1.0, eased-in
    const dive = THREE.MathUtils.clamp((p - 0.62) / 0.38, 0, 1);
    const ease = dive * dive;

    const bob = Math.sin(t * 1.5) * 0.05 * (1 - dive);
    const sway = Math.sin(t * 0.7) * 0.04 * (1 - dive);

    // Ride the cliff DOWN in lock-step with the sinking parallax (so the bot
    // stays planted on it as you descend), then add the dive plunge at the end.
    const ride = -(p * RIDE * VIS_H);

    g.position.x = POS[0] + sway;
    g.position.y = POS[1] + bob + ride - ease * 2.6; // sink with the cliff, then plunge
    g.position.z = POS[2] + ease * 1.6; // toward the camera as it dives past
    g.rotation.y = ROT_Y + sway * 0.5;
    g.rotation.x = ease * 0.7; // tip forward into the dive
    g.scale.setScalar(SCALE * (1 - ease * 0.85)); // shrink away (clean exit)

    // surprised face as it plunges
    const h = head.current as unknown as {
      morphTargetInfluences?: number[];
      morphTargetDictionary?: Record<string, number>;
    } | null;
    if (h?.morphTargetInfluences && h.morphTargetDictionary) {
      const s = h.morphTargetDictionary.Surprised;
      if (s !== undefined) h.morphTargetInfluences[s] = ease;
    }
  });

  return (
    <primitive
      ref={group}
      object={model}
      position={POS}
      scale={SCALE}
      rotation={[0, ROT_Y, 0]}
      dispose={null}
    />
  );
}

export function HeroRobotScene({
  progressRef,
}: {
  progressRef: MutableRefObject<number>;
}) {
  return (
    <>
      {/* Warm key + soft cool fill so the bot reads on BOTH the night (cool)
          and day (golden) skies. No post-processing — keep this 2nd context
          cheap. */}
      <ambientLight intensity={0.65} />
      <directionalLight position={[3, 5, 4]} intensity={2.4} color="#fff2e0" />
      <directionalLight position={[-4, 2, 2]} intensity={0.7} color="#9ec3ff" />
      <pointLight position={[-2, 0.5, 3]} intensity={2.4} color="#ff8a3c" distance={14} decay={2} />
      <Robot progressRef={progressRef} />
    </>
  );
}

useGLTF.preload(MODEL);

export default HeroRobotScene;
