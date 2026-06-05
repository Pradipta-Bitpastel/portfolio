"use client";

import { useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { cursor } from "@/lib/useCursor";
import { sectionFx } from "@/lib/sectionFx";

/**
 * About / SYS.INIT centerpiece — a polished chrome capsule that splits
 * open on scroll (`sectionFx.aboutOpen`, 0→1) to reveal a blooming energy
 * core: a bright pulsing solid, an additive wireframe shell, and an
 * orbiting energy ring. Bloom makes the core glow and light the chrome
 * interior. Lazy-mounted, frame-gated to in-view.
 */

const damp = THREE.MathUtils.damp;
const ACCENT = "#9b5cff";

function Reactor() {
  const tilt = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const top = useRef<THREE.Group>(null);
  const bot = useRef<THREE.Group>(null);
  const core = useRef<THREE.Group>(null);
  const ring = useRef<THREE.Mesh>(null);
  const open = useRef(0);
  const coreSolid = useRef<THREE.MeshStandardMaterial>(null);
  const coreWire = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);
    open.current = damp(open.current, sectionFx.aboutOpen, 6, dt);
    const o = open.current;
    const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 2.4);

    if (top.current) top.current.position.y = o * 1.0;
    if (bot.current) bot.current.position.y = -o * 1.0;

    if (core.current) {
      core.current.scale.setScalar(0.18 + o * 0.92);
      core.current.rotation.y += dt * 0.7;
      core.current.rotation.x += dt * 0.25;
    }
    if (coreSolid.current) coreSolid.current.emissiveIntensity = (1.2 + pulse * 1.0) * (0.3 + o);
    if (coreWire.current) coreWire.current.opacity = (0.35 + pulse * 0.25) * o;

    if (ring.current) {
      ring.current.scale.setScalar(0.6 + o * 0.9);
      ring.current.rotation.z += dt * 1.2;
      ring.current.rotation.x = Math.PI / 2.4;
      (ring.current.material as THREE.MeshBasicMaterial).opacity = o * 0.9;
    }

    const sp = spin.current;
    if (sp) sp.rotation.y += dt * 0.3;
    const t = tilt.current;
    if (t) {
      t.rotation.x = damp(t.rotation.x, cursor.y * 0.22, 3, dt);
      t.rotation.y = damp(t.rotation.y, cursor.x * 0.28, 3, dt);
    }
  });

  return (
    <group ref={tilt}>
      <group ref={spin}>
        {/* Energy core */}
        <group ref={core}>
          <mesh>
            <icosahedronGeometry args={[0.78, 1]} />
            <meshStandardMaterial ref={coreSolid} color={ACCENT} emissive={ACCENT} emissiveIntensity={1.6} roughness={0.3} metalness={0.2} />
          </mesh>
          <mesh scale={1.25}>
            <icosahedronGeometry args={[0.78, 2]} />
            <meshBasicMaterial ref={coreWire} color="#c9b3ff" wireframe transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>

        {/* Orbiting energy ring */}
        <mesh ref={ring}>
          <torusGeometry args={[1.5, 0.025, 12, 96]} />
          <meshBasicMaterial color="#00d4ff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>

        {/* Upper shell */}
        <group ref={top}>
          <mesh>
            <sphereGeometry args={[1.3, 64, 40, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#eef2fa" metalness={1} roughness={0.08} envMapIntensity={1.8} side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* Lower shell */}
        <group ref={bot}>
          <mesh>
            <sphereGeometry args={[1.3, 64, 40, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <meshStandardMaterial color="#cfd6e6" metalness={1} roughness={0.12} envMapIntensity={1.8} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function AboutModel({ active }: { active: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0.2, 5], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[3, 4, 5]} intensity={1.4} />
      <Reactor />
      <Environment resolution={128}>
        <Lightformer intensity={3.5} position={[0, 3, 3]} scale={[8, 3, 1]} color="#ffffff" />
        <Lightformer intensity={2.4} position={[-5, -1, 1]} scale={[5, 6, 1]} color="#9b5cff" />
        <Lightformer intensity={2.4} position={[5, 1, -1]} scale={[5, 6, 1]} color="#4f9cff" />
        <Lightformer intensity={1.6} position={[0, -4, 2]} scale={[8, 3, 1]} color="#00d4ff" />
      </Environment>
      <EffectComposer enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.9} luminanceThreshold={0.2} luminanceSmoothing={0.3} radius={0.65} />
      </EffectComposer>
    </Canvas>
  );
}

export default AboutModel;
