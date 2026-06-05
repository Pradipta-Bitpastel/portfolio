"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useGLTF, Environment, Lightformer, OrbitControls } from "@react-three/drei";

/**
 * The 3D showcase artifact — Khronos' DamagedHelmet (physically-based,
 * fully textured), rendered as a studio product shot you can grab and
 * orbit FREELY (drei OrbitControls → inertial damping, full 360° spin,
 * and a gentle idle auto-rotate that pauses the moment you touch it and
 * resumes after a beat). Zoom/pan are off so the page still scrolls and
 * the framing stays fixed. Tuned for a steady 60fps: capped DPR, a
 * baked-once Lightformer env, and a cheap gradient contact shadow (no
 * realtime shadow map). A slow HUD reticle ring sells the "3D UI" feel.
 */

const MODEL = "/models/DamagedHelmet.glb";

/** Cheap radial-gradient shadow texture (no realtime shadow map). */
function useShadowTexture() {
  return useMemo(() => {
    if (typeof document === "undefined") return null;
    const s = 256;
    const cv = document.createElement("canvas");
    cv.width = cv.height = s;
    const ctx = cv.getContext("2d");
    if (!ctx) return null;
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(0,0,0,0.55)");
    g.addColorStop(0.5, "rgba(0,0,0,0.22)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
}

function Helmet() {
  const ring = useRef<THREE.Group>(null);
  const { scene } = useGLTF(MODEL);

  // The helmet itself stays put — the camera orbits it (OrbitControls). Only
  // the decorative reticle ring keeps its own slow spin in place.
  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    if (ring.current) ring.current.rotation.z += dt * 0.15;
  });

  return (
    <group>
      <primitive object={scene} scale={1.6} />
      {/* HUD reticle ring */}
      <group ref={ring}>
        <mesh rotation={[Math.PI / 2.1, 0, 0]}>
          <torusGeometry args={[2.4, 0.006, 8, 120]} />
          <meshBasicMaterial color="#ff7a1a" transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

/**
 * Free orbit with inertia + a courteous idle auto-rotate: it drifts slowly
 * on its own, STOPS the instant you grab it (so your drag is 1:1 and sticks),
 * then resumes the drift ~2.5s after you let go. Zoom + pan are disabled so
 * wheel events fall through to the page scroll and the framing stays locked.
 */
function OrbitRig() {
  const ref = useRef<OrbitControlsImpl | null>(null);
  const resume = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (resume.current) clearTimeout(resume.current); }, []);

  // DEBUG (QA only): expose the current orbit azimuth so the verify script can
  // confirm dragging actually rotates the camera and that it STICKS (no snap).
  // Remove the window write before shipping.
  useFrame(() => {
    if (process.env.NODE_ENV !== "production" && ref.current) {
      (window as unknown as { __artifactAz?: number }).__artifactAz =
        +ref.current.getAzimuthalAngle().toFixed(3);
    }
  });

  return (
    <OrbitControls
      ref={ref}
      makeDefault
      enablePan={false}
      enableZoom={false}
      enableDamping
      dampingFactor={0.09}
      rotateSpeed={0.62}
      autoRotate
      autoRotateSpeed={0.55}
      minPolarAngle={Math.PI * 0.30}
      maxPolarAngle={Math.PI * 0.70}
      target={[0, 0.1, 0]}
      onStart={() => {
        if (resume.current) clearTimeout(resume.current);
        if (ref.current) ref.current.autoRotate = false;
      }}
      onEnd={() => {
        resume.current = setTimeout(() => {
          if (ref.current) ref.current.autoRotate = true;
        }, 2500);
      }}
    />
  );
}

export function ArtifactModel({ active }: { active: boolean }) {
  const shadowTex = useShadowTexture();

  return (
    <Canvas
      frameloop={active ? "always" : "never"}
      dpr={[1, 1.35]}
      camera={{ position: [0, 0.1, 5], fov: 38 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
    >
      <ambientLight intensity={0.3} />
      <directionalLight position={[4, 6, 5]} intensity={2.2} color="#fff6ec" />
      <pointLight position={[-3, -2, -4]} intensity={5} color="#ff7a1a" distance={16} decay={2} />

      <Helmet />
      <OrbitRig />

      {shadowTex && (
        <mesh position={[0, -1.55, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[7, 7]} />
          <meshBasicMaterial map={shadowTex} transparent depthWrite={false} opacity={0.9} />
        </mesh>
      )}

      {/* Baked once — not a per-frame cost. */}
      <Environment resolution={128}>
        <Lightformer intensity={3} position={[0, 4, 4]} scale={[10, 4, 1]} color="#ffffff" />
        <Lightformer intensity={1.6} position={[-6, 0, 2]} scale={[4, 8, 1]} color="#ffd9b0" />
        <Lightformer intensity={1.4} position={[6, 1, -2]} scale={[4, 8, 1]} color="#bcd2ff" />
      </Environment>
    </Canvas>
  );
}

useGLTF.preload(MODEL);

export default ArtifactModel;
