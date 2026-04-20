"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { Scene as DeveloperCoreScene } from "./Scene";

/**
 * The R3F <Canvas/> wrapper. We keep the Canvas-level props here
 * (DPR, gl options, perf hints) and defer the actual scene graph
 * to `./Scene`. This file is dynamic-imported (ssr:false) from
 * SceneContainer, keeping three.js out of the server bundle.
 *
 * iter7: we connect the R3F event source to `document.documentElement`
 * so pointer events still flow into the scene even though the canvas
 * wrapper sits at z-0 with `pointer-events-none` to keep DOM CTAs
 * clickable. R3F's hit-test prioritises overlapping DOM only when
 * we use `eventPriority` with a non-default filter — for our case the
 * laptop is the only interactive 3D mesh and it sits behind all
 * section text, so a click anywhere "in space" simply misses.
 */
export function Scene() {
  const [eventSource, setEventSource] = useState<HTMLElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setEventSource(document.documentElement);
  }, []);

  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 0, 8], fov: 45 }}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      performance={{ min: 0.5 }}
      eventSource={eventSource ?? undefined}
      eventPrefix="client"
    >
      <DeveloperCoreScene />
    </Canvas>
  );
}

export default Scene;
