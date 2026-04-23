"use client";

import { Float, RoundedBox } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "@/lib/gsap";
import { sceneStore } from "@/lib/sceneStore";
import { useCursor, isCursorReduced } from "@/lib/useCursor";
import { readPerfTier } from "@/lib/usePerfTier";

/**
 * DevStation — premium MacBook-like laptop with orbiting glyphs.
 *
 * Iter7 upgrades:
 *   - Code editor texture is now variant-driven (tsx | py | shell);
 *     clicking the screen cycles them with a redraw + needsUpdate.
 *   - Hover on the laptop boosts screen emissive opacity + power LED
 *     intensity via gsap.to (300ms ease).
 *   - Floating glyphs parallax toward the cursor via the shared
 *     useCursor hook.
 *
 * Exposes the group ref to sceneStore.core.ref so every prior GSAP
 * timeline that tweens position/rotation/scale on the "core" still
 * works.
 */

/* ------------------------- Code-editor face ------------------------- */

type CodeVariant = "tsx" | "py" | "shell";

type CodeRow = {
  indent: number;
  width: number;
  color: string;
};

const ROW_COLORS = ["#4f9cff", "#00d4ff", "#9b5cff", "#FF7A1A", "#39ffa5"];

function seedRows(): CodeRow[] {
  // Deterministic layout so the texture is stable across renders.
  const rows: CodeRow[] = [];
  const indents = [20, 40, 40, 60, 60, 40, 60, 80, 40, 20];
  const widths = [340, 280, 220, 300, 200, 360, 260, 300, 220, 280];
  for (let i = 0; i < 10; i++) {
    rows.push({
      indent: indents[i] ?? 40,
      width: widths[i] ?? 260,
      color: ROW_COLORS[i % ROW_COLORS.length]
    });
  }
  return rows;
}

const VARIANT_META: Record<CodeVariant, { filename: string; tabAccent: string; statusRight: string; statusLeft: string }> = {
  tsx: {
    filename: "main.tsx",
    tabAccent: "#FF7A1A",
    statusLeft: "> compiled OK  //  HMR online",
    statusRight: "L42:24  UTF-8  TSX"
  },
  py: {
    filename: "core.py",
    tabAccent: "#39ffa5",
    statusLeft: "$ pytest  // 124 passed in 2.3s",
    statusRight: "L18:04  UTF-8  PY"
  },
  shell: {
    filename: "~/dev",
    tabAccent: "#00d4ff",
    statusLeft: "$ alex@dev.os  //  zsh 5.9",
    statusRight: "L01:01  UTF-8  SH"
  }
};

/**
 * Draw the mac-style OS chrome (menu bar + traffic lights) at the top
 * of the screen texture, then a 10-row variant-specific code/log
 * pattern with a blinking amber cursor.
 */
function drawCodeEditor(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  rows: CodeRow[],
  cursorOn: boolean,
  variant: CodeVariant
) {
  const meta = VARIANT_META[variant];

  // --- Background ----------------------------------------------------
  ctx.fillStyle = variant === "shell" ? "#05080f" : "#0d1320";
  ctx.fillRect(0, 0, width, height);

  // --- Mac-style menu bar (top of screen) ---------------------------
  const menuH = 48;
  ctx.fillStyle = "#1a1d24";
  ctx.fillRect(0, 0, width, menuH);
  ctx.fillStyle = "#2a2f3a";
  ctx.fillRect(0, menuH, width, 1);

  // Traffic lights
  const dots = [
    { x: 28, color: "#ff5f57" },
    { x: 62, color: "#febc2e" },
    { x: 96, color: "#28c941" }
  ];
  dots.forEach((d) => {
    ctx.beginPath();
    ctx.arc(d.x, 24, 9, 0, Math.PI * 2);
    ctx.fillStyle = d.color;
    ctx.fill();
  });

  // Menu bar labels
  ctx.fillStyle = "#c7d3ea";
  ctx.font = "bold 16px ui-monospace, 'JetBrains Mono', monospace";
  ctx.textBaseline = "middle";
  ctx.fillText("DEV.OS", 140, 24);
  ctx.fillStyle = "#8a94ab";
  ctx.font = "14px ui-monospace, 'JetBrains Mono', monospace";
  ctx.fillText("File  Edit  View  Run  Help", 220, 24);

  // Right-side menu extras (clock + status)
  ctx.textAlign = "right";
  ctx.fillStyle = "#8a94ab";
  ctx.fillText("T+00:02:47", width - 20, 24);
  ctx.textAlign = "left";

  // --- Editor chrome (tab bar) --------------------------------------
  const chromeY = menuH + 2;
  const chromeH = 36;
  ctx.fillStyle = "#0a0f1a";
  ctx.fillRect(0, chromeY, width, chromeH);
  ctx.fillStyle = "#1a2338";
  ctx.fillRect(0, chromeY + chromeH, width, 1);

  // Active tab — variant filename + accent
  ctx.fillStyle = variant === "shell" ? "#05080f" : "#0d1320";
  ctx.fillRect(20, chromeY, 200, chromeH);
  ctx.fillStyle = meta.tabAccent;
  ctx.fillRect(20, chromeY, 200, 2);
  ctx.fillStyle = "#c7d3ea";
  ctx.font = "14px ui-monospace, 'JetBrains Mono', monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(meta.filename, 38, chromeY + chromeH / 2);

  // --- Gutter (line numbers) ----------------------------------------
  const editorTop = menuH + chromeH + 2;
  ctx.fillStyle = "#0a1020";
  ctx.fillRect(0, editorTop, 60, height - editorTop);

  // --- Code rows / shell prompt -------------------------------------
  const startY = editorTop + 24;
  const lineH = 36;
  const cursorRow = 4;
  let cursorXEnd = 0;
  let cursorYEnd = 0;

  if (variant === "shell") {
    // Terminal prompt: $ amber + cyan command + white/60 output.
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const y = startY + i * lineH;

      // Prompt $ in amber
      ctx.fillStyle = "#FF7A1A";
      ctx.fillRect(72, y, 12, 14);

      const isCommand = i % 2 === 0;
      // Command in cyan, output in dimmer ink
      ctx.fillStyle = isCommand ? "#00d4ff" : "rgba(231,236,245,0.55)";
      ctx.fillRect(72 + 22, y, r.width, 14);

      if (i === cursorRow) {
        cursorXEnd = 72 + 22 + r.width + 6;
        cursorYEnd = y;
      }
    }
  } else {
    // tsx / py — keyword chip + identifier; py uses purple keywords +
    // green strings, tsx keeps the original mixed-color palette.
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const y = startY + i * lineH;

      // Line number
      ctx.fillStyle = "#33405a";
      ctx.font = "14px ui-monospace, 'JetBrains Mono', monospace";
      ctx.textAlign = "right";
      ctx.fillText(String(i + 1), 48, y + 8);
      ctx.textAlign = "left";

      const kwWidth = i % 3 === 0 ? 54 : 36;
      // tsx: alternate amber + row color. py: purple keywords + green strings.
      let kwColor: string;
      let valColor: string;
      if (variant === "py") {
        kwColor = i % 3 === 0 ? "#9b5cff" : "#39ffa5";
        valColor = "#c7d3ea";
      } else {
        kwColor = i % 3 === 0 ? "#FF7A1A" : r.color;
        valColor = "#c7d3ea";
      }
      ctx.fillStyle = kwColor;
      ctx.fillRect(72 + r.indent, y, kwWidth, 14);
      ctx.fillStyle = valColor;
      ctx.fillRect(
        72 + r.indent + kwWidth + 10,
        y,
        r.width - kwWidth - 10,
        14
      );

      // Secondary stripe below (value or args)
      if (i % 2 === 0) {
        ctx.fillStyle = variant === "py" ? "#1f3a3a" : "#2c4066";
        ctx.fillRect(72 + r.indent + 22, y + 20, Math.max(60, r.width * 0.4), 6);
      }

      if (i === cursorRow) {
        cursorXEnd =
          72 + r.indent + kwWidth + 10 + (r.width - kwWidth - 10) + 6;
        cursorYEnd = y;
      }
    }
  }

  // --- Blinking cursor (brighter amber bar) -------------------------
  if (cursorOn) {
    ctx.fillStyle = "#FF7A1A";
    ctx.fillRect(cursorXEnd, cursorYEnd - 3, 4, 20);
    // Glow halo
    ctx.fillStyle = "rgba(255,122,26,0.35)";
    ctx.fillRect(cursorXEnd - 2, cursorYEnd - 5, 8, 24);
  }

  // --- Status bar ---------------------------------------------------
  ctx.fillStyle = "#0a0f1a";
  ctx.fillRect(0, height - 32, width, 32);
  ctx.fillStyle = meta.tabAccent;
  ctx.font = "14px ui-monospace, 'JetBrains Mono', monospace";
  ctx.textBaseline = "middle";
  ctx.fillText(meta.statusLeft, 16, height - 16);
  ctx.textAlign = "right";
  ctx.fillStyle = "#FF7A1A";
  ctx.fillText(meta.statusRight, width - 16, height - 16);
  ctx.textAlign = "left";
}

function useCodeTexture(): {
  texture: THREE.CanvasTexture;
  redraw: (cursorOn: boolean, variant: CodeVariant) => void;
} {
  const rows = useMemo(() => seedRows(), []);

  const out = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 640;
    const ctx = canvas.getContext("2d");
    if (ctx) drawCodeEditor(ctx, canvas.width, canvas.height, rows, true, "tsx");
    const texture = new THREE.CanvasTexture(canvas);
    texture.anisotropy = 8;
    texture.needsUpdate = true;
    return {
      canvas,
      ctx,
      texture
    };
  }, [rows]);

  const redraw = (cursorOn: boolean, variant: CodeVariant) => {
    if (!out.ctx) return;
    drawCodeEditor(
      out.ctx,
      out.canvas.width,
      out.canvas.height,
      rows,
      cursorOn,
      variant
    );
    out.texture.needsUpdate = true;
  };

  return { texture: out.texture, redraw };
}

function nextVariant(v: CodeVariant): CodeVariant {
  if (v === "tsx") return "py";
  if (v === "py") return "shell";
  return "tsx";
}

function ScreenFace({
  variant,
  onClick,
  onPointerEnter,
  onPointerLeave,
  glowOpacityRef
}: {
  variant: CodeVariant;
  onClick: (e: ThreeEvent<MouseEvent>) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  glowOpacityRef: React.MutableRefObject<number>;
}) {
  const { texture, redraw } = useCodeTexture();
  const frameRef = useRef(0);
  const cursorOnRef = useRef(true);
  const glowRef = useRef<THREE.Mesh>(null);

  // Repaint when the variant changes.
  useEffect(() => {
    redraw(cursorOnRef.current, variant);
  }, [variant, redraw]);

  // Cache the tier once; the blink cadence won't change mid-session.
  // Low-tier halves the redraw rate (cursor blinks ~once per second
  // instead of twice), which roughly halves canvas-texture GPU uploads.
  const blinkInterval = readPerfTier() === "low" ? 60 : 30;

  useFrame((state) => {
    frameRef.current++;
    if (frameRef.current % blinkInterval === 0) {
      cursorOnRef.current = !cursorOnRef.current;
      redraw(cursorOnRef.current, variant);
    }
    // Subtle "breathing" glow on the emissive pass. Amplitude kept
    // small (±0.035 around 0.45) so the pulse reads as a gentle
    // ambience, not a flash.
    const g = glowRef.current;
    if (g && g.material) {
      const mat = g.material as THREE.MeshBasicMaterial;
      const t = state.clock.elapsedTime;
      const breath = 0.45 + Math.sin(t * 1.4) * 0.035;
      mat.opacity = Math.max(breath, glowOpacityRef.current);
    }
  });

  return (
    <group
      onClick={onClick}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      {/* Bezel (true black frame around the screen). Z spans
          0.035 ± 0.005 (thickness 0.01), so the FRONT surface of the
          bezel sits at z=0.040. The editor plane MUST land comfortably
          above 0.040 or it will z-fight with the bezel's front face,
          which presents as a per-frame flicker on the laptop screen. */}
      <RoundedBox
        args={[2.42, 1.52, 0.01]}
        radius={0.02}
        smoothness={3}
        position={[0, 0, 0.035]}
      >
        <meshStandardMaterial
          color="#0a0d14"
          metalness={0.3}
          roughness={0.7}
        />
      </RoundedBox>

      {/* Main editor face — 0.02u clear of the bezel's front face
          (was 0.007, too tight — caused z-fighting flicker). */}
      <mesh position={[0, 0, 0.06]}>
        <planeGeometry args={[2.3, 1.42]} />
        <meshBasicMaterial
          map={texture}
          toneMapped={false}
          transparent
          opacity={1}
          depthWrite={true}
        />
      </mesh>

      {/* Emissive glow pass — 0.025u clear of the editor (was 0.011,
          also tight). depthWrite:false keeps this additive overlay
          out of the depth buffer so it never contends with the editor
          plane below it. */}
      <mesh ref={glowRef} position={[0, 0, 0.085]}>
        <planeGeometry args={[2.3, 1.42]} />
        <meshBasicMaterial
          map={texture}
          toneMapped={false}
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Screen halo — larger additive plane behind for a spill-glow */}
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[2.8, 1.8]} />
        <meshBasicMaterial
          color="#4f9cff"
          transparent
          opacity={0.22}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* ------------------------- Keyboard ------------------------- */

const KEYS_PER_ROW = 13;
const KEY_ROWS = 4;
const KEY_COUNT = KEYS_PER_ROW * KEY_ROWS;
const KEY_GAP = 0.175;

function Keyboard() {
  const ref = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  // Highlight indices: WASD + Return + Enter pattern for backlight read.
  const accentSet = useMemo(() => {
    const set = new Set<number>();
    set.add(2 * KEYS_PER_ROW + 2); // W
    set.add(3 * KEYS_PER_ROW + 1); // A
    set.add(3 * KEYS_PER_ROW + 2); // S
    set.add(3 * KEYS_PER_ROW + 3); // D
    set.add(1 * KEYS_PER_ROW + 12); // Return
    set.add(3 * KEYS_PER_ROW + 12); // Enter (right-side)
    return set;
  }, []);

  useEffect(() => {
    const m = ref.current;
    if (!m) return;
    const rowWidth = (KEYS_PER_ROW - 1) * KEY_GAP;
    let i = 0;
    for (let r = 0; r < KEY_ROWS; r++) {
      for (let c = 0; c < KEYS_PER_ROW; c++) {
        const x = -rowWidth / 2 + c * KEY_GAP + r * 0.02;
        const z = -0.55 + r * KEY_GAP;
        dummy.position.set(x, 0, z);
        dummy.scale.setScalar(1);
        dummy.rotation.set(0, 0, 0);
        dummy.updateMatrix();
        m.setMatrixAt(i, dummy.matrix);
        m.setColorAt(
          i,
          accentSet.has(i)
            ? new THREE.Color("#FF7A1A")
            : new THREE.Color("#0b0d12")
        );
        i++;
      }
    }
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  }, [dummy, accentSet]);

  return (
    <instancedMesh
      ref={ref}
      args={[undefined, undefined, KEY_COUNT]}
      position={[0, 0.065, 0]}
    >
      <boxGeometry args={[0.14, 0.03, 0.14]} />
      <meshStandardMaterial
        color="#0b0d12"
        emissive="#FF7A1A"
        emissiveIntensity={0.45}
        roughness={0.5}
        metalness={0.4}
      />
    </instancedMesh>
  );
}

/* ------------------------- Orbiting glyphs ------------------------- */

const GLYPHS = ["{}", "</>", "λ", "[]"] as const;
const GLYPH_COLORS = ["#4f9cff", "#00d4ff", "#9b5cff", "#39ffa5"];

function GlyphBillboard({
  glyph,
  color,
  radius,
  height,
  phase
}: {
  glyph: string;
  color: string;
  radius: number;
  height: number;
  phase: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const cursor = useCursor();
  const { texture } = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "rgba(0,0,0,0)";
      ctx.clearRect(0, 0, 160, 160);
      ctx.fillStyle = color;
      ctx.font = "bold 96px ui-monospace, 'JetBrains Mono', monospace";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(glyph, 80, 86);
    }
    const t = new THREE.CanvasTexture(canvas);
    t.needsUpdate = true;
    return { texture: t };
  }, [glyph, color]);

  // Low-tier: skip cursor parallax entirely (8 per-frame writes × 4
  // glyphs = 32 property assignments dropped each tick). Orbit only.
  const low = readPerfTier() === "low";

  useFrame((state) => {
    const g = groupRef.current;
    if (!g) return;
    const t = state.clock.elapsedTime * 0.35 + phase;
    const baseX = Math.cos(t) * radius;
    const baseZ = Math.sin(t) * radius;
    const baseY = height + Math.sin(t * 1.4) * 0.1;

    if (low || isCursorReduced()) {
      g.position.set(baseX, baseY, baseZ);
    } else {
      g.position.x = baseX + cursor.x * 0.25;
      g.position.y = baseY + cursor.y * 0.18;
      g.position.z = baseZ;
      g.rotation.y = cursor.x * 0.22;
      g.rotation.x = -cursor.y * 0.18;
    }
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <planeGeometry args={[0.78, 0.78]} />
        <meshBasicMaterial
          map={texture}
          transparent
          toneMapped={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

function OrbitingGlyphs() {
  return (
    <group>
      {GLYPHS.map((g, i) => {
        // Tighter orbit (1.6 – 1.9) so glyphs overlap the laptop silhouette.
        const radius = 1.6 + (i / GLYPHS.length) * 0.3;
        const height = 0.6 + ((i * 0.27) % 1) * 0.8;
        const phase = (i / GLYPHS.length) * Math.PI * 2;
        return (
          <GlyphBillboard
            key={i}
            glyph={g}
            color={GLYPH_COLORS[i % GLYPH_COLORS.length]}
            radius={radius}
            height={height}
            phase={phase}
          />
        );
      })}
    </group>
  );
}

/* ------------------------- Root ------------------------- */

export function DevStation() {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const ledRef = useRef<THREE.MeshStandardMaterial>(null);
  const glowOpacityRef = useRef(0); // hover-driven glow boost

  const [variant, setVariant] = useState<CodeVariant>("tsx");
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    sceneStore.core.ref = groupRef.current;
    sceneStore.core.glow = lightRef.current;
    return () => {
      sceneStore.core.ref = null;
      sceneStore.core.glow = null;
    };
  }, []);

  // Hover boost — tween the glow opacity ref + LED emissive intensity.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const led = ledRef.current;
    const glowTarget = hovered ? 0.65 : 0;
    gsap.to(glowOpacityRef, {
      current: glowTarget,
      duration: 0.3,
      ease: "power2.out",
      overwrite: "auto"
    });
    if (led) {
      gsap.to(led, {
        emissiveIntensity: hovered ? 5 : 3,
        duration: 0.3,
        ease: "power2.out",
        overwrite: "auto"
      });
    }
    // Cursor feedback for the screen click affordance.
    if (typeof document !== "undefined") {
      document.body.style.cursor = hovered ? "pointer" : "auto";
    }
    return () => {
      if (typeof document !== "undefined") {
        document.body.style.cursor = "auto";
      }
    };
  }, [hovered]);

  const handleScreenClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    setVariant((v) => nextVariant(v));
  };

  return (
    <group ref={groupRef} scale={1.3}>
      {/* Hologram projector slab — sits under the laptop */}
      <mesh position={[0, -0.22, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.2, 2.0]} />
        <meshBasicMaterial
          color="#4f9cff"
          transparent
          opacity={0.25}
          toneMapped={false}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Shadow-gap plate under the chassis */}
      <mesh position={[0, -0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.65, 1.85]} />
        <meshBasicMaterial color="#090b10" transparent opacity={0.9} />
      </mesh>

      <Float
        speed={1.3}
        rotationIntensity={0.28}
        floatIntensity={0.55}
        floatingRange={[-0.08, 0.08]}
      >
        <group>
          {/* Laptop base — aluminum (physical material) */}
          <RoundedBox
            args={[2.6, 0.12, 1.8]}
            radius={0.05}
            smoothness={3}
            position={[0, 0, 0]}
          >
            <meshPhysicalMaterial
              color="#1a1d24"
              metalness={0.95}
              roughness={0.18}
              clearcoat={0.85}
              clearcoatRoughness={0.12}
              reflectivity={0.7}
            />
          </RoundedBox>

          {/* Deck tint — subtle plane behind keys for contrast */}
          <mesh position={[0, 0.061, -0.28]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[2.4, 1.1]} />
            <meshStandardMaterial
              color="#141820"
              metalness={0.4}
              roughness={0.6}
            />
          </mesh>

          {/* Trackpad */}
          <mesh position={[0, 0.062, 0.45]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.9, 0.56]} />
            <meshStandardMaterial
              color="#141a30"
              emissive="#4f9cff"
              emissiveIntensity={0.12}
              metalness={0.5}
              roughness={0.4}
            />
          </mesh>

          {/* Keyboard keys (instanced) */}
          <Keyboard />

          {/* Power LED — tiny amber emissive sphere, front-right of base */}
          <mesh position={[1.1, 0.062, 0.82]}>
            <sphereGeometry args={[0.02, 12, 12]} />
            <meshStandardMaterial
              ref={ledRef}
              color="#FF7A1A"
              emissive="#FF7A1A"
              emissiveIntensity={3}
              toneMapped={false}
            />
          </mesh>

          {/* Rubber feet (four corners, underside) */}
          {[
            [-1.15, -0.07, -0.75],
            [1.15, -0.07, -0.75],
            [-1.15, -0.07, 0.75],
            [1.15, -0.07, 0.75]
          ].map((p, i) => (
            <mesh key={i} position={p as [number, number, number]}>
              <cylinderGeometry args={[0.05, 0.05, 0.02, 12]} />
              <meshStandardMaterial
                color="#05070b"
                roughness={0.9}
                metalness={0.1}
              />
            </mesh>
          ))}

          {/* Hinge cylinder along the back edge */}
          <mesh
            position={[0, 0.06, -0.88]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.04, 0.04, 2.5, 16]} />
            <meshStandardMaterial
              color="#0e1118"
              metalness={0.85}
              roughness={0.35}
            />
          </mesh>

          {/* Hinged screen — screen stands up from the hinge (Y+), then
              tips ~18° back so the open angle reads as ~108° — the natural
              "laptop sitting open on a desk" pose. */}
          <group
            position={[0, 0.06, -0.88]}
            rotation={[-Math.PI * (18 / 180), 0, 0]}
          >
            {/* Screen chassis slab (aluminum) */}
            <RoundedBox
              args={[2.6, 1.7, 0.08]}
              radius={0.05}
              smoothness={3}
              position={[0, 0.85, 0]}
            >
              <meshPhysicalMaterial
                color="#1a1d24"
                metalness={0.95}
                roughness={0.18}
                clearcoat={0.85}
                clearcoatRoughness={0.12}
                reflectivity={0.7}
              />
            </RoundedBox>

            {/* Logo cutout on the BACK of the lid (visible when rotating
                away). Faces -Z in lid-local space. */}
            <mesh position={[0, 0.85, -0.041]} rotation={[0, Math.PI, 0]}>
              <planeGeometry args={[0.38, 0.48]} />
              <meshStandardMaterial
                color="#0a0d14"
                emissive="#4f9cff"
                emissiveIntensity={0.9}
                toneMapped={false}
              />
            </mesh>

            {/* Editor face — sits on the FRONT of the lid */}
            <group position={[0, 0.85, 0]}>
              <ScreenFace
                variant={variant}
                onClick={handleScreenClick}
                onPointerEnter={() => setHovered(true)}
                onPointerLeave={() => setHovered(false)}
                glowOpacityRef={glowOpacityRef}
              />
            </group>
          </group>

          {/* Inner cabinet rim glow — amber signature accent */}
          <mesh position={[0, 0.01, 0]}>
            <torusGeometry args={[1.45, 0.01, 6, 80]} />
            <meshBasicMaterial
              color="#FF7A1A"
              transparent
              opacity={0.35}
              toneMapped={false}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>

          {/* Orbiting code glyphs */}
          <OrbitingGlyphs />

          {/* --- Dedicated laptop light rig (travels with the group) - */}
          {/* Key light — above and slightly front-right */}
          <pointLight
            position={[2, 3, 2]}
            intensity={4}
            color="#ffffff"
            distance={6}
            decay={2}
          />
          {/* Fill light — cool blue from the left */}
          <pointLight
            position={[-2, 1, 1]}
            intensity={1.5}
            color="#4f9cff"
            distance={5}
            decay={2}
          />
          {/* Rim light — amber from behind */}
          <pointLight
            position={[0, 1, -2.5]}
            intensity={2.2}
            color="#FF7A1A"
            distance={4}
            decay={2}
          />
          {/* Spot on the screen face */}
          <spotLight
            position={[0, 2.5, 1.5]}
            angle={0.5}
            intensity={1.2}
            color="#ffffff"
            distance={5}
            decay={2}
            target-position={[0, 0.6, 0]}
          />

          {/* Point light registered so GSAP can pulse intensity */}
          <pointLight
            ref={lightRef}
            color="#4f9cff"
            intensity={3}
            distance={7}
            decay={2}
            position={[0, 0.8, 0.6]}
          />
        </group>
      </Float>
    </group>
  );
}

export default DevStation;
