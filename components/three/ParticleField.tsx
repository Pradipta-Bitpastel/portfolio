"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneStore } from "@/lib/sceneStore";
import { makePoseTarget, samplePose } from "@/lib/scenePoses";
import { cursor } from "@/lib/useCursor";
import { PARTICLE_VERTEX, PARTICLE_FRAGMENT } from "./shaders/coreShaders";

/**
 * A drifting GPU point cloud surrounding the core. Points sit on a
 * spherical shell; the shell's radius (spread), color and rotation are
 * scroll-driven and damped per frame. Additive blending makes it read
 * as floating data-dust without any postprocessing.
 */

const COUNT = 900;
const damp = THREE.MathUtils.damp;

export function ParticleField() {
  const groupRef = useRef<THREE.Group>(null);
  const target = useMemo(() => makePoseTarget(), []);

  const { geometry, uniforms } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const scales = new Float32Array(COUNT);
    for (let i = 0; i < COUNT; i++) {
      // Random point on a shell of radius ~3.2–5.4, kept clear of the
      // core so points don't cluster over its center.
      const r = 3.2 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      scales[i] = 0.4 + Math.random() * 0.9;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("aScale", new THREE.BufferAttribute(scales, 1));

    const u = {
      uSize: { value: 1.1 },
      uSpread: { value: target.particleSpread },
      uColor: { value: target.color.clone() },
    };
    return { geometry: g, uniforms: u };
  }, [target]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: PARTICLE_VERTEX,
        fragmentShader: PARTICLE_FRAGMENT,
        uniforms,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [uniforms]
  );

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    samplePose(sceneStore.progress, target);

    // Fast scroll briefly pushes the shell outward, then it settles.
    const surge = sceneStore.scrollVelocity;
    sceneStore.scrollVelocity = damp(sceneStore.scrollVelocity, 0, 5, dt);

    uniforms.uSpread.value = damp(
      uniforms.uSpread.value,
      target.particleSpread + surge * 0.5,
      3,
      dt
    );
    uniforms.uColor.value.lerp(target.color, 1 - Math.exp(-4 * dt));

    const g = groupRef.current;
    if (g) {
      // Base drift, nudged faster while scrolling hard.
      g.rotation.y += dt * (0.04 + surge * 0.12);
      g.rotation.x = damp(g.rotation.x, cursor.y * 0.1, 2, dt);
      g.rotation.z = damp(g.rotation.z, cursor.x * -0.08, 2, dt);
    }
  });

  return (
    <group ref={groupRef}>
      <points geometry={geometry} material={material} />
    </group>
  );
}

export default ParticleField;
