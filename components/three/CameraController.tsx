"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sceneStore } from "@/lib/sceneStore";
import { makePoseTarget, samplePose } from "@/lib/scenePoses";
import { cursor } from "@/lib/useCursor";

/**
 * Camera rig. The full position (X orbit / Y height / Z dolly) AND the
 * look-at height are scroll-driven via the pose curve, tracing a
 * continuous journey around the character. A gentle cursor parallax is
 * layered on top. Everything is damped in the render loop (frame-rate
 * independent) so the move stays cinematic at any scroll velocity. No
 * GSAP touches the camera.
 */

const PARALLAX_X = 0.5;
const PARALLAX_Y = 0.35;
const damp = THREE.MathUtils.damp;

export function CameraController() {
  const camRef = useRef<THREE.PerspectiveCamera>(null);
  const target = useMemo(() => makePoseTarget(), []);
  const lookAt = useMemo(() => new THREE.Vector3(0, 0.05, 0), []);

  useEffect(() => {
    if (camRef.current) sceneStore.camera.ref = camRef.current;
    return () => {
      sceneStore.camera.ref = null;
    };
  }, []);

  useFrame((_, delta) => {
    const cam = camRef.current;
    if (!cam) return;
    const dt = Math.min(delta, 0.05);

    samplePose(sceneStore.progress, target);

    const tx = target.camX + cursor.x * PARALLAX_X;
    const ty = target.camY + cursor.y * PARALLAX_Y;

    cam.position.x = damp(cam.position.x, tx, 3, dt);
    cam.position.y = damp(cam.position.y, ty, 3, dt);
    cam.position.z = damp(cam.position.z, target.camZ, 3, dt);

    // Damp the look-at height so the framing glides between sections;
    // the shape stays centred (camera always looks at the origin).
    lookAt.y = damp(lookAt.y, target.lookY, 3, dt);
    cam.lookAt(lookAt);
  });

  return (
    <PerspectiveCamera
      ref={camRef}
      makeDefault
      position={[0, 0.7, 8.4]}
      fov={45}
      near={0.1}
      far={100}
    />
  );
}

export default CameraController;
