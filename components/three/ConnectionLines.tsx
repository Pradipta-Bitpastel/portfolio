"use client";

import { Line } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import { sceneStore, type ModuleId } from "@/lib/sceneStore";
import { readPerfTier } from "@/lib/usePerfTier";

/**
 * Glowing links from the Core (origin) to each orbiting module.
 *
 * Each module gets TWO lines:
 *   - outer: thicker, additive-blended, module-color soft glow
 *   - inner: thin crisp white/cyan line for readability
 *
 * drei's <Line/> is backed by Line2/LineGeometry. We grab the Line2
 * instance via ref and call `geometry.setPositions()` each frame with
 * a fresh Float32Array so the line endpoints follow the module groups.
 * Opacity is left at a default (0) so GSAP timelines can reveal per
 * link; the ProjectsSection scrub targets material.opacity.
 */

const MODULE_IDS: ModuleId[] = ["frontend", "backend", "devops", "cloud", "mobile"];

const MODULE_COLOR: Record<ModuleId, string> = {
  frontend: "#4f9cff",
  backend:  "#ff8a3c",
  devops:   "#39ffa5",
  cloud:    "#9b5cff",
  mobile:   "#00d4ff",
};

/**
 * Minimal shape of the Line2/LineSegments2 instance we interact with
 * each frame. drei returns this from its forwarded ref.
 */
type LineLike = THREE.Object3D & {
  geometry: THREE.BufferGeometry & {
    setPositions?: (arr: ArrayLike<number>) => void;
  };
};

function ModuleLink({ id }: { id: ModuleId }) {
  const outerRef = useRef<LineLike | null>(null);
  const innerRef = useRef<LineLike | null>(null);
  const tmpVec = useRef(new THREE.Vector3());
  const bufferOuter = useRef(new Float32Array(6));
  const bufferInner = useRef(new Float32Array(6));
  const frame = useRef(0);
  // On low-tier, update the line buffers every 3rd frame instead of
  // every frame. Modules rotate slowly (the rig spins at 0.04 rad/sec),
  // so the visual lag is imperceptible but GPU buffer uploads drop ~67%.
  const stride = readPerfTier() === "low" ? 3 : 1;

  // Initial zero-length line at origin so the geometry exists.
  const initialPoints: [number, number, number][] = [
    [0, 0, 0],
    [0, 0, 0],
  ];

  const color = MODULE_COLOR[id];

  useFrame(() => {
    frame.current++;
    if (frame.current % stride !== 0) return;
    const outer = outerRef.current;
    const inner = innerRef.current;
    const moduleGroup = sceneStore.modules[id].ref;
    if (!moduleGroup) return;

    moduleGroup.getWorldPosition(tmpVec.current);

    if (outer) {
      const b = bufferOuter.current;
      b[0] = 0;             b[1] = 0;             b[2] = 0;
      b[3] = tmpVec.current.x;
      b[4] = tmpVec.current.y;
      b[5] = tmpVec.current.z;
      outer.geometry.setPositions?.(b);
    }

    if (inner) {
      const b = bufferInner.current;
      b[0] = 0;             b[1] = 0;             b[2] = 0;
      b[3] = tmpVec.current.x;
      b[4] = tmpVec.current.y;
      b[5] = tmpVec.current.z;
      inner.geometry.setPositions?.(b);
    }
  });

  return (
    <group>
      {/* Outer soft-glow copy — wider, additive, module color */}
      <Line
        ref={(instance) => {
          outerRef.current = (instance as unknown as LineLike) ?? null;
        }}
        points={initialPoints}
        color={color}
        lineWidth={6}
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
      {/* Inner crisp readability copy — thinner, normal blending */}
      <Line
        ref={(instance) => {
          innerRef.current = (instance as unknown as LineLike) ?? null;
        }}
        points={initialPoints}
        color="#ffffff"
        lineWidth={2}
        transparent
        opacity={0}
        depthWrite={false}
      />
    </group>
  );
}

export function ConnectionLines() {
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    sceneStore.connections.ref = groupRef.current;
    return () => {
      sceneStore.connections.ref = null;
    };
  }, []);

  return (
    <group ref={groupRef}>
      {MODULE_IDS.map((id) => (
        <ModuleLink key={id} id={id} />
      ))}
    </group>
  );
}

export default ConnectionLines;
