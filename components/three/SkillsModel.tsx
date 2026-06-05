"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { cursor } from "@/lib/useCursor";
import { sectionFx } from "@/lib/sectionFx";


const damp = THREE.MathUtils.damp;
const SPACING = 3.6;

// MODULE_ORDER: frontend, backend, devops, cloud, mobile
const COLORS = ["#4f9cff", "#ff8a3c", "#39ffa5", "#9b5cff", "#00d4ff"];

function makeGeo(i: number): THREE.BufferGeometry {
  switch (i) {
    case 0: return new THREE.IcosahedronGeometry(1, 0);
    case 1: return new THREE.OctahedronGeometry(1.15, 0);
    case 2: return new THREE.TorusGeometry(0.78, 0.32, 24, 64);
    case 3: return new THREE.DodecahedronGeometry(1, 0);
    default: return new THREE.TorusKnotGeometry(0.66, 0.24, 160, 24);
  }
}

function Modules() {
  const row = useRef<THREE.Group>(null);
  const groups = useRef<THREE.Group[]>([]);
  const keyLight = useRef<THREE.PointLight>(null);
  const pos = useRef(0);
  const keyColor = useMemo(() => new THREE.Color(COLORS[0]), []);  

  const items = useMemo(
    () =>
      COLORS.map((c, i) => {
        const col = new THREE.Color(c);
        return {
          geo: makeGeo(i),
          color: col,
          solid: new THREE.MeshStandardMaterial({
            color: col,
            emissive: col,
            emissiveIntensity: 0.35,
            metalness: 0.6,
            roughness: 0.25,
          }),
          wire: new THREE.MeshBasicMaterial({
            color: col,
            wireframe: true,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
          }),
        };
      }),
    []
  );

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    pos.current = damp(pos.current, sectionFx.skillsPos, 6, dt);
    const p = pos.current;

    const r = row.current;
    if (r) {
      r.position.x = -p * SPACING;
      r.rotation.x = damp(r.rotation.x, cursor.y * 0.12, 3, dt);
      r.position.y = damp(r.position.y, cursor.y * 0.18, 3, dt);
    }

    // Tint + place the key light on the centred module.
    const active = Math.max(0, Math.min(COLORS.length - 1, Math.round(p)));
    keyColor.lerp(items[active].color, 1 - Math.exp(-5 * dt));
    if (keyLight.current) keyLight.current.color.copy(keyColor);

    groups.current.forEach((g, i) => {
      if (!g) return;
      const d = Math.min(Math.abs(i - p), 1.5);
      const a = 1 - d / 1.5; // 1 centred → 0 far
      const ease = a * a;
      const s = 0.62 + ease * 0.78;
      g.scale.setScalar(damp(g.scale.x, s, 8, dt));
      g.position.z = damp(g.position.z, ease * 1.1, 6, dt);
      g.rotation.y += dt * (0.18 + ease * 0.55);
      g.rotation.x += dt * 0.08;

      const solid = items[i].solid;
      solid.emissiveIntensity = damp(solid.emissiveIntensity, 0.2 + ease * 2.6, 8, dt);
      const wire = items[i].wire;
      wire.opacity = damp(wire.opacity, 0.12 + ease * 0.6, 8, dt);
    });
  });

  return (
    <>
      <pointLight ref={keyLight} position={[0, 0, 3]} intensity={6} distance={14} decay={2} />
      <group ref={row}>
        {items.map((it, i) => (
          <group
            key={i}
            position={[i * SPACING, 0, 0]}
            ref={(el) => {
              if (el) groups.current[i] = el;
            }}
          >
            <mesh geometry={it.geo} material={it.solid} />
            <mesh geometry={it.geo} material={it.wire} scale={1.12} />
          </group>
        ))}
      </group>
    </>
  );
}

export function SkillsModel({ active }: { active: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 7.4], fov: 42 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 5, 5]} intensity={1.1} />
      <Modules />
      <EffectComposer enableNormalPass={false}>
        <Bloom mipmapBlur intensity={1.1} luminanceThreshold={0.15} luminanceSmoothing={0.3} radius={0.7} />
      </EffectComposer>
    </Canvas>
  );
}

export default SkillsModel;
