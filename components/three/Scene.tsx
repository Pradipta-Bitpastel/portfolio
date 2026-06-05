"use client";

import { Suspense } from "react";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useDeviceCapabilities } from "@/lib/usePerfTier";
import { CameraController } from "./CameraController";
import { Lights } from "./Lights";
import { ParticleField } from "./ParticleField";
import { TravelerModel } from "./TravelerModel";

/**
 * Ambient global scene: a camera rig, a light pair and a drifting
 * particle field. The 3D "hero" objects now live per-section (the
 * orbiting-cards hero, the Universe-in-Numbers orb, etc.) — this global
 * layer is just star-dust depth behind the content. The camera still
 * drifts per section so the dust parallaxes as you scroll.
 *
 * A single, gentle Bloom pass is added ONLY on confirmed-high desktops.
 */
export function Scene({ perfLow = false }: { perfLow?: boolean }) {
  const { tier, gpuTier, isLowEnd, isWindows } = useDeviceCapabilities();
  const enablePost =
    !perfLow && !isLowEnd && tier === "high" && gpuTier === "high" && !isWindows;

  return (
    <Suspense fallback={null}>
      <CameraController />
      <Lights />
      <ParticleField />
      {/* The ONE robot travels through the lower sections here (scroll-driven
          via samplePose), then hands off from the hero's own [HeroRobot] (which
          dives away at the hero's end). HeroRobot CLONES the GLB, so the two
          instances never fight over the shared scene. */}
      <TravelerModel />
      {enablePost && (
        // PERF: an EffectComposer adds a per-frame FBO scene-render plus
        // mip blur passes + a composite, every frame the canvas runs.
        // `mipmapBlur` is already the cheap path; we trim the rest so only
        // the brightest core/rim texels bloom:
        //   - luminanceThreshold 0.85 → 0.90: fewer texels enter the bloom
        //     buffer, so the bright-pass + blur touch a smaller masked area.
        //   - intensity 0.32 → 0.28 and radius 0.45 → 0.40: a tighter,
        //     shorter blur kernel = fewer mip taps per frame.
        //   - resolutionScale 0.5: the bloom FBO/blur runs at half the
        //     canvas resolution (the glow is low-frequency, so a half-res
        //     bloom is visually indistinguishable but ~4× cheaper to blur).
        // Net: the rim still glows; the per-frame post cost drops sharply.
        <EffectComposer
          enableNormalPass={false}
          resolutionScale={0.5}
          multisampling={0}
        >
          <Bloom
            mipmapBlur
            intensity={0.28}
            luminanceThreshold={0.9}
            luminanceSmoothing={0.12}
            radius={0.4}
          />
        </EffectComposer>
      )}
    </Suspense>
  );
}

export default Scene;
