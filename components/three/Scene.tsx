"use client";

import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import {
  EffectComposer,
  Bloom,
  Vignette,
  ChromaticAberration,
} from "@react-three/postprocessing";
import { CameraController } from "./CameraController";
import { Lights } from "./Lights";
import { DevStation } from "./DevStation";
import { Modules } from "./Modules";
import { ConnectionLines } from "./ConnectionLines";
import { TimelineRing } from "./TimelineRing";
import { GroundReflector } from "./GroundReflector";
import { SceneChromaticController } from "./SceneChromaticController";
import { useCursor, isCursorReduced } from "@/lib/useCursor";

/**
 * Cursor-tracked cyan point light.
 *
 * Reads the global `cursor` (normalized −1..1) each frame and lerps a
 * point light's position toward where the cursor is in world space.
 * Adds responsiveness to the whole scene without coupling to any one
 * mesh. Disabled when `prefers-reduced-motion` is set.
 */
function CursorLight() {
  const ref = useRef<THREE.PointLight>(null);
  const cursor = useCursor();

  useFrame(() => {
    const l = ref.current;
    if (!l) return;
    if (isCursorReduced()) {
      // Park it at a neutral spot.
      l.position.set(0, 0, 2.5);
      return;
    }
    const targetX = cursor.x * 4;
    const targetY = cursor.y * 2.5;
    l.position.x += (targetX - l.position.x) * 0.08;
    l.position.y += (targetY - l.position.y) * 0.08;
  });

  // Install the listener early so the global cursor object updates
  // even before the first useFrame tick has fired.
  useEffect(() => {
    /* useCursor() above already installed the listener. */
  }, []);

  return (
    <pointLight
      ref={ref}
      color="#00d4ff"
      intensity={3}
      distance={5}
      decay={2}
      position={[0, 0, 2.5]}
    />
  );
}

/**
 * Full Developer Control Core composition. Kept as a sibling to
 * _Scene so tests can import the graph without the Canvas wrapper.
 */
export function Scene() {
  return (
    <Suspense fallback={null}>
      <CameraController />
      <Lights />
      <CursorLight />
      <GroundReflector />
      <DevStation />
      <Modules />
      <ConnectionLines />
      <TimelineRing />
      <EffectComposer enableNormalPass={false}>
        <Bloom
          mipmapBlur
          intensity={1.1}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.2}
          radius={0.8}
        />
        <ChromaticAberration
          offset={new THREE.Vector2(0.0006, 0.0006)}
          radialModulation={false}
          modulationOffset={0}
        />
        <SceneChromaticController />
        <Vignette eskil={false} offset={0.1} darkness={0.7} />
      </EffectComposer>
    </Suspense>
  );
}

export default Scene;
