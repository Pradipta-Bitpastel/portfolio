"use client";

import { Environment, Sparkles } from "@react-three/drei";

/**
 * Lighting rig + ambient FX for the Developer Core.
 *
 * - Ambient + key directional for base read
 * - Tri-tone rim point lights (blue/purple/cyan) for neon HUD accent
 * - Environment preset "warehouse" — cleaner IBL than "city" for the
 *   iridescent mid-shell material
 * - Ambient <Sparkles> layer for depth / "data dust" feel
 */
export function Lights() {
  return (
    <>
      <ambientLight intensity={0.22} />
      <directionalLight position={[5, 6, 5]} intensity={0.9} />

      {/* Rim lights */}
      <pointLight
        position={[-4, 2, 3]}
        color="#4f9cff"
        intensity={1.5}
        distance={10}
        decay={2}
      />
      <pointLight
        position={[4, -1, -3]}
        color="#9b5cff"
        intensity={1.5}
        distance={10}
        decay={2}
      />
      <pointLight
        position={[0, 4, -4]}
        color="#00d4ff"
        intensity={1.5}
        distance={10}
        decay={2}
      />

      {/* Environment IBL. "warehouse" gives cleaner contrast for the
          iridescent metal; drei lazily loads the preset. */}
      <Environment preset="warehouse" environmentIntensity={0.4} />

      {/* Ambient data-dust sparkles for depth */}
      <Sparkles
        count={60}
        scale={[12, 8, 12]}
        size={2}
        speed={0.3}
        color="#4f9cff"
        opacity={0.6}
      />
    </>
  );
}

export default Lights;
