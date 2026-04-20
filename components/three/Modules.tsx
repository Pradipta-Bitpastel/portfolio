"use client";

import { Float, RoundedBox } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { sceneStore, type ModuleId } from "@/lib/sceneStore";

/**
 * 5 module satellites orbiting the Core. Each one is now a small
 * themed "device" rather than a primitive, to feel like an
 * award-portfolio scene. Positions stay on the XZ orbit (radius 3)
 * so existing GSAP timelines keep working.
 *
 * Frontend — holographic screen slab + scanline overlay
 * Backend  — stacked server racks with LED dots
 * DevOps   — twin tori + 3 orbiting CI/CD pill containers
 * Cloud    — transmission-material puffy cluster w/ aura
 * Mobile   — phone slab + tiny orbiting satellite
 *
 * Every module group still registers to sceneStore.modules[id].ref
 * (group) and .mesh (primary mesh whose material GSAP dims/boosts).
 */

type ModuleDef = {
  id: ModuleId;
  angle: number; // radians
  yOffset: number;
};

const RADIUS = 2.2;
const MODULE_SCALE = 0.7;

const MODULE_DEFS: ModuleDef[] = [
  { id: "frontend", angle: 0,                      yOffset:  0.3 },
  { id: "backend",  angle: (72 * Math.PI) / 180,   yOffset: -0.2 },
  { id: "devops",   angle: (144 * Math.PI) / 180,  yOffset:  0.4 },
  { id: "cloud",    angle: (216 * Math.PI) / 180,  yOffset: -0.3 },
  { id: "mobile",   angle: (288 * Math.PI) / 180,  yOffset:  0.2 },
];

type ModuleOrbitProps = {
  id: ModuleId;
  angle: number;
  yOffset: number;
  phase: number;
  children: React.ReactNode;
  spin?: [number, number, number];
};

const MeshRefContext =
  createContext<React.MutableRefObject<THREE.Mesh | null> | null>(null);
function usePrimaryMeshRef() {
  return useContext(MeshRefContext);
}

function ModuleOrbit({ id, angle, yOffset, phase, children, spin = [0.2, 0.3, 0.1] }: ModuleOrbitProps) {
  const groupRef = useRef<THREE.Group>(null);
  const innerRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);

  const basePos = useMemo(() => {
    const x = Math.cos(angle) * RADIUS;
    const z = Math.sin(angle) * RADIUS;
    return new THREE.Vector3(x, yOffset, z);
  }, [angle, yOffset]);

  useEffect(() => {
    sceneStore.modules[id].ref = groupRef.current;
    sceneStore.modules[id].mesh = meshRef.current;
    return () => {
      sceneStore.modules[id].ref = null;
      sceneStore.modules[id].mesh = null;
    };
  }, [id]);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.position.y = basePos.y + Math.sin(t + phase) * 0.1;
    }
    if (innerRef.current) {
      innerRef.current.rotation.x += spin[0] * delta;
      innerRef.current.rotation.y += spin[1] * delta;
      innerRef.current.rotation.z += spin[2] * delta;
    }
  });

  return (
    <group ref={groupRef} position={[basePos.x, basePos.y, basePos.z]}>
      <group ref={innerRef} scale={MODULE_SCALE}>
        <MeshRefContext.Provider value={meshRef}>
          {children}
        </MeshRefContext.Provider>
      </group>
    </group>
  );
}

/* -------------------- Individual module visuals -------------------- */

const INITIAL_EMISSIVE = 0.45;

function FrontendModule() {
  const primary = usePrimaryMeshRef();
  // A rounded slab facing outward with a bright holo face + scanlines.
  return (
    <group>
      {/* Device chassis — primary mesh */}
      <RoundedBox
        ref={primary ?? undefined}
        args={[0.7, 0.5, 0.08]}
        radius={0.05}
        smoothness={3}
      >
        <meshStandardMaterial
          color="#4f9cff"
          emissive="#4f9cff"
          emissiveIntensity={INITIAL_EMISSIVE}
          roughness={0.3}
          metalness={0.6}
          transparent
        />
      </RoundedBox>
      {/* Holo screen face (floats in front) */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[0.55, 0.36]} />
        <meshBasicMaterial
          color="#7fb6ff"
          transparent
          opacity={0.85}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Scanline stripes overlay — thin emissive bars */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[0, 0.15 - i * 0.1, 0.07]}>
          <planeGeometry args={[0.5, 0.012]} />
          <meshBasicMaterial
            color="#4f9cff"
            transparent
            opacity={0.4}
            toneMapped={false}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function BackendModule() {
  const primary = usePrimaryMeshRef();
  // Stacked server racks
  return (
    <group>
      {/* Primary rack (center) */}
      <RoundedBox
        ref={primary ?? undefined}
        args={[0.6, 0.22, 0.45]}
        radius={0.04}
        smoothness={3}
      >
        <meshStandardMaterial
          color="#ff8a3c"
          emissive="#ff8a3c"
          emissiveIntensity={INITIAL_EMISSIVE}
          roughness={0.35}
          metalness={0.45}
          transparent
        />
      </RoundedBox>
      {/* Rack above */}
      <RoundedBox
        args={[0.6, 0.22, 0.45]}
        radius={0.04}
        smoothness={3}
        position={[0, 0.28, 0]}
      >
        <meshStandardMaterial
          color="#ff8a3c"
          emissive="#ff8a3c"
          emissiveIntensity={INITIAL_EMISSIVE * 0.7}
          roughness={0.35}
          metalness={0.45}
          transparent
        />
      </RoundedBox>
      {/* Rack below */}
      <RoundedBox
        args={[0.6, 0.22, 0.45]}
        radius={0.04}
        smoothness={3}
        position={[0, -0.28, 0]}
      >
        <meshStandardMaterial
          color="#ff8a3c"
          emissive="#ff8a3c"
          emissiveIntensity={INITIAL_EMISSIVE * 0.7}
          roughness={0.35}
          metalness={0.45}
          transparent
        />
      </RoundedBox>
      {/* LED rows */}
      {[-0.28, 0, 0.28].map((y, i) => (
        <group key={i} position={[0.28, y, 0]}>
          {[0, 1, 2, 3].map((j) => (
            <mesh key={j} position={[0.02, 0.07 - j * 0.05, 0]}>
              <sphereGeometry args={[0.015, 8, 8]} />
              <meshBasicMaterial
                color={j % 2 === 0 ? "#39ffa5" : "#ff8a3c"}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

function DevOpsModule() {
  const primary = usePrimaryMeshRef();
  // Twin tori + orbiting pill containers
  const pillGroupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (pillGroupRef.current) {
      pillGroupRef.current.rotation.y += delta * 0.8;
    }
  });
  return (
    <group>
      {/* Primary torus */}
      <mesh ref={primary ?? undefined}>
        <torusGeometry args={[0.38, 0.07, 12, 48]} />
        <meshStandardMaterial
          color="#39ffa5"
          emissive="#39ffa5"
          emissiveIntensity={INITIAL_EMISSIVE}
          roughness={0.25}
          metalness={0.5}
          transparent
        />
      </mesh>
      {/* Inner torus, different axis */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.28, 0.04, 10, 32]} />
        <meshStandardMaterial
          color="#39ffa5"
          emissive="#39ffa5"
          emissiveIntensity={INITIAL_EMISSIVE * 0.7}
          roughness={0.3}
          metalness={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
      {/* Orbiting CI/CD pill containers */}
      <group ref={pillGroupRef}>
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.55, 0, Math.sin(a) * 0.55]}>
              <capsuleGeometry args={[0.05, 0.1, 4, 8]} />
              <meshStandardMaterial
                color="#39ffa5"
                emissive="#39ffa5"
                emissiveIntensity={0.8}
                roughness={0.4}
                metalness={0.3}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
}

function CloudModule() {
  const primary = usePrimaryMeshRef();
  // Overlapping spheres forming a puffy cluster
  return (
    <group>
      {/* Primary main sphere */}
      <mesh ref={primary ?? undefined}>
        <sphereGeometry args={[0.38, 24, 24]} />
        <meshStandardMaterial
          color="#9b5cff"
          emissive="#9b5cff"
          emissiveIntensity={INITIAL_EMISSIVE}
          roughness={0.4}
          metalness={0.2}
          transparent
          opacity={0.8}
        />
      </mesh>
      {/* Secondary puffs */}
      <mesh position={[0.28, 0.1, 0]}>
        <sphereGeometry args={[0.26, 20, 20]} />
        <meshStandardMaterial
          color="#9b5cff"
          emissive="#9b5cff"
          emissiveIntensity={INITIAL_EMISSIVE * 0.85}
          roughness={0.5}
          metalness={0.1}
          transparent
          opacity={0.7}
        />
      </mesh>
      <mesh position={[-0.26, 0.08, 0.05]}>
        <sphereGeometry args={[0.22, 18, 18]} />
        <meshStandardMaterial
          color="#9b5cff"
          emissive="#9b5cff"
          emissiveIntensity={INITIAL_EMISSIVE * 0.85}
          roughness={0.5}
          metalness={0.1}
          transparent
          opacity={0.7}
        />
      </mesh>
      <mesh position={[0, -0.2, 0.1]}>
        <sphereGeometry args={[0.24, 18, 18]} />
        <meshStandardMaterial
          color="#9b5cff"
          emissive="#9b5cff"
          emissiveIntensity={INITIAL_EMISSIVE * 0.8}
          roughness={0.5}
          metalness={0.1}
          transparent
          opacity={0.7}
        />
      </mesh>
      {/* Volumetric aura — low-opacity additive outer sphere */}
      <mesh>
        <sphereGeometry args={[0.7, 24, 24]} />
        <meshBasicMaterial
          color="#9b5cff"
          transparent
          opacity={0.12}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Ghostly inner bright sphere */}
      <mesh>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial
          color="#d9b3ff"
          toneMapped={false}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  );
}

function MobileModule() {
  const primary = usePrimaryMeshRef();
  const satelliteRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (satelliteRef.current) {
      satelliteRef.current.rotation.z += delta * 1.4;
    }
  });
  return (
    <group>
      {/* Phone chassis */}
      <RoundedBox
        ref={primary ?? undefined}
        args={[0.4, 0.75, 0.08]}
        radius={0.06}
        smoothness={3}
      >
        <meshStandardMaterial
          color="#00d4ff"
          emissive="#00d4ff"
          emissiveIntensity={INITIAL_EMISSIVE}
          roughness={0.2}
          metalness={0.6}
          transparent
        />
      </RoundedBox>
      {/* Screen face */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[0.32, 0.62]} />
        <meshBasicMaterial
          color="#7febff"
          transparent
          opacity={0.85}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {/* Orbiting satellite */}
      <group ref={satelliteRef}>
        <mesh position={[0.5, 0, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshBasicMaterial
            color="#00d4ff"
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}

/* ------------------------- Modules root rig ------------------------- */

const VISUAL_BY_ID: Record<ModuleId, () => JSX.Element> = {
  frontend: FrontendModule,
  backend: BackendModule,
  devops: DevOpsModule,
  cloud: CloudModule,
  mobile: MobileModule,
};

export function Modules() {
  const rigRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (rigRef.current) {
      rigRef.current.rotation.y += 0.04 * delta;
    }
  });

  return (
    <group ref={rigRef}>
      {MODULE_DEFS.map((def, i) => {
        const Visual = VISUAL_BY_ID[def.id];
        return (
          <ModuleOrbit
            key={def.id}
            id={def.id}
            angle={def.angle}
            yOffset={def.yOffset}
            phase={i * 1.1}
          >
            <Float
              speed={1.2}
              rotationIntensity={0.3}
              floatIntensity={0.3}
              floatingRange={[-0.05, 0.05]}
            >
              <Visual />
            </Float>
          </ModuleOrbit>
        );
      })}
    </group>
  );
}

export default Modules;
