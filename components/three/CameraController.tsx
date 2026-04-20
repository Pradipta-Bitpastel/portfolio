"use client";

import { PerspectiveCamera } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { sceneStore } from "@/lib/sceneStore";

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

const BASE_POS = new THREE.Vector3(0, 0, 8);
const PARALLAX_STRENGTH = 0.3;
const LERP_FACTOR = 0.06;

export function CameraController() {
  const camRef = useRef<THREE.PerspectiveCamera>(null);
  const targetOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (camRef.current) {
      sceneStore.camera.ref = camRef.current;
    }
    return () => {
      sceneStore.camera.ref = null;
    };
  }, []);

  // Track the mouse-derived target offset. Window listener, passive.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onMove = (e: MouseEvent) => {
      const nx = (e.clientX / window.innerWidth) * 2 - 1;   // -1..1
      const ny = (e.clientY / window.innerHeight) * 2 - 1;  // -1..1
      targetOffset.current.x = nx;
      // Invert Y so moving mouse up looks up
      targetOffset.current.y = -ny;
    };
    window.addEventListener("mousemove", onMove, { passive: true });
    return () => window.removeEventListener("mousemove", onMove);
  }, []);

  useFrame(() => {
    const cam = camRef.current;
    if (!cam) return;

    if (!sceneStore.camera.gsapControlled) {
      const desiredX = BASE_POS.x + targetOffset.current.x * PARALLAX_STRENGTH;
      const desiredY = BASE_POS.y + targetOffset.current.y * PARALLAX_STRENGTH;
      cam.position.x += (desiredX - cam.position.x) * LERP_FACTOR;
      cam.position.y += (desiredY - cam.position.y) * LERP_FACTOR;
      // Leave Z where the timeline or the default placed it.
    }

    cam.lookAt(sceneStore.camera.target);
  });

  return (
    <PerspectiveCamera
      ref={camRef}
      makeDefault
      position={[BASE_POS.x, BASE_POS.y, BASE_POS.z]}
      fov={45}
      near={0.1}
      far={100}
    />
  );
}

export default CameraController;
