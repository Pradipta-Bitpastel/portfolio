"use client";

import {
  Suspense,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  useGLTF,
  Environment,
  ContactShadows,
  Html,
  useProgress,
  OrbitControls,
  Bounds,
  useBounds
} from "@react-three/drei";
import {
  EffectComposer,
  Bloom,
  Vignette
} from "@react-three/postprocessing";
import { useGSAP } from "@gsap/react";
import { gsap, ScrollTrigger, registerAll } from "@/lib/gsap";
import { readPerfTier } from "@/lib/usePerfTier";

/**
 * HeroWarrior — hero-section local 3D viewport.
 *
 * Goal: a recruiter-impressing showcase. The warrior GLB sits in a
 * transparent R3F Canvas; surrounding her is a layered cinematic
 * "rig":
 *
 *   - Layer 0: Animated SVG orbital backdrop — dashed outer ring,
 *     counter-rotating hex constellation, crosshair reticle, floating
 *     particle cluster.
 *   - Layer 1: The transparent Canvas (alpha:true, no opaque
 *     background) — just lights, model, contact shadow.
 *   - Layer 2: 4 floating tech-stack chips (REACT / NEXT / TS / GSAP)
 *     orbit-floated at the corners with their own GSAP loops.
 *   - Layer 3: HUD — top label, LIVE indicator, vertical stat bars
 *     on the right, live-updating coordinate / azimuth readout at
 *     the bottom, scanline sweep, corner brackets.
 *
 * Scroll interactivity:
 *   - Entry: stat bars fill, tech chips fade-in, model scales in
 *   - Through-section: outer ring rotation accelerates, FOV widens,
 *     auto-rotate spins faster, azimuth readout updates live.
 *
 * Singletons (warriorState) bridge DOM-side ScrollTrigger and
 * in-Canvas useFrame loops without React re-renders.
 */

const MODEL_PATH = "/models/pc.glb";

const warriorState = {
  scrollProgress: 0,
  entryProgress: 0
};

useGLTF.preload(MODEL_PATH);

function WarriorMesh() {
  const { scene } = useGLTF(MODEL_PATH);
  const groupRef = useRef<THREE.Group>(null);
  const cloned = useMemo(() => {
    const root = scene.clone(true);
    root.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!mat) return;
      if ("envMapIntensity" in mat) {
        mat.envMapIntensity = 1.35;
      }
      // Push monitor / screen-like surfaces into emissive territory so
      // bloom catches them — heuristic: any material whose name hints
      // at "screen" / "display" / "monitor" / "led", or is already
      // emissive, gets a stronger emissive boost.
      const name = (mat.name || mesh.name || "").toLowerCase();
      const screenish =
        /screen|display|monitor|led|emit|glow|light/.test(name);
      if (screenish && "emissiveIntensity" in mat) {
        mat.emissiveIntensity = Math.max(mat.emissiveIntensity ?? 1, 2.4);
      }
    });
    return root;
  }, [scene]);

  // Subtle floating bob to make the rig feel "alive" on its plinth
  useFrame(({ clock }) => {
    const g = groupRef.current;
    if (!g) return;
    const t = clock.getElapsedTime();
    g.position.y = Math.sin(t * 0.9) * 0.04;
  });

  return (
    <group ref={groupRef}>
      <primitive object={cloned} />
    </group>
  );
}

/* Holographic plinth — rotating ring + scan grid below the rig */
function HoloPlinth() {
  const ringRef = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (ringRef.current) ringRef.current.rotation.z = t * 0.3;
    if (ring2Ref.current) ring2Ref.current.rotation.z = -t * 0.45;
  });
  return (
    <group position={[0, -1.15, 0]}>
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.85, 1.95, 96]} />
        <meshBasicMaterial
          color="#FF7A1A"
          transparent
          opacity={0.55}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh
        ref={ring2Ref}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.005, 0]}
      >
        <ringGeometry args={[2.15, 2.18, 128]} />
        <meshBasicMaterial
          color="#4F9CFF"
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* faint disc fill */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]}>
        <circleGeometry args={[1.85, 64]} />
        <meshBasicMaterial
          color="#FF7A1A"
          transparent
          opacity={0.07}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

function AutoFit({ children }: { children: React.ReactNode }) {
  return (
    <Bounds fit clip observe margin={1.1}>
      <FitTrigger />
      {children}
    </Bounds>
  );
}

function FitTrigger() {
  const bounds = useBounds();
  useEffect(() => {
    const t = setTimeout(() => bounds.refresh().clip().fit(), 80);
    return () => clearTimeout(t);
  }, [bounds]);
  return null;
}

function CameraRig({
  controlsRef
}: {
  controlsRef: React.MutableRefObject<{ autoRotateSpeed: number } | null>;
}) {
  const { camera } = useThree();
  useFrame(() => {
    const e = warriorState.entryProgress;
    const s = warriorState.scrollProgress;
    const cam = camera as THREE.PerspectiveCamera;
    const targetFov = THREE.MathUtils.lerp(50, 32 + s * 8, e);
    cam.fov += (targetFov - cam.fov) * 0.06;
    cam.updateProjectionMatrix();

    const ctrl = controlsRef.current;
    if (ctrl) {
      const targetSpeed = 0.55 + s * 2.4;
      ctrl.autoRotateSpeed +=
        (targetSpeed - ctrl.autoRotateSpeed) * 0.08;
    }
  });
  return null;
}

function LoaderReadout() {
  const { progress, active } = useProgress();
  return (
    <Html center>
      <div className="pointer-events-none flex select-none flex-col items-center gap-2 font-mono text-[10px] uppercase tracking-[0.32em] text-[#FF7A1A]">
        <span className="opacity-60">ASSET.TRANSFER</span>
        <span className="text-base text-ink">{Math.round(progress)}%</span>
        <div className="relative h-[2px] w-32 bg-white/10">
          <div
            className="absolute inset-y-0 left-0 bg-[#FF7A1A]"
            style={{
              width: `${progress}%`,
              boxShadow: "0 0 10px rgba(255,122,26,0.85)"
            }}
          />
        </div>
        <span className="opacity-50">
          {active ? "STREAMING…" : "READY"}
        </span>
      </div>
    </Html>
  );
}

function WarriorScene({ isLow }: { isLow: boolean }) {
  const controlsRef = useRef<{ autoRotateSpeed: number } | null>(null);
  return (
    <>
      {/* Cool fill — sets the dark-cyan ambient floor */}
      <ambientLight intensity={0.35} color="#3A5A8C" />
      {/* Key light — warm amber from front-right, casts shadows */}
      <directionalLight
        position={[4.0, 5.2, 3.5]}
        intensity={3.2}
        color="#FFB066"
        castShadow={!isLow}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />
      {/* Cyan rim — back-left, separates rig from background */}
      <directionalLight
        position={[-3.5, 3.0, -3.2]}
        intensity={2.6}
        color="#4F9CFF"
      />
      {/* Magenta accent — back-right, neon edge highlight */}
      <directionalLight
        position={[3.0, 1.6, -3.5]}
        intensity={1.8}
        color="#A78BFA"
      />
      {/* Underglow — orange wash from below the plinth */}
      <pointLight
        position={[0, -1.6, 2.0]}
        intensity={4.5}
        distance={7}
        color="#FF7A1A"
      />
      {/* Front fill — soft white kicker so screens read clearly */}
      <pointLight
        position={[0, 0.8, 4.5]}
        intensity={1.4}
        distance={8}
        color="#E0EAFF"
      />
      <AutoFit>
        <WarriorMesh />
      </AutoFit>
      <HoloPlinth />
      <ContactShadows
        position={[0, -1.1, 0]}
        opacity={0.7}
        scale={7}
        blur={2.4}
        far={4}
        color="#000"
      />
      <Environment preset="city" />
      <CameraRig controlsRef={controlsRef} />
      <OrbitControls
        ref={(node) => {
          controlsRef.current = node as unknown as {
            autoRotateSpeed: number;
          } | null;
        }}
        makeDefault
        enableZoom={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.7}
        minPolarAngle={Math.PI * 0.28}
        maxPolarAngle={Math.PI * 0.55}
      />
    </>
  );
}

/* ─────────────────────────── Animated SVG backdrop ────────────────────────
 * A self-contained SVG layer that sits BEHIND the Canvas. Pure GSAP-driven
 * loops + scroll-coupled rotation accelerators. Renders an outer dashed
 * radar ring, a counter-rotating hex constellation, a center crosshair
 * with sweeping arc, and a drifting particle cluster.
 */
function OrbitalBackdrop() {
  const rootRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;
      let cancelled = false;
      void (async () => {
        await registerAll();
        if (cancelled || !rootRef.current) return;
        const root = rootRef.current;

        const outer = root.querySelector(".bd-outer");
        const mid = root.querySelector(".bd-mid");
        const inner = root.querySelector(".bd-inner");
        const sweep = root.querySelector(".bd-sweep");
        const dots = root.querySelectorAll<SVGCircleElement>(".bd-dot");

        if (outer)
          gsap.to(outer, {
            rotation: 360,
            duration: 60,
            ease: "none",
            repeat: -1,
            transformOrigin: "200px 200px"
          });
        if (mid)
          gsap.to(mid, {
            rotation: -360,
            duration: 38,
            ease: "none",
            repeat: -1,
            transformOrigin: "200px 200px"
          });
        if (inner)
          gsap.to(inner, {
            rotation: 360,
            duration: 22,
            ease: "none",
            repeat: -1,
            transformOrigin: "200px 200px"
          });
        if (sweep)
          gsap.to(sweep, {
            rotation: 360,
            duration: 6,
            ease: "none",
            repeat: -1,
            transformOrigin: "200px 200px"
          });

        dots.forEach((d, i) => {
          gsap.to(d, {
            opacity: 0.15,
            duration: 1.4 + (i % 4) * 0.3,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: i * 0.07
          });
        });

        // Note: scroll-coupled rotation is handled inside the Canvas
        // via auto-rotate speed + FOV (CameraRig). The SVG rings
        // already loop continuously above; layering a second
        // ScrollTrigger tween on the same `rotation` would overwrite
        // those loops. The continuous rings + the canvas-driven
        // scroll feedback together read as "everything moves faster
        // when you scroll" without conflict.
      })();
      return () => {
        cancelled = true;
      };
    },
    { scope: rootRef, dependencies: [] }
  );

  // Build hex constellation points on a circle of radius 130
  const hexPoints = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2;
    return { x: 200 + Math.cos(a) * 130, y: 200 + Math.sin(a) * 130 };
  });

  // Drifting dot cluster — Poisson-like jitter
  const dotSeeds = Array.from({ length: 22 }, (_, i) => {
    const a = (i / 22) * Math.PI * 2 + (i % 3) * 0.4;
    const r = 60 + (i % 5) * 24;
    return { x: 200 + Math.cos(a) * r, y: 200 + Math.sin(a) * r, i };
  });

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 400 400"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="bd-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FF7A1A" stopOpacity="0.18" />
          <stop offset="40%" stopColor="#4F9CFF" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#070a13" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="bd-sweep-grad" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#FF7A1A" stopOpacity="0" />
          <stop offset="80%" stopColor="#FF7A1A" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFE0BD" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      {/* core glow */}
      <circle cx="200" cy="200" r="180" fill="url(#bd-core)" />

      {/* outer dashed orbit */}
      <g className="bd-outer">
        <circle
          cx="200"
          cy="200"
          r="180"
          fill="none"
          stroke="#FF7A1A"
          strokeOpacity="0.28"
          strokeWidth="0.8"
          strokeDasharray="2 6"
        />
        {Array.from({ length: 12 }).map((_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <circle
              key={i}
              cx={200 + Math.cos(a) * 180}
              cy={200 + Math.sin(a) * 180}
              r="2"
              fill="#FF7A1A"
              opacity="0.6"
            />
          );
        })}
      </g>

      {/* mid hex constellation */}
      <g className="bd-mid">
        <circle
          cx="200"
          cy="200"
          r="130"
          fill="none"
          stroke="#4F9CFF"
          strokeOpacity="0.32"
          strokeWidth="0.7"
          strokeDasharray="3 4"
        />
        {hexPoints.map((p, i) => (
          <g key={i} transform={`translate(${p.x} ${p.y})`}>
            <polygon
              points="0,-5 4.33,-2.5 4.33,2.5 0,5 -4.33,2.5 -4.33,-2.5"
              fill="none"
              stroke="#4F9CFF"
              strokeOpacity="0.7"
              strokeWidth="0.9"
            />
            <circle r="1.5" fill="#4F9CFF" opacity="0.9" />
          </g>
        ))}
      </g>

      {/* inner ring */}
      <g className="bd-inner">
        <circle
          cx="200"
          cy="200"
          r="86"
          fill="none"
          stroke="#FF7A1A"
          strokeOpacity="0.5"
          strokeWidth="0.9"
        />
        {Array.from({ length: 4 }).map((_, i) => {
          const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
          return (
            <rect
              key={i}
              x={200 + Math.cos(a) * 86 - 3}
              y={200 + Math.sin(a) * 86 - 3}
              width="6"
              height="6"
              fill="#FF7A1A"
              transform={`rotate(45 ${200 + Math.cos(a) * 86} ${200 + Math.sin(a) * 86})`}
            />
          );
        })}
      </g>

      {/* radar sweep */}
      <g className="bd-sweep">
        <line
          x1="200"
          y1="200"
          x2="380"
          y2="200"
          stroke="url(#bd-sweep-grad)"
          strokeWidth="1.4"
          opacity="0.85"
        />
      </g>

      {/* center crosshair */}
      <g stroke="#FF7A1A" strokeOpacity="0.55" strokeWidth="0.6">
        <line x1="200" y1="190" x2="200" y2="210" />
        <line x1="190" y1="200" x2="210" y2="200" />
        <circle cx="200" cy="200" r="10" fill="none" />
      </g>

      {/* drifting dots */}
      {dotSeeds.map((d) => (
        <circle
          key={d.i}
          className="bd-dot"
          cx={d.x}
          cy={d.y}
          r={d.i % 5 === 0 ? "1.6" : "1"}
          fill={d.i % 3 === 0 ? "#4F9CFF" : "#FF7A1A"}
          opacity="0.7"
        />
      ))}
    </svg>
  );
}

/* ─────────────────────────── Floating tech chips ──────────────────────────
 * 4 hexagonal tech-stack chips that orbit-float at the corners of the
 * viewport. Each has its own GSAP idle loop (slow Y-bob + glow pulse)
 * and a scroll-trigger entry stagger.
 */
const TECH_CHIPS: ReadonlyArray<{
  label: string;
  pos: { top?: string; bottom?: string; left?: string; right?: string };
  color: string;
}> = [
  {
    label: "REACT",
    pos: { top: "12%", left: "-2%" },
    color: "#4F9CFF"
  },
  {
    label: "NEXT.JS",
    pos: { top: "8%", right: "-2%" },
    color: "#FF7A1A"
  },
  {
    label: "GSAP",
    pos: { bottom: "18%", left: "-2%" },
    color: "#3FE8B4"
  },
  {
    label: "THREE.JS",
    pos: { bottom: "14%", right: "-2%" },
    color: "#A78BFA"
  }
];

function TechChips() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;
      const chips = rootRef.current.querySelectorAll<HTMLElement>(".tech-chip");
      gsap.set(chips, { autoAlpha: 0, scale: 0.6, y: 20 });

      void (async () => {
        await registerAll();
        if (!rootRef.current) return;

        // Entry stagger triggered on hero enter
        gsap.to(chips, {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          duration: 0.7,
          ease: "back.out(1.4)",
          stagger: 0.12,
          delay: 0.5
        });

        // Idle bob — each chip floats Y±6px at its own period
        chips.forEach((c, i) => {
          gsap.to(c, {
            y: i % 2 === 0 ? -8 : 8,
            duration: 2.6 + i * 0.4,
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: i * 0.2
          });
        });
      })();
    },
    { scope: rootRef, dependencies: [] }
  );

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute inset-0 z-20"
      aria-hidden
    >
      {TECH_CHIPS.map((chip) => (
        <div
          key={chip.label}
          className="tech-chip absolute"
          style={chip.pos}
        >
          <div
            className="relative flex items-center gap-2 border bg-[#070a13]/85 px-3 py-1.5 font-mono text-[9px] uppercase tracking-[0.32em] backdrop-blur"
            style={{
              borderColor: `${chip.color}88`,
              color: chip.color,
              boxShadow: `0 0 18px ${chip.color}33, inset 0 0 10px ${chip.color}11`,
              clipPath:
                "polygon(8px 0, 100% 0, calc(100% - 8px) 100%, 0 100%)"
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                background: chip.color,
                boxShadow: `0 0 6px ${chip.color}`
              }}
            />
            {chip.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── Stat bars ─────────────────────────────────
 * Vertical-right column showing developer "stats" as horizontal fill
 * bars. Animated to fill on entry, then subtly oscillate ±2% so they
 * feel "live". Fits the gamified RPG aesthetic that pairs with the
 * fantasy elven model.
 */
const STATS: ReadonlyArray<{ label: string; value: number; color: string }> = [
  { label: "FRONTEND", value: 96, color: "#FF7A1A" },
  { label: "BACKEND", value: 88, color: "#4F9CFF" },
  { label: "3D / GFX", value: 72, color: "#A78BFA" },
  { label: "DEVOPS", value: 81, color: "#3FE8B4" }
];

function StatBars() {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;
      const fills =
        rootRef.current.querySelectorAll<HTMLElement>(".stat-fill");
      const counters =
        rootRef.current.querySelectorAll<HTMLElement>(".stat-counter");

      gsap.set(fills, { scaleX: 0, transformOrigin: "left center" });
      gsap.set(counters, { textContent: 0 });

      void (async () => {
        await registerAll();
        if (!rootRef.current) return;
        STATS.forEach((s, i) => {
          gsap.to(fills[i], {
            scaleX: s.value / 100,
            duration: 1.2,
            ease: "power3.out",
            delay: 0.7 + i * 0.12
          });
          gsap.to(
            { v: 0 },
            {
              v: s.value,
              duration: 1.2,
              ease: "power3.out",
              delay: 0.7 + i * 0.12,
              onUpdate(this: gsap.core.Tween) {
                const v = Math.round(
                  (this.targets()[0] as { v: number }).v
                );
                if (counters[i])
                  counters[i].textContent = String(v).padStart(2, "0");
              }
            }
          );
          // Live shimmer ±1.5%
          gsap.to(fills[i], {
            scaleX: `+=${(Math.random() * 0.03 - 0.015).toFixed(3)}`,
            duration: 2 + Math.random(),
            ease: "sine.inOut",
            yoyo: true,
            repeat: -1,
            delay: 2.5 + i * 0.3
          });
        });
      })();
    },
    { scope: rootRef, dependencies: [] }
  );

  return (
    <div
      ref={rootRef}
      className="pointer-events-none absolute right-3 top-1/2 z-30 flex w-[clamp(120px,14vw,170px)] -translate-y-1/2 flex-col gap-2.5"
    >
      {STATS.map((s) => (
        <div key={s.label} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between font-mono text-[8px] uppercase tracking-[0.28em] text-ink-dim">
            <span style={{ color: s.color }}>{s.label}</span>
            <span className="flex items-baseline gap-0.5">
              <span className="stat-counter text-ink">00</span>
              <span className="opacity-50">%</span>
            </span>
          </div>
          <div className="relative h-[3px] w-full bg-white/10">
            <div
              className="stat-fill absolute inset-0"
              style={{
                background: `linear-gradient(90deg, ${s.color}, ${s.color}88)`,
                boxShadow: `0 0 8px ${s.color}99`
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────── Live coordinate readout ────────────────────
 * Bottom-left diagnostic panel. Azimuth + altitude tick to scroll
 * progress; FPS oscillates around 60 to feel live.
 */
function CoordReadout() {
  const azRef = useRef<HTMLSpanElement>(null);
  const altRef = useRef<HTMLSpanElement>(null);
  const fpsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const s = warriorState.scrollProgress;
      const e = warriorState.entryProgress;
      const az = (s * 360).toFixed(1);
      const alt = (e * 90 - s * 12).toFixed(1);
      const fps = (58 + Math.sin(performance.now() * 0.002) * 1.7).toFixed(1);
      if (azRef.current) azRef.current.textContent = `${az}°`;
      if (altRef.current) altRef.current.textContent = `${alt}°`;
      if (fpsRef.current) fpsRef.current.textContent = fps;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-30 grid grid-cols-2 gap-x-4 gap-y-0.5 font-mono text-[9px] uppercase tracking-[0.28em] text-ink-dim">
      <span className="text-[#FF7A1A] opacity-70">AZ</span>
      <span ref={azRef} className="text-ink">0.0°</span>
      <span className="text-[#FF7A1A] opacity-70">ALT</span>
      <span ref={altRef} className="text-ink">0.0°</span>
      <span className="text-[#FF7A1A] opacity-70">FPS</span>
      <span ref={fpsRef} className="text-[#3FE8B4]">60.0</span>
    </div>
  );
}

function HeroWarriorImpl() {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ScrollTrigger — drives singleton state read by useFrame inside
  // the Canvas + by the live readouts below. Two independent
  // triggers for entry-pop and through-section progression.
  useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    const triggers: ScrollTrigger[] = [];
    const boot = async () => {
      await registerAll();
      if (cancelled || !wrapperRef.current) return;
      const section =
        wrapperRef.current.closest("section") ?? wrapperRef.current;

      triggers.push(
        ScrollTrigger.create({
          trigger: section,
          start: "top bottom",
          end: "top 30%",
          scrub: 1,
          onUpdate: (self) => {
            warriorState.entryProgress = self.progress;
          }
        })
      );
      triggers.push(
        ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: "bottom top",
          scrub: 1.2,
          onUpdate: (self) => {
            warriorState.scrollProgress = self.progress;
          }
        })
      );

      const sectionEl = section as HTMLElement;
      const rect = sectionEl.getBoundingClientRect();
      if (rect.top < window.innerHeight * 0.4) {
        warriorState.entryProgress = 1;
      }
    };
    void boot();
    return () => {
      cancelled = true;
      triggers.forEach((t) => t.kill());
    };
  }, [mounted]);

  const tier = mounted ? readPerfTier() : "high";
  const isLow = tier === "low";

  return (
    <div
      ref={wrapperRef}
      className="hero-warrior relative h-[clamp(480px,72vh,820px)] w-full select-none"
    >
      {/* 0a: soft radial scrim — masks the global SceneDock laptop
          behind the warrior so it doesn't visually compete. Edges
          fade to fully transparent so the panel doesn't read as a
          hard black box; instead it's a localized "viewport halo". */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 52%, rgba(7,10,19,0.92) 0%, rgba(7,10,19,0.82) 38%, rgba(7,10,19,0.5) 70%, rgba(7,10,19,0.15) 90%, rgba(7,10,19,0) 100%)"
        }}
      />

      {/* 0b: orbital backdrop — animated SVG, transparent so its
          rings + dots blend over the radial scrim */}
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <OrbitalBackdrop />
      </div>

      {/* 1: transparent Canvas */}
      <div className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing">
        {mounted && (
          <Canvas
            shadows={!isLow}
            dpr={isLow ? [1, 1.25] : [1, 1.6]}
            camera={{ position: [2.4, 1.6, 4.6], fov: 34 }}
            gl={{
              alpha: true,
              antialias: !isLow,
              powerPreference: "high-performance"
            }}
            performance={{ min: 0.4 }}
          >
            <Suspense fallback={<LoaderReadout />}>
              <WarriorScene isLow={isLow} />
            </Suspense>
            {!isLow && (
              <EffectComposer enableNormalPass={false}>
                <Bloom
                  mipmapBlur
                  intensity={1.4}
                  luminanceThreshold={0.18}
                  luminanceSmoothing={0.22}
                  radius={0.85}
                />
                <Vignette eskil={false} offset={0.22} darkness={0.6} />
              </EffectComposer>
            )}
          </Canvas>
        )}
      </div>

      {/* 2: floating tech chips */}
      <TechChips />

      {/* 3: HUD overlays */}
      {/* corner brackets */}
      {[
        { top: -1, left: -1, rot: 0 },
        { top: -1, right: -1, rot: 90 },
        { bottom: -1, right: -1, rot: 180 },
        { bottom: -1, left: -1, rot: 270 }
      ].map((pos, i) => (
        <svg
          key={i}
          aria-hidden
          width="22"
          height="22"
          viewBox="0 0 22 22"
          className="pointer-events-none absolute z-40"
          style={{
            ...pos,
            transform: `rotate(${pos.rot}deg)`,
            color: "#FF7A1A"
          }}
        >
          <path
            d="M0 0 L13 0 M0 0 L0 13"
            stroke="currentColor"
            strokeWidth="1.6"
            fill="none"
          />
        </svg>
      ))}

      {/* scanline */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
      >
        <div className="hero-warrior-scan absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#FF7A1A]/55 to-transparent" />
      </div>

      {/* top-left readout */}
      <div className="pointer-events-none absolute left-3 top-3 z-40 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.32em] text-ink-dim">
        <span className="text-[#FF7A1A]">WORKSTATION</span>
        <span className="opacity-40">{"//"}</span>
        <span>RIG-01</span>
        <span className="opacity-40">{"//"}</span>
        <span className="text-[#A78BFA]">GLB</span>
      </div>

      {/* top-right LIVE */}
      <div className="pointer-events-none absolute right-3 top-3 z-40 flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.32em]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3FE8B4]" />
        <span className="text-[#3FE8B4]">LIVE</span>
      </div>

      {/* stat bars */}
      <StatBars />

      {/* coord readout */}
      <CoordReadout />

      {/* bottom-right hint */}
      <div className="pointer-events-none absolute bottom-3 right-3 z-30 font-mono text-[9px] uppercase tracking-[0.32em] text-[#FF7A1A]">
        DRAG · ORBIT
      </div>

      <style jsx>{`
        @keyframes hero-warrior-scan-anim {
          0% {
            transform: translateY(0%);
            opacity: 0;
          }
          12% {
            opacity: 0.7;
          }
          88% {
            opacity: 0.7;
          }
          100% {
            transform: translateY(100%);
            opacity: 0;
          }
        }
        .hero-warrior-scan {
          top: 0;
          animation: hero-warrior-scan-anim 4.2s linear infinite;
        }
      `}</style>
    </div>
  );
}

export const HeroWarrior = memo(HeroWarriorImpl);

export default HeroWarrior;
