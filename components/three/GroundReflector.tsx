"use client";

import { MeshReflectorMaterial } from "@react-three/drei";

/**
 * Subtle reflective floor far below the core. Adds the "awwwards"
 * floor-glow look without pulling attention. We intentionally use
 * a conservative resolution and heavy blur for perf + softness.
 */
export function GroundReflector() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
      <planeGeometry args={[30, 30]} />
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
    </mesh>
  );
}

export default GroundReflector;
