"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { sceneStore } from "@/lib/sceneStore";
import { makePoseTarget, samplePose } from "@/lib/scenePoses";
import { cursor } from "@/lib/useCursor";
import { CORE_VERTEX, MORPH_SOLID_FRAGMENT, MORPH_WIRE_FRAGMENT } from "./shaders/coreShaders";

const damp = THREE.MathUtils.damp;
const lerp = THREE.MathUtils.lerp;

/** One geometry per section — radius ~1.5 so they swap in place. */
function makeGeometries(): THREE.BufferGeometry[] {
  return [
    new THREE.IcosahedronGeometry(1.5, 4),
    new THREE.TorusKnotGeometry(1.0, 0.34, 160, 24),
    new THREE.OctahedronGeometry(1.7, 3),
    new THREE.DodecahedronGeometry(1.6, 2),
    new THREE.TorusGeometry(1.15, 0.46, 28, 90),
    new THREE.IcosahedronGeometry(1.55, 5),
  ];
}

type Slot = {
  group: THREE.Group;
  solid: THREE.Mesh;
  wire: THREE.Mesh;
  uniforms: {
    uTime: { value: number };
    uAmp: { value: number };
    uFreq: { value: number };
    uColor: { value: THREE.Color };
    uGlow: { value: number };
    uOpacity: { value: number };
  };
};

function makeSlot(): Slot {
  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.2 },
    uFreq: { value: 1.6 },
    uColor: { value: new THREE.Color("#4f9cff") },
    uGlow: { value: 0.4 },
    uOpacity: { value: 1 },
  };
  const solidMat = new THREE.ShaderMaterial({
    vertexShader: CORE_VERTEX,
    fragmentShader: MORPH_SOLID_FRAGMENT,
    uniforms,
    transparent: true,
    depthWrite: false,
  });
  const wireMat = new THREE.ShaderMaterial({
    vertexShader: CORE_VERTEX,
    fragmentShader: MORPH_WIRE_FRAGMENT,
    uniforms,
    wireframe: true,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const solid = new THREE.Mesh(undefined, solidMat);
  const wire = new THREE.Mesh(undefined, wireMat);
  const group = new THREE.Group();
  group.add(solid, wire);
  return { group, solid, wire, uniforms };
}

export function MorphCore() {
  const tiltRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const target = useMemo(() => makePoseTarget(), []);

  const geos = useMemo(makeGeometries, []);
  const slotA = useMemo(makeSlot, []); // current shape
  const slotB = useMemo(makeSlot, []); // incoming shape
  const lastIndex = useRef(-1);

  useEffect(() => {
    if (tiltRef.current) sceneStore.core.ref = tiltRef.current;
    return () => {
      sceneStore.core.ref = null;
      geos.forEach((g) => g.dispose());
      [slotA, slotB].forEach((s) => {
        (s.solid.material as THREE.Material).dispose();
        (s.wire.material as THREE.Material).dispose();
      });
    };
  }, [geos, slotA, slotB]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    samplePose(sceneStore.progress, target);

    const n = geos.length;
    const t = THREE.MathUtils.clamp(sceneStore.progress, 0, 1) * (n - 1);
    const i = Math.min(Math.floor(t), n - 1);
    const next = Math.min(i + 1, n - 1);
    const f = t - i;

    // Re-bind geometries only when the active segment changes.
    if (i !== lastIndex.current) {
      lastIndex.current = i;
      slotA.solid.geometry = geos[i];
      slotA.wire.geometry = geos[i];
      slotB.solid.geometry = geos[next];
      slotB.wire.geometry = geos[next];
    }

    // Cross-fade only in the last third of each segment so the shape
    // reads cleanly for most of the section, then morphs at the seam.
    const w = next === i ? 0 : THREE.MathUtils.smoothstep(f, 0.62, 1.0);

    // Shared visual state for both slots.
    for (const s of [slotA, slotB]) {
      s.uniforms.uTime.value += dt;
      s.uniforms.uAmp.value = damp(s.uniforms.uAmp.value, target.displaceAmp, 4, dt);
      s.uniforms.uFreq.value = damp(s.uniforms.uFreq.value, target.displaceFreq, 4, dt);
      s.uniforms.uGlow.value = damp(s.uniforms.uGlow.value, 0.35 + target.displaceAmp, 4, dt);
      s.uniforms.uColor.value.lerp(target.color, 1 - Math.exp(-4 * dt));
    }

    // Outgoing (A) fades + scales up; incoming (B) scales in from small.
    slotA.uniforms.uOpacity.value = 1 - w;
    slotB.uniforms.uOpacity.value = w;
    const aScale = lerp(1, 1.18, w);
    const bScale = lerp(0.82, 1, w);
    slotA.group.scale.setScalar(aScale);
    slotB.group.scale.setScalar(bScale);
    slotB.group.visible = w > 0.001;

    const spin = spinRef.current;
    if (spin) spin.rotation.y += target.rotSpeed * dt;

    const tilt = tiltRef.current;
    if (tilt) {
      tilt.rotation.x = damp(tilt.rotation.x, cursor.y * 0.18, 3, dt);
      tilt.rotation.y = damp(tilt.rotation.y, cursor.x * 0.18, 3, dt);
    }
  });

  return (
    <group ref={tiltRef}>
      <group ref={spinRef}>
        <primitive object={slotA.group} />
        <primitive object={slotB.group} />
      </group>
    </group>
  );
}

export default MorphCore;
