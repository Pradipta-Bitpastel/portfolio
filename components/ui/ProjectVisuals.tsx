"use client";

import { memo, useEffect, useRef } from "react";
import { gsap, registerAll } from "@/lib/gsap";

/**
 * ProjectVisuals — five self-contained animated SVG dioramas, one per
 * project "type". Each is a pure SVG + GSAP piece, 400×400 viewBox,
 * designed to read at ~500px square. The animations are idempotent:
 * they start on mount and loop forever. The parent controls visibility
 * with opacity; these visuals don't know about scroll.
 *
 * Design constraints:
 *   - No bitmap assets
 *   - Pure geometry + stroke draws + radial/point pulses
 *   - Each visual uses the project color as its primary accent and
 *     amber (#FF7A1A) as its secondary accent
 *   - Target ~60fps on integrated GPUs — no per-frame React state
 */

type VisualProps = { color: string };

/* ───────────────────────── 1. Neural Net ─────────────────────────
 * 3-layer feed-forward net. Nodes pulse in waves. Signal packets
 * travel along the edges from left to right on a loop.
 * Fits: AI-Integrated Web App.
 */
function NeuralNetImpl({ color }: VisualProps) {
  const rootRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await registerAll();
      if (cancelled || !rootRef.current) return;
      const root = rootRef.current;

      // Node pulse — staggered from left to right, forever.
      const nodes = root.querySelectorAll<SVGCircleElement>(".nn-node");
      gsap.to(nodes, {
        opacity: 0.35,
        duration: 0.9,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: {
          each: 0.12,
          from: "start"
        }
      });

      // Signal packets — small dots travel along edges.
      const packets = root.querySelectorAll<SVGCircleElement>(".nn-packet");
      packets.forEach((p, i) => {
        const path = p.dataset.path;
        if (!path) return;
        gsap.fromTo(
          p,
          { opacity: 0 },
          {
            opacity: 1,
            duration: 0.18,
            repeat: -1,
            yoyo: true,
            repeatDelay: 1.8 + i * 0.07
          }
        );
        const [x1, y1, x2, y2] = path.split(",").map(Number);
        gsap.fromTo(
          p,
          { attr: { cx: x1, cy: y1 } },
          {
            attr: { cx: x2, cy: y2 },
            duration: 2,
            ease: "power1.in",
            repeat: -1,
            delay: i * 0.07
          }
        );
      });
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  // Compute a 3-layer grid: 4 input, 5 hidden, 3 output.
  const layers: Array<Array<{ x: number; y: number }>> = [
    Array.from({ length: 4 }, (_, i) => ({ x: 60, y: 70 + i * 90 })),
    Array.from({ length: 5 }, (_, i) => ({ x: 200, y: 40 + i * 80 })),
    Array.from({ length: 3 }, (_, i) => ({ x: 340, y: 100 + i * 100 }))
  ];
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  for (let l = 0; l < layers.length - 1; l++) {
    for (const a of layers[l]) {
      for (const b of layers[l + 1]) {
        edges.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
      }
    }
  }

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 400 400"
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="nn-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.8" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Edges */}
      {edges.map((e, i) => (
        <line
          key={i}
          x1={e.x1}
          y1={e.y1}
          x2={e.x2}
          y2={e.y2}
          stroke={color}
          strokeOpacity="0.12"
          strokeWidth="0.8"
        />
      ))}
      {/* Signal packets — one per selected edge */}
      {edges.slice(0, 7).map((e, i) => (
        <circle
          key={i}
          className="nn-packet"
          r="2.5"
          fill="#FF7A1A"
          data-path={`${e.x1},${e.y1},${e.x2},${e.y2}`}
          opacity={0}
          style={{ filter: "drop-shadow(0 0 4px #FF7A1A)" }}
        />
      ))}
      {/* Nodes */}
      {layers.flat().map((n, i) => (
        <g key={i}>
          <circle
            cx={n.x}
            cy={n.y}
            r="14"
            fill="url(#nn-glow)"
            opacity="0.4"
          />
          <circle
            className="nn-node"
            cx={n.x}
            cy={n.y}
            r="5"
            fill={color}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
          <circle
            cx={n.x}
            cy={n.y}
            r="7"
            fill="none"
            stroke={color}
            strokeOpacity="0.5"
            strokeWidth="1"
          />
        </g>
      ))}
      {/* Layer labels */}
      {["IN", "HIDDEN", "OUT"].map((l, i) => (
        <text
          key={l}
          x={[60, 200, 340][i]}
          y={390}
          textAnchor="middle"
          fontSize="11"
          fontFamily="ui-monospace, monospace"
          fill="#FF7A1A"
          letterSpacing="2"
        >
          {l}
        </text>
      ))}
    </svg>
  );
}
export const NeuralNet = memo(NeuralNetImpl);

/* ───────────────────────── 2. Orbit Rings ─────────────────────────
 * Three concentric dashed rings with orbit markers. Rings rotate at
 * different speeds and opposite directions. Inner core pulses.
 * Fits: Cross-Platform Mobile.
 */
function OrbitRingsImpl({ color }: VisualProps) {
  const rootRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await registerAll();
      if (cancelled || !rootRef.current) return;
      const root = rootRef.current;
      const rings = root.querySelectorAll<SVGGElement>(".orbit-ring");
      rings.forEach((ring, i) => {
        const dir = i % 2 === 0 ? 1 : -1;
        gsap.to(ring, {
          rotation: 360 * dir,
          duration: 18 + i * 8,
          ease: "none",
          repeat: -1,
          transformOrigin: "200px 200px"
        });
      });
      const core = root.querySelector(".orbit-core");
      if (core) {
        gsap.to(core, {
          scale: 1.15,
          duration: 1.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          transformOrigin: "200px 200px"
        });
      }
      // Phone silhouette floats.
      const phones = root.querySelectorAll<SVGGElement>(".orbit-phone");
      phones.forEach((p, i) => {
        gsap.to(p, {
          y: (i % 2 === 0 ? -1 : 1) * 6,
          duration: 2.2 + i * 0.3,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1
        });
      });
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const markers = (count: number, radius: number) =>
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2;
      return { x: 200 + Math.cos(a) * radius, y: 200 + Math.sin(a) * radius };
    });

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 400 400"
      className="h-full w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id="orbit-core-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="60%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* Outer ring */}
      <g className="orbit-ring">
        <circle
          cx="200"
          cy="200"
          r="170"
          fill="none"
          stroke={color}
          strokeOpacity="0.25"
          strokeWidth="1"
          strokeDasharray="2 6"
        />
        {markers(12, 170).map((m, i) => (
          <circle
            key={i}
            cx={m.x}
            cy={m.y}
            r="2"
            fill={color}
            opacity="0.6"
          />
        ))}
      </g>
      {/* Middle ring */}
      <g className="orbit-ring">
        <circle
          cx="200"
          cy="200"
          r="125"
          fill="none"
          stroke="#FF7A1A"
          strokeOpacity="0.45"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        {markers(6, 125).map((m, i) => (
          <rect
            key={i}
            x={m.x - 3}
            y={m.y - 3}
            width="6"
            height="6"
            fill="#FF7A1A"
            transform={`rotate(45 ${m.x} ${m.y})`}
          />
        ))}
      </g>
      {/* Inner ring */}
      <g className="orbit-ring">
        <circle
          cx="200"
          cy="200"
          r="80"
          fill="none"
          stroke={color}
          strokeOpacity="0.6"
          strokeWidth="1.5"
        />
        {markers(3, 80).map((m, i) => (
          <circle
            key={i}
            cx={m.x}
            cy={m.y}
            r="5"
            fill={color}
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        ))}
      </g>
      {/* Core glow */}
      <circle cx="200" cy="200" r="50" fill="url(#orbit-core-glow)" />
      {/* Core chip */}
      <g className="orbit-core">
        <rect
          x="175"
          y="175"
          width="50"
          height="50"
          fill="#0b0f19"
          stroke={color}
          strokeWidth="1.5"
        />
        <rect
          x="183"
          y="183"
          width="34"
          height="34"
          fill="none"
          stroke="#FF7A1A"
          strokeOpacity="0.8"
          strokeWidth="1"
        />
        <text
          x="200"
          y="206"
          textAnchor="middle"
          fontSize="10"
          fontFamily="ui-monospace, monospace"
          fontWeight="700"
          fill="#FF7A1A"
          letterSpacing="1"
        >
          RN
        </text>
      </g>
      {/* Phone silhouettes */}
      <g className="orbit-phone" transform="translate(60, 80) rotate(-12)">
        <rect
          x="0"
          y="0"
          width="46"
          height="78"
          rx="6"
          fill="#0b0f19"
          stroke={color}
          strokeWidth="1.5"
        />
        <rect x="6" y="10" width="34" height="54" fill={color} opacity="0.15" />
        <circle cx="23" cy="72" r="2" fill={color} opacity="0.7" />
      </g>
      <g className="orbit-phone" transform="translate(296, 242) rotate(12)">
        <rect
          x="0"
          y="0"
          width="46"
          height="78"
          rx="6"
          fill="#0b0f19"
          stroke="#FF7A1A"
          strokeWidth="1.5"
        />
        <rect x="6" y="10" width="34" height="54" fill="#FF7A1A" opacity="0.18" />
        <circle cx="23" cy="72" r="2" fill="#FF7A1A" opacity="0.8" />
      </g>
    </svg>
  );
}
export const OrbitRings = memo(OrbitRingsImpl);

/* ───────────────────────── 3. Pipeline ─────────────────────────
 * Horizontal CI/CD pipeline with 5 stages. A data packet travels
 * the path on a loop; each stage node pulses when the packet reaches
 * it. Clouds float above.
 * Fits: Cloud + CI/CD.
 */
function PipelineImpl({ color }: VisualProps) {
  const rootRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await registerAll();
      if (cancelled || !rootRef.current) return;
      const root = rootRef.current;
      const packet = root.querySelector<SVGCircleElement>(".pipe-packet");
      const path = root.querySelector<SVGPathElement>("#pipe-path");
      if (packet && path) {
        const len = path.getTotalLength();
        const state = { t: 0 };
        gsap.to(state, {
          t: 1,
          duration: 4.5,
          ease: "power1.inOut",
          repeat: -1,
          onUpdate: () => {
            const p = path.getPointAtLength(state.t * len);
            packet.setAttribute("cx", p.x.toString());
            packet.setAttribute("cy", p.y.toString());
          }
        });
      }
      const stages = root.querySelectorAll<SVGGElement>(".pipe-stage");
      stages.forEach((s, i) => {
        gsap.to(s, {
          scale: 1.18,
          duration: 0.35,
          ease: "power2.out",
          repeat: -1,
          repeatDelay: 4.15,
          yoyo: true,
          delay: 0.45 + i * 0.85,
          transformOrigin: "center center"
        });
      });
      const clouds = root.querySelectorAll<SVGGElement>(".pipe-cloud");
      clouds.forEach((c, i) => {
        gsap.to(c, {
          x: i % 2 === 0 ? 12 : -12,
          duration: 3.8 + i * 0.6,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1
        });
      });
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const stages = [
    { x: 50, y: 240, label: "PUSH" },
    { x: 130, y: 180, label: "BUILD" },
    { x: 210, y: 240, label: "TEST" },
    { x: 290, y: 180, label: "DEPLOY" },
    { x: 370, y: 240, label: "PROD" }
  ];

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 400 400"
      className="h-full w-full"
      aria-hidden
    >
      {/* Clouds floating above */}
      {[
        { x: 80, y: 70, s: 1 },
        { x: 200, y: 50, s: 1.3 },
        { x: 300, y: 80, s: 0.9 }
      ].map((c, i) => (
        <g key={i} className="pipe-cloud" transform={`translate(${c.x},${c.y})`}>
          <ellipse
            cx="0"
            cy="0"
            rx={20 * c.s}
            ry={10 * c.s}
            fill={color}
            opacity="0.28"
          />
          <ellipse
            cx="-14"
            cy="4"
            rx={14 * c.s}
            ry={8 * c.s}
            fill={color}
            opacity="0.28"
          />
          <ellipse
            cx="14"
            cy="4"
            rx={14 * c.s}
            ry={8 * c.s}
            fill={color}
            opacity="0.28"
          />
          <path
            d={`M -20 0 Q 0 -${12 * c.s} 20 0`}
            fill="none"
            stroke={color}
            strokeOpacity="0.95"
            strokeWidth="1.4"
          />
        </g>
      ))}
      {/* Pipeline path — zigzag through stages */}
      <path
        id="pipe-path"
        d="M 50 240 Q 90 240 130 180 Q 170 180 210 240 Q 250 240 290 180 Q 330 180 370 240"
        fill="none"
        stroke={color}
        strokeOpacity="0.55"
        strokeWidth="2.2"
        strokeDasharray="4 3"
      />
      {/* Stages */}
      {stages.map((s, i) => (
        <g
          key={s.label}
          className="pipe-stage"
          transform={`translate(${s.x} ${s.y})`}
        >
          <circle r="18" fill="#0b0f19" stroke={color} strokeWidth="1.5" />
          <circle
            r="8"
            fill={color}
            opacity="0.85"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
          <text
            y="38"
            textAnchor="middle"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            fill="#FF7A1A"
            letterSpacing="1.5"
          >
            {s.label}
          </text>
          <text
            y="-26"
            textAnchor="middle"
            fontSize="9"
            fontFamily="ui-monospace, monospace"
            fill={color}
            opacity="0.6"
          >
            {String(i + 1).padStart(2, "0")}
          </text>
        </g>
      ))}
      {/* Travelling packet */}
      <circle
        className="pipe-packet"
        cx="50"
        cy="240"
        r="4"
        fill="#FFE0BD"
        style={{ filter: "drop-shadow(0 0 8px #FF7A1A)" }}
      />
      {/* Server rack base */}
      <g transform="translate(100 320)">
        {[0, 1, 2, 3].map((i) => (
          <g key={i} transform={`translate(${i * 55} 0)`}>
            <rect
              width="45"
              height="50"
              fill="#0b0f19"
              stroke="#FF7A1A"
              strokeOpacity="0.35"
              strokeWidth="1"
            />
            <line
              x1="5"
              y1="12"
              x2="25"
              y2="12"
              stroke={color}
              strokeOpacity="0.7"
              strokeWidth="1.5"
            />
            <line
              x1="5"
              y1="22"
              x2="30"
              y2="22"
              stroke={color}
              strokeOpacity="0.4"
              strokeWidth="1"
            />
            <line
              x1="5"
              y1="32"
              x2="20"
              y2="32"
              stroke={color}
              strokeOpacity="0.5"
              strokeWidth="1"
            />
            <circle cx="38" cy="42" r="2" fill="#FF7A1A" />
          </g>
        ))}
      </g>
    </svg>
  );
}
export const Pipeline = memo(PipelineImpl);

/* ───────────────────────── 4. Bar Stack ─────────────────────────
 * Dashboard-style chart: 7 vertical bars with animated heights, grid
 * lines, and a moving data cursor. A small line chart overlays.
 * Fits: Admin Dashboard.
 */
function BarStackImpl({ color }: VisualProps) {
  const rootRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await registerAll();
      if (cancelled || !rootRef.current) return;
      const root = rootRef.current;
      const bars = root.querySelectorAll<SVGRectElement>(".bar-fill");
      bars.forEach((b) => {
        const h = parseFloat(b.dataset.targetH || "0");
        const y = 300 - h;
        gsap.fromTo(
          b,
          { attr: { height: 0, y: 300 } },
          {
            attr: { height: h, y },
            duration: 1.1,
            ease: "power3.out",
            repeat: -1,
            yoyo: true,
            repeatDelay: 2.2,
            delay: Math.random() * 0.3
          }
        );
      });
      const cursor = root.querySelector<SVGGElement>(".bar-cursor");
      if (cursor) {
        gsap.to(cursor, {
          x: 280,
          duration: 3.5,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1
        });
      }
      const lineDot = root.querySelector<SVGCircleElement>(".line-dot");
      const linePath = root.querySelector<SVGPathElement>("#line-path");
      if (lineDot && linePath) {
        const len = linePath.getTotalLength();
        const state = { t: 0 };
        gsap.to(state, {
          t: 1,
          duration: 4,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
          onUpdate: () => {
            const p = linePath.getPointAtLength(state.t * len);
            lineDot.setAttribute("cx", p.x.toString());
            lineDot.setAttribute("cy", p.y.toString());
          }
        });
      }
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const barHeights = [60, 110, 85, 150, 120, 200, 160];

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 400 400"
      className="h-full w-full"
      aria-hidden
    >
      {/* Grid */}
      {[0, 1, 2, 3, 4].map((i) => (
        <line
          key={i}
          x1="60"
          x2="360"
          y1={100 + i * 50}
          y2={100 + i * 50}
          stroke="#FF7A1A"
          strokeOpacity="0.12"
          strokeWidth="1"
          strokeDasharray="2 4"
        />
      ))}
      {/* Axis labels */}
      {["100%", "75%", "50%", "25%", "0%"].map((l, i) => (
        <text
          key={l}
          x="54"
          y={104 + i * 50}
          textAnchor="end"
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          fill="#FF7A1A"
          opacity="0.5"
        >
          {l}
        </text>
      ))}
      {/* Bars */}
      {barHeights.map((h, i) => {
        const x = 80 + i * 42;
        return (
          <g key={i}>
            <rect
              x={x}
              y={100}
              width="28"
              height="200"
              fill={color}
              opacity="0.08"
            />
            <rect
              className="bar-fill"
              x={x}
              y={300}
              width="28"
              height="0"
              data-target-h={h}
              fill={color}
              style={{ filter: `drop-shadow(0 0 6px ${color})` }}
            />
            <rect
              x={x}
              y={300 - h - 4}
              width="28"
              height="2"
              fill="#FF7A1A"
            />
            <text
              x={x + 14}
              y={315}
              textAnchor="middle"
              fontSize="9"
              fontFamily="ui-monospace, monospace"
              fill="#FF7A1A"
              opacity="0.5"
            >
              D{i + 1}
            </text>
          </g>
        );
      })}
      {/* Line chart overlay */}
      <path
        id="line-path"
        d="M 80 220 L 122 180 L 164 200 L 206 140 L 248 160 L 290 110 L 332 130"
        fill="none"
        stroke="#FF7A1A"
        strokeWidth="1.5"
        strokeDasharray="3 2"
      />
      <circle
        className="line-dot"
        cx="80"
        cy="220"
        r="4"
        fill="#FFE0BD"
        style={{ filter: "drop-shadow(0 0 6px #FF7A1A)" }}
      />
      {/* Data cursor */}
      <g className="bar-cursor" transform="translate(60,0)">
        <line
          x1="0"
          y1="100"
          x2="0"
          y2="300"
          stroke="#FF7A1A"
          strokeWidth="1"
          strokeDasharray="2 3"
          opacity="0.65"
        />
        <circle cy="100" r="3" fill="#FF7A1A" />
      </g>
      {/* Header */}
      <text
        x="60"
        y="80"
        fontSize="11"
        fontFamily="ui-monospace, monospace"
        fill="#FF7A1A"
        letterSpacing="2"
      >
        METRICS.REALTIME
      </text>
      <text
        x="360"
        y="80"
        textAnchor="end"
        fontSize="11"
        fontFamily="ui-monospace, monospace"
        fill={color}
      >
        +42.7%
      </text>
      {/* Footer bar */}
      <rect x="60" y="340" width="300" height="30" fill={color} opacity="0.06" />
      <text
        x="70"
        y="360"
        fontSize="10"
        fontFamily="ui-monospace, monospace"
        fill={color}
      >
        {"// LIVE QUERY / 38 ROWS / 12ms"}
      </text>
    </svg>
  );
}
export const BarStack = memo(BarStackImpl);

/* ───────────────────────── 5. Module Grid ─────────────────────────
 * A 5×5 lattice of squares. Selected squares light up in a scanning
 * wave pattern — simulating a CMS "block editor" powering on.
 * Fits: WordPress Build.
 */
function ModuleGridImpl({ color }: VisualProps) {
  const rootRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    let cancelled = false;
    const boot = async () => {
      await registerAll();
      if (cancelled || !rootRef.current) return;
      const root = rootRef.current;
      const tiles = root.querySelectorAll<SVGRectElement>(".grid-tile");
      // Diagonal wave of activation.
      tiles.forEach((t, i) => {
        const r = Math.floor(i / 5);
        const c = i % 5;
        const wave = (r + c) * 0.1;
        gsap.to(t, {
          fillOpacity: 0.95,
          duration: 0.6,
          ease: "power2.out",
          yoyo: true,
          repeat: -1,
          repeatDelay: 2.2,
          delay: wave
        });
      });
      const scanner = root.querySelector(".grid-scanner");
      if (scanner) {
        gsap.to(scanner, {
          y: 250,
          duration: 2.4,
          ease: "none",
          repeat: -1
        });
      }
      const glyphs = root.querySelectorAll<SVGGElement>(".grid-glyph");
      glyphs.forEach((g, i) => {
        gsap.to(g, {
          opacity: 0.5,
          duration: 1.4,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
          delay: i * 0.2
        });
      });
    };
    void boot();
    return () => {
      cancelled = true;
    };
  }, []);

  const tiles = [];
  const gridSize = 5;
  const tileSize = 48;
  const gap = 8;
  const gridStart = 80;
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      tiles.push({
        r,
        c,
        x: gridStart + c * (tileSize + gap),
        y: gridStart + r * (tileSize + gap)
      });
    }
  }

  const glyphPaths = [
    // Paragraph
    "M 4 6 L 28 6 M 4 14 L 28 14 M 4 22 L 20 22",
    // Header
    "M 4 6 L 28 6 M 4 14 L 28 14 M 4 22 L 28 22 M 4 30 L 20 30",
    // Image
    "M 4 4 L 28 4 L 28 28 L 4 28 Z M 10 18 L 16 12 L 22 20 L 28 14",
    // List
    "M 4 8 L 4 8 M 8 8 L 28 8 M 4 16 L 4 16 M 8 16 L 28 16 M 4 24 L 4 24 M 8 24 L 28 24",
    // Code
    "M 8 6 L 2 14 L 8 22 M 22 6 L 28 14 L 22 22"
  ];

  return (
    <svg
      ref={rootRef}
      viewBox="0 0 400 400"
      className="h-full w-full"
      aria-hidden
    >
      {/* Grid tiles */}
      {tiles.map((t, i) => {
        const isAccent = (t.r + t.c) % 3 === 0;
        return (
          <g key={i}>
            <rect
              x={t.x}
              y={t.y}
              width={tileSize}
              height={tileSize}
              fill={isAccent ? color : "#0b0f19"}
              fillOpacity={isAccent ? "0.12" : "0.8"}
              stroke={isAccent ? color : "#FF7A1A"}
              strokeOpacity="0.4"
              strokeWidth="1"
            />
            <rect
              className="grid-tile"
              x={t.x + 2}
              y={t.y + 2}
              width={tileSize - 4}
              height={tileSize - 4}
              fill={color}
              fillOpacity="0.08"
            />
            {/* Mini glyph (only on some tiles) */}
            {i % 3 === 0 && (
              <g
                className="grid-glyph"
                transform={`translate(${t.x + 8} ${t.y + 8})`}
                opacity="0.9"
              >
                <path
                  d={glyphPaths[i % glyphPaths.length]}
                  stroke={isAccent ? "#FF7A1A" : color}
                  strokeWidth="1.2"
                  fill="none"
                  strokeLinecap="round"
                />
              </g>
            )}
          </g>
        );
      })}
      {/* Scanning line */}
      <g className="grid-scanner" transform="translate(80 80)">
        <line
          x1="0"
          y1="0"
          x2="280"
          y2="0"
          stroke="#FF7A1A"
          strokeWidth="1.5"
          strokeOpacity="0.85"
          style={{ filter: "drop-shadow(0 0 6px rgba(255,122,26,0.9))" }}
        />
      </g>
      {/* Header label */}
      <text
        x="80"
        y="60"
        fontSize="11"
        fontFamily="ui-monospace, monospace"
        fill="#FF7A1A"
        letterSpacing="2"
      >
        THEME.BLOCK // EDITOR
      </text>
      <text
        x="360"
        y="60"
        textAnchor="end"
        fontSize="11"
        fontFamily="ui-monospace, monospace"
        fill={color}
      >
        25 / 25
      </text>
      {/* Footer */}
      <text
        x="80"
        y="360"
        fontSize="10"
        fontFamily="ui-monospace, monospace"
        fill={color}
        opacity="0.7"
      >
        {"<section class=\"hero\">"}
      </text>
      <text
        x="80"
        y="378"
        fontSize="10"
        fontFamily="ui-monospace, monospace"
        fill="#FF7A1A"
        opacity="0.6"
      >
        {"  // wp_enqueue_style()"}
      </text>
    </svg>
  );
}
export const ModuleGrid = memo(ModuleGridImpl);

/* ───────────────────────── Lookup ─────────────────────────
 * Convenience mapping from project id → visual component.
 */
export const PROJECT_VISUALS: Record<
  string,
  React.ComponentType<VisualProps>
> = {
  "ai-integrated-webapp": NeuralNet,
  "react-native-expo-app": OrbitRings,
  "cloud-cicd-pipeline": Pipeline,
  "admin-dashboard": BarStack,
  "wordpress-build": ModuleGrid
};
