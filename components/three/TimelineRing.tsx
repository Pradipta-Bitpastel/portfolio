"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sceneStore } from "@/lib/sceneStore";

/**
 * Outer timeline ring (Experience section). Hidden by default
 * (opacity 0, visible=false) so GSAP can fade it in at section enter.
 * 4 glowing nodes are distributed every 90deg to represent the 4
 * career milestones.
 */

const RING_RADIUS = 4.2;
const NODE_COUNT = 4;

export function TimelineRing() {
  const groupRef = useRef<THREE.Group>(null);

  // Precompute node positions on the XZ plane.
  const nodePositions = useMemo(() => {
    const arr: [number, number, number][] = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const a = (i / NODE_COUNT) * Math.PI * 2;
      arr.push([Math.cos(a) * RING_RADIUS, 0, Math.sin(a) * RING_RADIUS]);
    }
    return arr;
  }, []);

  useEffect(() => {
    sceneStore.timelineRing.ref = groupRef.current;
    return () => {
      sceneStore.timelineRing.ref = null;
    };
  }, []);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  return (
    <group ref={groupRef} visible={false}>
      {/* Main torus — laid flat on the XZ plane */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RING_RADIUS, 0.04, 16, 128]} />
        <meshStandardMaterial
          color="#9b5cff"
          emissive="#9b5cff"
          emissiveIntensity={0.6}
          transparent
          opacity={0}
          roughness={0.3}
          metalness={0.4}
        />
      </mesh>

      {/* 4 node markers */}
      {nodePositions.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial
            color="#9b5cff"
            emissive="#9b5cff"
            emissiveIntensity={1.2}
            transparent
            opacity={0}
          />
        </mesh>
      ))}
    </group>
  );
}

export default TimelineRing;
