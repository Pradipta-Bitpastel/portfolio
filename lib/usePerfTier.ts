"use client";

import { useEffect, useState } from "react";

/**
 * Performance tier the client falls into. Consumers use this to gate
 * expensive effects (postprocessing, heavy backdrop-filters, continuous
 * useFrame loops, pointer parallax) so the experience stays smooth on
 * older hardware and integrated GPUs.
 *
 *   - "high":  desktop, 6+ logical cores, no reduced-motion, not on
 *              Data-Saver, no software GPU. Full scene, full effects.
 *   - "low":   narrow viewport, <6 logical cores, reduced-motion,
 *              Data-Saver, coarse pointer (touch), software-rendered
 *              GPU (SwiftShader / llvmpipe / Mesa) or low-end Windows
 *              laptop heuristic. Lightweight path — falls back to the
 *              SVG core in `SceneContainer`.
 */
export type PerfTier = "high" | "low";
export type GPUTier = "high" | "low";

type ConnectionLike = {
  saveData?: boolean;
  effectiveType?: string;
};

/**
 * One-time GPU probe. Creates a hidden offscreen canvas, asks for a
 * WebGL context (preferring webgl2), and reads the unmasked renderer
 * string via the `WEBGL_debug_renderer_info` extension.
 *
 * Returns "low" when the renderer matches a known software / virtual
 * fallback (SwiftShader, llvmpipe, Microsoft Basic Render, Mesa,
 * VirtualBox, ANGLE software). Anything else — or any error along the
 * way — returns "high" so we never falsely downgrade real GPUs.
 *
 * Result is cached for the lifetime of the page; the canvas is
 * discarded after the probe.
 */
let cachedGpuTier: GPUTier | null = null;
export function getGPUTier(): GPUTier {
  if (typeof window === "undefined") return "high";
  if (cachedGpuTier !== null) return cachedGpuTier;

  try {
    const canvas =
      typeof document !== "undefined"
        ? document.createElement("canvas")
        : null;
    if (!canvas) {
      cachedGpuTier = "high";
      return cachedGpuTier;
    }

    const gl = (canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

    if (!gl) {
      // No WebGL at all → definitely low.
      cachedGpuTier = "low";
      return cachedGpuTier;
    }

    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    let renderer = "";
    if (dbg) {
      const unmaskedRenderer = (
        dbg as { UNMASKED_RENDERER_WEBGL?: number }
      ).UNMASKED_RENDERER_WEBGL;
      if (typeof unmaskedRenderer === "number") {
        renderer = String(gl.getParameter(unmaskedRenderer) ?? "");
      }
    }
    if (!renderer) {
      // Fallback to plain RENDERER (often masked but worth checking).
      renderer = String(gl.getParameter(gl.RENDERER) ?? "");
    }

    // Best-effort context cleanup.
    try {
      const lose = gl.getExtension("WEBGL_lose_context");
      if (lose && typeof (lose as { loseContext?: () => void }).loseContext === "function") {
        (lose as { loseContext: () => void }).loseContext();
      }
    } catch {
      /* noop */
    }

    if (
      /SwiftShader|llvmpipe|Microsoft Basic Render|Mesa|VirtualBox|software|ANGLE.*Microsoft Basic Render/i.test(
        renderer
      )
    ) {
      cachedGpuTier = "low";
      return cachedGpuTier;
    }

    cachedGpuTier = "high";
    return cachedGpuTier;
  } catch {
    cachedGpuTier = "high";
    return cachedGpuTier;
  }
}

/**
 * Fire-and-forget Battery API probe. We don't await this — it just
 * updates a module-level flag that subsequent `evaluate()` calls
 * consult. Browsers without the API leave the flag at `false`.
 */
let batteryLow = false;
let batteryProbed = false;
function probeBatteryOnce() {
  if (batteryProbed) return;
  batteryProbed = true;
  if (typeof navigator === "undefined") return;
  const nav = navigator as Navigator & {
    getBattery?: () => Promise<{ charging?: boolean; level?: number }>;
  };
  if (typeof nav.getBattery !== "function") return;
  try {
    nav
      .getBattery()
      .then((b) => {
        if (!b) return;
        // Below 20% and not charging → treat as low so we don't burn
        // the user's last few percent on postprocessing.
        if (b.charging === false && typeof b.level === "number" && b.level < 0.2) {
          batteryLow = true;
        }
      })
      .catch(() => {
        /* noop */
      });
  } catch {
    /* noop */
  }
}

function isWindowsUA(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Win/i.test(ua);
}

function evaluate(): PerfTier {
  if (typeof window === "undefined") return "high";

  // Reduced motion → always low tier.
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return "low";
  }

  // Narrow viewports are handled by the mobile SVG fallback already,
  // but we still tag them so DOM-level effects (blur, magnetic pull)
  // collapse into the cheaper path.
  if (window.innerWidth < 768) return "low";

  // Coarse pointer → treat as low (touch devices, low-end tablets).
  if (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none), (pointer: coarse)").matches
  ) {
    return "low";
  }

  // Data-Saver or slow connection → keep things light.
  const nav = navigator as Navigator & { connection?: ConnectionLike };
  const conn = nav.connection;
  if (conn?.saveData) return "low";
  if (conn?.effectiveType && /(^| )(2g|slow-2g)( |$)/i.test(conn.effectiveType)) {
    return "low";
  }

  // Logical core count. Lifted from <4 to <6 — many cheap 4-core
  // Windows laptops with integrated GPUs crash the full scene.
  const cores =
    typeof navigator !== "undefined" &&
    typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : 0;
  if (cores > 0 && cores < 6) {
    return "low";
  }

  // Heuristic: cheap Windows laptops typically ship with 4-6 cores
  // and integrated GPUs. Even at 6-7 cores they tend to struggle.
  if (isWindowsUA() && cores > 0 && cores < 8) {
    return "low";
  }

  // Device memory hint (Chromium).
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  if (typeof mem === "number" && mem > 0 && mem < 4) return "low";

  // Software-rendered GPU → low.
  if (getGPUTier() === "low") return "low";

  // Battery API hint (best-effort; flag is updated asynchronously).
  if (batteryLow) return "low";

  return "high";
}

/**
 * Reactively reports the current performance tier. Recomputes on
 * viewport resize and reduced-motion changes.
 *
 * Server render and first client render always return "high" so the
 * SSR markup stays stable; the first `useEffect` tick corrects it.
 */
export function usePerfTier(): PerfTier {
  const [tier, setTier] = useState<PerfTier>("high");

  useEffect(() => {
    probeBatteryOnce();
    setTier(evaluate());

    const onResize = () => setTier(evaluate());
    window.addEventListener("resize", onResize, { passive: true });

    let mq: MediaQueryList | null = null;
    let onMq: (() => void) | null = null;
    if (typeof window.matchMedia === "function") {
      mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      onMq = () => setTier(evaluate());
      if (mq.addEventListener) mq.addEventListener("change", onMq);
      else if ("addListener" in mq) (mq as MediaQueryList).addListener(onMq);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      if (mq && onMq) {
        if (mq.removeEventListener) mq.removeEventListener("change", onMq);
        else if ("removeListener" in mq)
          (mq as MediaQueryList).removeListener(onMq);
      }
    };
  }, []);

  return tier;
}

/**
 * Non-reactive read for modules that can't hold React state (R3F
 * useFrame callbacks, GSAP onUpdate). Reads the tier once and caches.
 */
let cachedTier: PerfTier | null = null;
export function readPerfTier(): PerfTier {
  if (typeof window === "undefined") return "high";
  if (cachedTier !== null) return cachedTier;
  cachedTier = evaluate();
  return cachedTier;
}

export type DeviceCapabilities = {
  tier: PerfTier;
  isMobile: boolean;
  isTouch: boolean;
  gpuTier: GPUTier;
  prefersReducedMotion: boolean;
  isWindows: boolean;
  saveData: boolean;
  isLowEnd: boolean;
};

const DEFAULT_CAPS: DeviceCapabilities = {
  tier: "high",
  isMobile: false,
  isTouch: false,
  gpuTier: "high",
  prefersReducedMotion: false,
  isWindows: false,
  saveData: false,
  isLowEnd: false,
};

function evaluateCapabilities(): DeviceCapabilities {
  if (typeof window === "undefined") return DEFAULT_CAPS;

  const tier = evaluate();
  const gpuTier = getGPUTier();

  const prefersReducedMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const isTouch =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(hover: none), (pointer: coarse)").matches;

  const narrow = window.innerWidth <= 1024;

  const cores =
    typeof navigator !== "undefined" &&
    typeof navigator.hardwareConcurrency === "number"
      ? navigator.hardwareConcurrency
      : 0;

  const mem = (navigator as Navigator & { deviceMemory?: number })
    .deviceMemory;

  const nav = navigator as Navigator & { connection?: ConnectionLike };
  const saveData = !!nav.connection?.saveData;

  const isMobile =
    narrow ||
    isTouch ||
    (cores > 0 && cores < 6) ||
    (typeof mem === "number" && mem > 0 && mem < 4) ||
    prefersReducedMotion ||
    gpuTier === "low" ||
    saveData;

  const isWindows = isWindowsUA();
  const isLowEnd = tier === "low" || gpuTier === "low";

  return {
    tier,
    isMobile,
    isTouch,
    gpuTier,
    prefersReducedMotion,
    isWindows,
    saveData,
    isLowEnd,
  };
}

/**
 * Reactive consolidated capability hook. Wraps the individual probes
 * (perf tier, GPU tier, mobile, touch, reduced-motion, save-data,
 * Windows UA) into a single object so consumers like `SceneContainer`
 * can make a single decision: render Canvas or render SVG fallback.
 */
export function useDeviceCapabilities(): DeviceCapabilities {
  const [caps, setCaps] = useState<DeviceCapabilities>(DEFAULT_CAPS);

  useEffect(() => {
    probeBatteryOnce();
    setCaps(evaluateCapabilities());

    const onResize = () => setCaps(evaluateCapabilities());
    window.addEventListener("resize", onResize, { passive: true });

    const mqs: { mq: MediaQueryList; cb: () => void }[] = [];
    if (typeof window.matchMedia === "function") {
      const queries = [
        "(prefers-reduced-motion: reduce)",
        "(hover: none), (pointer: coarse)",
      ];
      for (const q of queries) {
        const mq = window.matchMedia(q);
        const cb = () => setCaps(evaluateCapabilities());
        if (mq.addEventListener) mq.addEventListener("change", cb);
        else if ("addListener" in mq) (mq as MediaQueryList).addListener(cb);
        mqs.push({ mq, cb });
      }
    }

    return () => {
      window.removeEventListener("resize", onResize);
      for (const { mq, cb } of mqs) {
        if (mq.removeEventListener) mq.removeEventListener("change", cb);
        else if ("removeListener" in mq) (mq as MediaQueryList).removeListener(cb);
      }
    };
  }, []);

  return caps;
}

export default usePerfTier;
