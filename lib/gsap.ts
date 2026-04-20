/**
 * Central GSAP plugin registrar.
 *
 * This module is the ONLY place `gsap.registerPlugin` should be called.
 * It is client-safe: `registerAll()` bails out on the server and is
 * idempotent via a global boolean flag. Each plugin load is wrapped in
 * its own try/catch so a missing Club plugin cannot prevent the build
 * from succeeding or the site from booting — the free plugins
 * (ScrollTrigger, Observer, Flip, CustomEase, MotionPath, Text, Easel,
 * Pixi) will register even if every Club plugin fails.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

declare global {
  // eslint-disable-next-line no-var
  var __a5c_gsap_registered: boolean | undefined;
}

export type GsapRegistrationResult = {
  registered: string[];
  failed: string[];
};

let _result: GsapRegistrationResult | null = null;

/**
 * Load a plugin module dynamically. We use `import(path)` so that if a
 * plugin module is missing at runtime it throws a catchable error
 * rather than failing the whole bundle. The dynamic specifier is
 * intentional — we want each plugin to resolve lazily in its own
 * module boundary.
 */
async function loadPlugin(
  name: string,
  loader: () => Promise<unknown>,
  registered: string[],
  failed: string[]
): Promise<void> {
  try {
    const mod = (await loader()) as Record<string, unknown> & {
      default?: unknown;
    };
    const plugin =
      (mod && (mod as Record<string, unknown>)[name]) ??
      (mod && mod.default);
    if (plugin) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gsap.registerPlugin(plugin as any);
      registered.push(name);
    } else {
      failed.push(name);
      if (typeof console !== "undefined") {
        console.warn(
          `[gsap] plugin "${name}" module loaded but no export matched`
        );
      }
    }
  } catch (err) {
    failed.push(name);
    if (typeof console !== "undefined") {
      console.warn(`[gsap] plugin "${name}" unavailable`, err);
    }
  }
}

/**
 * Register all GSAP plugins available in the environment.
 *
 * Safe to call many times — only the first invocation does work.
 * Never throws: every loader is isolated in its own try/catch.
 * Returns a summary of what registered and what failed; callers can
 * log it or drive fallback behavior from it.
 */
export async function registerAll(): Promise<GsapRegistrationResult> {
  if (typeof window === "undefined") {
    return { registered: [], failed: [] };
  }
  if (globalThis.__a5c_gsap_registered && _result) {
    return _result;
  }
  globalThis.__a5c_gsap_registered = true;

  const registered: string[] = [];
  const failed: string[] = [];

  // ScrollTrigger — imported statically so it is always present.
  try {
    gsap.registerPlugin(ScrollTrigger);
    registered.push("ScrollTrigger");
  } catch (err) {
    failed.push("ScrollTrigger");
    if (typeof console !== "undefined") {
      console.warn("[gsap] ScrollTrigger registration failed", err);
    }
  }

  // Free plugins (bundled with gsap on npm).
  await loadPlugin(
    "Observer",
    () => import("gsap/Observer"),
    registered,
    failed
  );
  await loadPlugin("Flip", () => import("gsap/Flip"), registered, failed);
  await loadPlugin(
    "CustomEase",
    () => import("gsap/CustomEase"),
    registered,
    failed
  );
  await loadPlugin(
    "MotionPathPlugin",
    () => import("gsap/MotionPathPlugin"),
    registered,
    failed
  );
  await loadPlugin(
    "TextPlugin",
    () => import("gsap/TextPlugin"),
    registered,
    failed
  );
  await loadPlugin(
    "EaselPlugin",
    () => import("gsap/EaselPlugin"),
    registered,
    failed
  );
  await loadPlugin(
    "PixiPlugin",
    () => import("gsap/PixiPlugin"),
    registered,
    failed
  );

  // Club plugins — may or may not resolve without a Club license.
  // Each is independently guarded so a missing one never throws.
  await loadPlugin(
    "ScrollSmoother",
    () => import("gsap/ScrollSmoother"),
    registered,
    failed
  );
  await loadPlugin(
    "SplitText",
    () => import("gsap/SplitText"),
    registered,
    failed
  );
  await loadPlugin(
    "DrawSVGPlugin",
    () => import("gsap/DrawSVGPlugin"),
    registered,
    failed
  );
  await loadPlugin(
    "MorphSVGPlugin",
    () => import("gsap/MorphSVGPlugin"),
    registered,
    failed
  );
  await loadPlugin(
    "InertiaPlugin",
    () => import("gsap/InertiaPlugin"),
    registered,
    failed
  );
  await loadPlugin(
    "ScrambleTextPlugin",
    () => import("gsap/ScrambleTextPlugin"),
    registered,
    failed
  );
  await loadPlugin(
    "Physics2DPlugin",
    () => import("gsap/Physics2DPlugin"),
    registered,
    failed
  );
  await loadPlugin(
    "PhysicsPropsPlugin",
    () => import("gsap/PhysicsPropsPlugin"),
    registered,
    failed
  );
  await loadPlugin(
    "CustomBounce",
    () => import("gsap/CustomBounce"),
    registered,
    failed
  );
  await loadPlugin(
    "CustomWiggle",
    () => import("gsap/CustomWiggle"),
    registered,
    failed
  );
  await loadPlugin(
    "GSDevTools",
    () => import("gsap/GSDevTools"),
    registered,
    failed
  );

  // Register a few CustomEase curves if CustomEase registered successfully.
  if (registered.includes("CustomEase")) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const CustomEase = (gsap as any).parseEase
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ((gsap as any).core?.globals?.().CustomEase ??
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (await import("gsap/CustomEase").then((m: any) => m.CustomEase)))
        : null;
      if (CustomEase && typeof CustomEase.create === "function") {
        CustomEase.create("powerSmooth", "M0,0 C0.2,0 0.1,1 1,1");
        CustomEase.create("bootOut", "M0,0 C0.2,0 0.1,1 1,1");
        CustomEase.create(
          "signalSnap",
          "M0,0 C0.4,0 0.2,1 1,1"
        );
      }
    } catch (err) {
      if (typeof console !== "undefined") {
        console.warn("[gsap] CustomEase curve registration failed", err);
      }
    }
  }

  _result = { registered, failed };
  return _result;
}

/**
 * Runtime predicate for consumers who want to branch on plugin
 * availability without re-running the registrar.
 */
export function hasPlugin(id: string): boolean {
  if (typeof window === "undefined") return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = gsap as any;
  return !!(
    g.plugins?.[id] ||
    g.core?.globals?.()?.[id] ||
    (_result && _result.registered.includes(id))
  );
}

export { gsap, ScrollTrigger };

const gsapModule = { gsap, ScrollTrigger, registerAll, hasPlugin };
export default gsapModule;
