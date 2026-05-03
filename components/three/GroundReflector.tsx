"use client";

import { MeshReflectorMaterial } from "@react-three/drei";
import { readPerfTier, getGPUTier } from "@/lib/usePerfTier";

/**
 * Subtle reflective floor far below the core. Adds the "awwwards"
 * floor-glow look without pulling attention.
 *
 * Perf note: MeshReflectorMaterial does a render-to-texture every
 * frame at the configured resolution, plus a blur pass — this is
 * the single most expensive material in the scene on integrated
 * GPUs. The previous threshold (`tier !== 'low'`) was too lenient:
 * mid-spec laptops with high-tier in our heuristic but only an
 * integrated GPU still tanked. We now require BOTH `tier === 'high'`
 * AND `gpuTier === 'high'`. Resolution is also halved (512→256) and
 * blur is halved ([100,50]→[50,25]) so the reflective path itself
 * costs roughly a quarter of what it used to.
 */
export function GroundReflector() {
  const tier = readPerfTier();
  const gpuTier = getGPUTier();
  const useReflector = tier === "high" && gpuTier === "high";

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.5, 0]}>
      <planeGeometry args={[30, 30]} />
      {useReflector ? (
        <MeshReflectorMaterial
          mirror={0.3}
          resolution={256}
          blur={[50, 25]}
          mixBlur={1.2}
          mixStrength={0.4}
          roughness={1}
          depthScale={0.8}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#0b0f19"
          metalness={0.6}
        />
      ) : (
        // Static plane with a soft gradient feel — meshStandardMaterial
        // with a darker tint + low metalness to suggest a glossy floor
        // without any render-to-texture cost.
        <meshStandardMaterial
          color="#0b0f19"
          metalness={0.4}
          roughness={0.85}
        />
      )}
    </mesh>
  );
}

export default GroundReflector;
