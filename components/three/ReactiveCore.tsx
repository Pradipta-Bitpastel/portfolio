"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneStore } from "@/lib/sceneStore";
import { makePoseTarget, samplePose } from "@/lib/scenePoses";
import { cursor } from "@/lib/useCursor";
import { CORE_VERTEX, CORE_FRAGMENT } from "./shaders/coreShaders";

/**
 * The Reactive Core — a single noise-displaced icosahedron rendered as
 * a dark fresnel body plus an additive wireframe shell. Its amplitude,
 * frequency, color, rotation and the camera distance are all driven by
 * the page scroll progress (`sceneStore.progress`), damped toward the
 * sampled pose in the render loop so motion stays buttery regardless of
 * scroll velocity or frame rate.
 */

const WIRE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uGlow;
  varying float vDisp;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    float fres = pow(1.0 - clamp(dot(normalize(vNormalW), normalize(vViewDir)), 0.0, 1.0), 1.8);
    float a = 0.10 + max(vDisp, 0.0) * 0.7 + fres * 0.3;
    gl_FragColor = vec4(uColor * (0.55 + uGlow * 0.25), clamp(a, 0.0, 0.6));
  }
`;

const damp = THREE.MathUtils.damp;

export function ReactiveCore() {
  const tiltRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const target = useMemo(() => makePoseTarget(), []);

  // Smooth, dense geometry for the displaced solid body; a bolder,
  // lower-detail one for crisp wireframe facets.
  const solidGeo = useMemo(() => new THREE.IcosahedronGeometry(1.5, 4), []);
  const wireGeo = useMemo(() => new THREE.IcosahedronGeometry(1.52, 2), []);

  // One shared uniforms object drives BOTH the solid body and the
  // wireframe shell, so a single per-frame update keeps them in sync.
  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmp: { value: target.displaceAmp },
      uFreq: { value: target.displaceFreq },
      uColor: { value: target.color.clone() },
      uGlow: { value: 0.4 },
    }),
    [target]
  );

  const solidMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CORE_VERTEX,
        fragmentShader: CORE_FRAGMENT,
        uniforms,
      }),
    [uniforms]
  );

  const wireMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: CORE_VERTEX,
        fragmentShader: WIRE_FRAGMENT,
        uniforms,
        wireframe: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [uniforms]
  );

  useEffect(() => {
    if (tiltRef.current) sceneStore.core.ref = tiltRef.current;
    return () => {
      sceneStore.core.ref = null;
      solidGeo.dispose();
      wireGeo.dispose();
      solidMat.dispose();
      wireMat.dispose();
    };
  }, [solidGeo, wireGeo, solidMat, wireMat]);

  useFrame((_, delta) => {
    // Clamp delta so a tab-restore frame can't fling the animation.
    const dt = Math.min(delta, 0.05);
    samplePose(sceneStore.progress, target);

    uniforms.uTime.value += dt;
    uniforms.uAmp.value = damp(uniforms.uAmp.value, target.displaceAmp, 4, dt);
    uniforms.uFreq.value = damp(uniforms.uFreq.value, target.displaceFreq, 4, dt);
    uniforms.uGlow.value = damp(uniforms.uGlow.value, 0.35 + target.displaceAmp, 4, dt);
    // Color: exponential approach toward the target hue.
    uniforms.uColor.value.lerp(target.color, 1 - Math.exp(-4 * dt));

    const spin = spinRef.current;
    if (spin) spin.rotation.y += target.rotSpeed * dt;

    const tilt = tiltRef.current;
    if (tilt) {
      // Subtle parallax lean toward the cursor.
      tilt.rotation.x = damp(tilt.rotation.x, cursor.y * 0.18, 3, dt);
      tilt.rotation.y = damp(tilt.rotation.y, cursor.x * 0.18, 3, dt);
    }
  });

  return (
    <group ref={tiltRef}>
      <group ref={spinRef}>
        <mesh geometry={solidGeo} material={solidMat} />
        <mesh geometry={wireGeo} material={wireMat} />
      </group>
    </group>
  );
}

export default ReactiveCore;
