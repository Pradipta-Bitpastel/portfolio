"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { cursor } from "@/lib/useCursor";
import { metricsStore } from "@/lib/metricsStore";

/**
 * The WebGL half of the Metrics section — split-orb + its own tiny
 * Canvas. Lives in its own module so MetricsSection can `next/dynamic`
 * import it (ssr:false): three.js + drei stay out of the main page
 * bundle and only load on capable desktops when the section is reached.
 */

const damp = THREE.MathUtils.damp;

function SplitOrb({ scrollDriven }: { scrollDriven: boolean }) {
  const topRef = useRef<THREE.Group>(null);
  const botRef = useRef<THREE.Group>(null);
  const riseRef = useRef<THREE.Group>(null);
  const spinRef = useRef<THREE.Group>(null);
  const gap = useRef(0);
  const domeColor = useMemo(() => new THREE.Color(metricsStore.dome), []);
  const targetDome = useMemo(() => new THREE.Color(), []);
  const domeMat = useRef<THREE.MeshStandardMaterial>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.05);

    // `open` (0..1) comes from scroll: the halves split apart to reveal
    // the number in the gap. Floor keeps the orb present (never a naked
    // floating number between stats).
    const raw = scrollDriven ? metricsStore.open : 1;
    const open = 0.32 + raw * 0.68;
    gap.current = damp(gap.current, open * 0.62, 6, dt);
    const g = gap.current;
    if (topRef.current) topRef.current.position.y = g;
    if (botRef.current) botRef.current.position.y = -g;
    // Barely sink — stays composed in frame.
    if (riseRef.current) {
      riseRef.current.position.y = damp(riseRef.current.position.y, (1 - raw) * -0.4, 6, dt);
    }

    targetDome.set(metricsStore.dome);
    if (domeMat.current) {
      domeColor.lerp(targetDome, 1 - Math.exp(-5 * dt));
      domeMat.current.color.copy(domeColor);
      domeMat.current.emissive.copy(domeColor).multiplyScalar(0.5);
    }
    // Glowing energy ring in the split, brightening as it opens.
    if (ringRef.current) {
      ringRef.current.position.y = 0;
      ringRef.current.scale.setScalar(1 + g * 0.1);
      const pulse = 0.7 + 0.3 * Math.sin(state.clock.elapsedTime * 3);
      if (ringMat.current) {
        ringMat.current.color.copy(domeColor);
        ringMat.current.opacity = raw * pulse;
      }
    }

    const spin = spinRef.current;
    if (spin) {
      spin.rotation.y += dt * 0.3;
      spin.rotation.x = damp(spin.rotation.x, cursor.y * 0.2, 3, dt);
      spin.rotation.z = damp(spin.rotation.z, cursor.x * -0.12, 3, dt);
    }
  });

  return (
    <group ref={riseRef}>
      <group ref={spinRef}>
        {/* Glowing energy ring in the split */}
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.04, 0.02, 12, 96]} />
          <meshBasicMaterial ref={ringMat} color="#9b5cff" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>

        {/* Upper dome — tinted to the active metric */}
        <group ref={topRef}>
          <mesh>
            <sphereGeometry args={[1, 64, 48, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial
              ref={domeMat}
              color="#9b5cff"
              metalness={0.35}
              roughness={0.3}
              emissive="#9b5cff"
              emissiveIntensity={0.18}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1, 64]} />
            <meshStandardMaterial color="#1a2238" metalness={0.4} roughness={0.5} side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* Lower bowl — glassy chrome */}
        <group ref={botRef}>
          <mesh>
            <sphereGeometry args={[1, 64, 48, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
            <meshStandardMaterial color="#f2f5fb" metalness={0.95} roughness={0.12} envMapIntensity={1.6} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[1, 64]} />
            <meshStandardMaterial color="#c4ccdc" metalness={0.9} roughness={0.2} side={THREE.DoubleSide} />
          </mesh>
        </group>
      </group>
    </group>
  );
}

export function MetricsOrb({ active, scrollDriven = true }: { active: boolean; scrollDriven?: boolean }) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 4.2], fov: 40 }}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.7} />
      <directionalLight position={[3, 4, 5]} intensity={1.8} />
      <directionalLight position={[-3, 1, 2]} intensity={0.6} color="#9b5cff" />
      <SplitOrb scrollDriven={scrollDriven} />
      {/* Baked environment (no network) — a bright ring of light cards so
          the chrome bowl reads as polished, iridescent metal. */}
      <Environment resolution={128}>
        <Lightformer intensity={3.2} position={[0, 3, 3]} scale={[8, 3, 1]} color="#ffffff" />
        <Lightformer intensity={2.4} position={[0, 0, 5]} scale={[10, 10, 1]} color="#cfe0ff" />
        <Lightformer intensity={2} position={[-5, -1, 1]} scale={[4, 6, 1]} color="#9b5cff" />
        <Lightformer intensity={2} position={[5, 1, -1]} scale={[4, 6, 1]} color="#00d4ff" />
        <Lightformer intensity={1.6} position={[0, -4, 2]} scale={[8, 3, 1]} color="#ff8a3c" />
      </Environment>
      <EffectComposer enableNormalPass={false}>
        <Bloom mipmapBlur intensity={0.7} luminanceThreshold={0.4} luminanceSmoothing={0.3} radius={0.6} />
      </EffectComposer>
    </Canvas>
  );
}

export default MetricsOrb;
