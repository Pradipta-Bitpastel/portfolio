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
import { readPerfTier } from "@/lib/usePerfTier";
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
  // Non-reactive read so the closure captures the tier once. Swapping
  // tiers mid-session requires a reload anyway (the Canvas frameloop
  // and DPR are both keyed on it), so re-reading each frame is waste.
  const low = readPerfTier() === "low";

  useFrame(() => {
    const l = ref.current;
    if (!l) return;
    if (low || isCursorReduced()) {
      // Park it at a neutral spot; no per-frame lerp on low-tier.
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
 *
 * `perfLow` drops the EffectComposer (Bloom + ChromaticAberration +
 * Vignette) entirely — post-processing is per-pixel and is the
 * single most expensive thing in this scene on integrated GPUs.
 * The Bloom-free version still reads as "glowy" because the meshes
 * use additive emissive materials; it just loses the halo spill.
 */
export function Scene({ perfLow = false }: { perfLow?: boolean }) {
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
      {!perfLow && (
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
      )}
    </Suspense>
  );
}

export default Scene;
