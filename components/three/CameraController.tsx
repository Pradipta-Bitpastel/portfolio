"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { sceneStore } from "@/lib/sceneStore";
import { readPerfTier } from "@/lib/usePerfTier";

/**
 * Camera rig. Provides:
 *   - a drei <PerspectiveCamera makeDefault/> registered to the store
 *   - mouse-parallax target offset (lerped toward, not snapped)
 *   - hand-off flag `sceneStore.camera.gsapControlled` so a scrolling
 *     GSAP timeline can override without fighting the parallax lerp.
 *
 * Camera always lookAts origin each frame so any tween on position
 * stays composited with the orbit behavior.
 */

const PARALLAX_STRENGTH_X = 0.45;
const PARALLAX_STRENGTH_Y = 0.30;
const PARALLAX_LERP = 0.08;

/**
 * Final camera position each frame is:
 *   basePos (GSAP scroll-driven)
 *   + cinematicOffset (per-boundary push-in tween)
 *   + parallaxOffset (mouse, lerped)
 *
 * That way scroll choreography, the cinematic cut-beat, and mouse
 * parallax compose instead of clobbering each other.
 */
export function CameraController() {
  const camRef = useRef<THREE.PerspectiveCamera>(null);
  const parallaxTarget = useRef({ x: 0, y: 0 });
  const parallaxCurrent = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (camRef.current) {
      sceneStore.camera.ref = camRef.current;
    }
    return () => {
      sceneStore.camera.ref = null;
    };
  }, []);

  const low = readPerfTier() === "low";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (low) return;
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;
      const ny = (e.clientY / window.innerHeight) * 2 - 1;
      parallaxTarget.current.x = nx;
      parallaxTarget.current.y = -ny;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, [low]);

  useFrame(() => {
    const cam = camRef.current;
    if (!cam) return;

    // Lerp parallax current → target so the camera glides with the
    // cursor rather than snapping.
    if (!low) {
      parallaxCurrent.current.x +=
        (parallaxTarget.current.x - parallaxCurrent.current.x) * PARALLAX_LERP;
      parallaxCurrent.current.y +=
        (parallaxTarget.current.y - parallaxCurrent.current.y) * PARALLAX_LERP;
    }

    const base = sceneStore.camera.basePos;
    const cin = sceneStore.camera.cinematicOffset;
    const px = low ? 0 : parallaxCurrent.current.x * PARALLAX_STRENGTH_X;
    const py = low ? 0 : parallaxCurrent.current.y * PARALLAX_STRENGTH_Y;

    cam.position.set(base.x + cin.x + px, base.y + cin.y + py, base.z + cin.z);
    cam.lookAt(sceneStore.camera.target);

    // FOV composites scroll-driven baseFov with the boundary pulse.
    const fov = sceneStore.camera.baseFov + sceneStore.camera.fovPulse;
    if (Math.abs(cam.fov - fov) > 0.001) {
      cam.fov = fov;
      cam.updateProjectionMatrix();
    }
  });

  return (
    <PerspectiveCamera
      ref={camRef}
      makeDefault
      position={[
        sceneStore.camera.basePos.x,
        sceneStore.camera.basePos.y,
        sceneStore.camera.basePos.z
      ]}
      fov={45}
      near={0.1}
      far={100}
    />
  );
}

export default CameraController;
