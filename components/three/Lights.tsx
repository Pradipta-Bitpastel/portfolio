"use client";

import { Sparkles } from "@react-three/drei";
import { useDeviceCapabilities } from "@/lib/usePerfTier";

/**
 * Lighting rig + ambient FX for the Developer Core.
 *
 * - Ambient + key directional + hemisphere for base read (the
 *   hemisphere replaces the previous `<Environment preset="warehouse"/>`
 *   IBL, which forced a runtime HDR fetch from poly.haven and could
 *   fail behind firewalls / on slow connections).
 * - Tri-tone rim point lights (blue/purple/cyan) for neon HUD accent.
 * - Ambient <Sparkles> layer for depth — gated to high tier (count=30)
 *   and disabled entirely on low tier.
 *
 * Total light count is capped at 5 scene-wide so we don't blow past
 * the WebGL uniform budget on integrated GPUs (CursorLight + Core's
 * point light + DevStation's rig already account for 5+ extra).
 */
export function Lights() {
  const { tier, isLowEnd } = useDeviceCapabilities();
  const isHigh = tier === "high" && !isLowEnd;

  return (
    <>
      {/* Slightly stronger ambient compensates for the dropped IBL. */}
      <ambientLight intensity={0.35} />
      {/* Hemisphere — cheap fake-IBL: sky tint top, ground tint bottom. */}
      <hemisphereLight args={["#9fc5ff", "#1a1024", 0.45]} />
      <directionalLight position={[5, 6, 5]} intensity={0.9} />

      {/* Rim lights (3 — keeps total scene-wide light count <= 5). */}
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

      {/* Ambient data-dust sparkles — high tier only. */}
      {isHigh && (
        <Sparkles
          count={30}
          scale={[12, 8, 12]}
          size={2}
          speed={0.3}
          color="#4f9cff"
          opacity={0.6}
        />
      )}
    </>
  );
}

export default Lights;
