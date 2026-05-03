"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sceneStore } from "@/lib/sceneStore";
import { readPerfTier } from "@/lib/usePerfTier";

/**
 * Richer, layered Core — award-style central engine.
 *
 * Layers (outer → inner):
 *   1. Wireframe HUD cage (IcosahedronGeometry r=1.15, det=2, counter-rot)
 *   2. Orbiting instanced particle shell (~96 tiny cubes, r=1.4–1.8)
 *   3. Mid physical shell (IcosahedronGeometry r=0.9, det=3) with
 *      iridescence + clearcoat for an "energy battery" feel
 *   4. Internal additive "lightning" line segments that pulse
 *   5. Bright inner core sphere (bloom-heavy)
 *
 * All nested under one group so existing GSAP timelines that tween the
 * core's `.scale` / `.position` keep working on the mid shell
 * (`sceneStore.core.ref`). The point light is preserved so GSAP can
 * boost `intensity` for section drama.
 */

// Halved from the original 96. On low tier we skip ParticleShell
// entirely (count=0) — see the parent Core's perfLow gate.
const PARTICLE_COUNT = 48;
const PARTICLE_MIN_R = 1.4;
const PARTICLE_MAX_R = 1.8;

type ParticleSpec = {
  origin: THREE.Vector3;
  axis: THREE.Vector3;
  speed: number;
  scale: number;
};

function makeParticles(): ParticleSpec[] {
  const out: ParticleSpec[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const y = 1 - (i / (PARTICLE_COUNT - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = (i * Math.PI * (3 - Math.sqrt(5))) % (Math.PI * 2);
    const base = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r);
    const jitter = PARTICLE_MIN_R + Math.random() * (PARTICLE_MAX_R - PARTICLE_MIN_R);
    const p = base.clone().multiplyScalar(jitter);
    const axis = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2
    ).normalize();
    out.push({
      origin: p,
      axis,
      speed: 0.05 + Math.random() * 0.12,
      scale: 0.02 + Math.random() * 0.022,
    });
  }
  return out;
}

function ParticleShell() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const specs = useMemo(() => makeParticles(), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const quat = useMemo(() => new THREE.Quaternion(), []);
  const pos = useMemo(() => new THREE.Vector3(), []);

  // Mutable current positions — updated by orbit every frame.
  const current = useMemo(
    () => specs.map((s) => s.origin.clone()),
    [specs]
  );

  useFrame((_, delta) => {
    const m = meshRef.current;
    if (!m) return;
    for (let i = 0; i < specs.length; i++) {
      const s = specs[i];
      quat.setFromAxisAngle(s.axis, s.speed * delta);
      pos.copy(current[i]).applyQuaternion(quat);
      current[i].copy(pos);
      dummy.position.copy(pos);
      dummy.scale.setScalar(s.scale);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial
        color="#4f9cff"
        toneMapped={false}
        transparent
        opacity={0.85}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/**
 * Lightning — render-only. Its opacity pulse is now driven by the
 * parent `Core` useFrame so we run a single rAF loop instead of three
 * (was: Core + ParticleShell + Lightning each had their own useFrame).
 */
const Lightning = ({
  segRef
}: {
  segRef: React.MutableRefObject<THREE.LineSegments | null>;
}) => {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const SEGMENTS = 6;
    const pts: number[] = [];
    for (let i = 0; i < SEGMENTS; i++) {
      const a = new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2
      );
      const b = new THREE.Vector3(
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2,
        (Math.random() - 0.5) * 1.2
      );
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);

  return (
    <lineSegments ref={segRef} geometry={geom}>
      <lineBasicMaterial
        color="#9fd6ff"
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </lineSegments>
  );
};

export function Core() {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const innerCoreRef = useRef<THREE.Mesh>(null);
  const wireRef = useRef<THREE.Group>(null);
  const particleGroupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const lightningRef = useRef<THREE.LineSegments | null>(null);

  // Cache once — tier swaps require a reload anyway.
  const tier = readPerfTier();
  const isLow = tier === "low";

  // Audit fix #4: drop ico detail (3→2 high, 2→1 low), drop the
  // wireframe pass on low tier, halve PARTICLE_COUNT (96→48) and
  // skip the particle shell entirely on low tier.
  const midDetail = isLow ? 1 : 2;
  const wireDetail = isLow ? 1 : 2;
  const showWire = !isLow;
  const showParticles = !isLow;

  useEffect(() => {
    sceneStore.core.ref = meshRef.current;
    sceneStore.core.glow = lightRef.current;
    return () => {
      sceneStore.core.ref = null;
      sceneStore.core.glow = null;
    };
  }, []);

  // Single useFrame drives all in-Core animation: group spin,
  // wireframe counter-rot, particle group rotation, inner-core pulse,
  // and the lightning line opacity (was a separate useFrame).
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.08 * delta;
    }
    if (wireRef.current) {
      wireRef.current.rotation.y -= 0.12 * delta;
      wireRef.current.rotation.x += 0.04 * delta;
    }
    if (particleGroupRef.current) {
      particleGroupRef.current.rotation.y += delta * 0.12;
      particleGroupRef.current.rotation.x += delta * 0.04;
    }
    if (innerCoreRef.current) {
      const m = innerCoreRef.current.material as THREE.MeshBasicMaterial;
      const pulse = 0.9 + Math.sin(t * 2.4) * 0.3;
      if ("color" in m) m.color.setScalar(pulse);
    }
    const lmat = lightningRef.current?.material as
      | THREE.LineBasicMaterial
      | undefined;
    if (lmat) {
      lmat.opacity = 0.25 + (Math.sin(t * 4) * 0.5 + 0.5) * 0.35;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Mid shell — physical material (iridescence + clearcoat) only
          on high tier; standard material everywhere else, since the
          extra physical shader passes are pricey on integrated GPUs. */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.9, midDetail]} />
        {tier === "high" ? (
          <meshPhysicalMaterial
            color="#3a6fcc"
            emissive="#4f9cff"
            emissiveIntensity={0.6}
            roughness={0.15}
            metalness={0.8}
            clearcoat={0.9}
            clearcoatRoughness={0.1}
            iridescence={1.0}
            iridescenceIOR={2.0}
          />
        ) : (
          <meshStandardMaterial
            color="#3a6fcc"
            emissive="#4f9cff"
            emissiveIntensity={0.8}
            roughness={0.25}
            metalness={0.7}
          />
        )}
      </mesh>

      {/* Inner bright glowing core */}
      <mesh ref={innerCoreRef}>
        <sphereGeometry args={[0.4, isLow ? 16 : 32, isLow ? 16 : 32]} />
        <meshBasicMaterial
          color="#ffffff"
          toneMapped={false}
          transparent
          opacity={0.95}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Internal lightning lines — opacity pulse driven by Core's
          useFrame above (was a separate Lightning useFrame). */}
      <Lightning segRef={lightningRef} />

      {/* Point light (GSAP-tweenable) */}
      <pointLight
        ref={lightRef}
        color="#4f9cff"
        intensity={3}
        distance={6}
        decay={2}
      />

      {/* Wireframe HUD cage — dropped on low tier */}
      {showWire && (
        <group ref={wireRef}>
          <mesh>
            <icosahedronGeometry args={[1.15, wireDetail]} />
            <meshBasicMaterial
              color="#9b5cff"
              wireframe
              transparent
              opacity={0.4}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* Floating data particles — dropped on low tier */}
      {showParticles && (
        <group ref={particleGroupRef}>
          <ParticleShell />
        </group>
      )}
    </group>
  );
}

export default Core;
