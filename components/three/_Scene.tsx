"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Scene as DeveloperCoreScene } from "./Scene";
import { usePerfTier } from "@/lib/usePerfTier";

/**
 * The R3F <Canvas/> wrapper. We keep the Canvas-level props here
 * (DPR, gl options, perf hints) and defer the actual scene graph
 * to `./Scene`. This file is dynamic-imported (ssr:false) from
 * SceneContainer, keeping three.js out of the server bundle.
 *
 * Performance knobs applied here:
 *   - `frameloop` is driven by Page Visibility + document focus —
 *     when the tab is hidden (or the window is backgrounded) we flip
 *     the Canvas to `never` so no frames are rendered. On resume we
 *     flip back to `always`. This is the single biggest win for
 *     battery / fps on low-spec laptops, because the scene still
 *     had ~24 active useFrame loops even when invisible.
 *   - DPR cap drops from 1.75 → 1.5 on the `low` tier — fewer
 *     fragments shaded per frame.
 *   - performance.min is lowered so R3F adaptively scales down
 *     faster if fps drops.
 */
export function Scene() {
  const [eventSource, setEventSource] = useState<HTMLElement | null>(null);
  const [frameloop, setFrameloop] =
    useState<"always" | "never">("always");
  const tier = usePerfTier();
  const hiddenRef = useRef(false);

  useEffect(() => {
    if (typeof document === "undefined") return;
    setEventSource(document.documentElement);

    const update = () => {
      const hidden = document.hidden;
      if (hidden === hiddenRef.current) return;
      hiddenRef.current = hidden;
      setFrameloop(hidden ? "never" : "always");
    };
    document.addEventListener("visibilitychange", update);
    return () => {
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const isLow = tier === "low";

  return (
    <Canvas
      frameloop={frameloop}
      dpr={isLow ? [1, 1.25] : [1, 1.5]}
      camera={{ position: [0, 0, 8], fov: 45 }}
      gl={{
        antialias: !isLow,
        alpha: true,
        powerPreference: "high-performance",
        stencil: false,
        depth: true,
      }}
      performance={{ min: 0.35 }}
      eventSource={eventSource ?? undefined}
      eventPrefix="client"
    >
      <DeveloperCoreScene perfLow={isLow} />
    </Canvas>
  );
}

export default Scene;
