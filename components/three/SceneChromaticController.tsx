"use client";

import { useFrame } from "@react-three/fiber";
import { useContext } from "react";
import { EffectComposerContext } from "@react-three/postprocessing";
import * as THREE from "three";
import { sceneStore } from "@/lib/sceneStore";

/**
 * Reads `sceneStore.fx.chromaticIntensity` each frame and updates the
 * ChromaticAberration effect inside EffectComposer. SectionOrchestrator
 * tweens the store value between pins for the SMASH transition flash.
 *
 * We locate the ChromaticAberration effect by walking the composer's
 * passes and checking each effect's uniforms map for an "offset"
 * uniform whose value is a THREE.Vector2.
 */
export function SceneChromaticController() {
  const composerCtx = useContext(EffectComposerContext);

  useFrame(() => {
    const composer = composerCtx?.composer;
    if (!composer) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const passes: any[] = (composer as any).passes ?? [];
    const intensity = sceneStore.fx.chromaticIntensity;
    const off = 0.0006 + intensity * 0.004;
    for (const pass of passes) {
      const effects = pass?.effects;
      if (!effects || typeof effects.length !== "number") continue;
      for (const eff of effects) {
        const uniforms = eff?.uniforms;
        if (!uniforms || typeof uniforms.get !== "function") continue;
        const u = uniforms.get("offset");
        const val = u?.value;
        if (val instanceof THREE.Vector2) {
          val.set(off, off);
        }
      }
    }
  });

  return null;
}

export default SceneChromaticController;
