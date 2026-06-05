"use client";

import { Suspense, type MutableRefObject } from "react";
import { Canvas } from "@react-three/fiber";
import { HeroRobotScene } from "./HeroRobot";

/**
 * The hero robot's own transparent R3F canvas. Kept in its OWN file (the
 * Canvas, not the scene) so editing the scene in HeroRobot.tsx hot-reloads
 * the contents inside the live canvas instead of recreating it (a recreated
 * Canvas blanks to black on HMR). Dynamically imported by HeroSection with
 * ssr:false so three.js stays out of the main bundle and never SSRs.
 *
 *   active=false → frameloop:'never' (no GPU when the hero is off-screen).
 *   alpha:true   → composites over the parallax photos (no opaque black box).
 */
export function HeroRobotCanvas({
  active,
  progressRef,
}: {
  active: boolean;
  progressRef: MutableRefObject<number>;
}) {
  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      // PERF: the bot is small + stylised, so a low DPR cap and NO MSAA keep
      // the 2nd canvas cheap; R3F adaptively drops resolution if fps dips.
      dpr={[1, 1.2]}
      camera={{ position: [0, 0.15, 6], fov: 42 }}
      gl={{ antialias: false, alpha: true, powerPreference: "default", stencil: false }}
      performance={{ min: 0.5 }}
      style={{ pointerEvents: "none" }}
    >
      <Suspense fallback={null}>
        <HeroRobotScene progressRef={progressRef} />
      </Suspense>
    </Canvas>
  );
}

export default HeroRobotCanvas;
