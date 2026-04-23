"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
import { readPerfTier } from "@/lib/usePerfTier";

/**
 * Subtle reflective floor far below the core. Adds the "awwwards"
 * floor-glow look without pulling attention.
 *
 * Perf note: MeshReflectorMaterial does a render-to-texture every
 * frame at the configured resolution, plus a blur pass — this is
 * the single most expensive material in the scene on integrated
 * GPUs. On the `low` perf tier we swap it for a plain standard
 * material with a tinted color, which keeps the floor looking
 * like a surface without any reflection cost.
 */
export function GroundReflector() {
  const low = readPerfTier() === "low";

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
      <planeGeometry args={[30, 30]} />
      {low ? (
        <meshStandardMaterial
          color="#0b0f19"
          metalness={0.4}
          roughness={0.9}
        />
      ) : (
        <MeshReflectorMaterial
          mirror={0.3}
          resolution={512}
          blur={[100, 50]}
          mixBlur={1.2}
          mixStrength={0.4}
          roughness={1}
          depthScale={0.8}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0b0f19"
          metalness={0.6}
        />
      )}
    </mesh>
  );
}

export default GroundReflector;
