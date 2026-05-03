/**
 * Central GSAP plugin registrar.
 *
 * This module is the ONLY place `gsap.registerPlugin` should be called.
 * It is client-safe: registration bails out on the server and is
 * idempotent via a global boolean flag.
 *
 * Phase-4 hardening: previously every visit dynamically imported 17
 * plugins (~1.5 MB transfer, 469 KB GSDevTools alone). Most were never
 * used. We now STATIC-import only the plugins the codebase actually
 * references:
 *
 *   - ScrollTrigger     (everywhere)
 *   - TextPlugin        (HeroSection boot-log typewriter)
 *   - ScrambleTextPlugin (Club; KineticTitle, HeroSection eyebrow)
 *   - CustomEase        (curve registration)
 *   - DrawSVGPlugin     (Club; HeroSection grid stroke reveal)
 *   - SplitText         (Club; HeroSection / About / Contact / KineticTitle)
 *   - CustomWiggle      (HeroSection arrow)
 *
 * Club plugins (ScrambleText, DrawSVG, SplitText) are wrapped in
 * try/catch so a missing license never breaks the build or boot.
 *
 * ScrollSmoother is loaded lazily via dynamic import inside
 * SmoothScrollProvider — it has its own load path there.
 *
 * `registerAll` is kept exported as an alias to `registerEssentials`
 * for backwards compatibility with existing callers.
 */

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { TextPlugin } from "gsap/TextPlugin";
import { CustomEase } from "gsap/CustomEase";

declare global {
  // eslint-disable-next-line no-var
  var __a5c_gsap_registered: boolean | undefined;
}

export type GsapRegistrationResult = {
  registered: string[];
  failed: string[];
};

let _result: GsapRegistrationResult | null = null;

function safeRegister(
  name: string,
  plugin: unknown,
  registered: string[],
  failed: string[]
): void {
  try {
    if (plugin) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      gsap.registerPlugin(plugin as any);
      registered.push(name);
    } else {
      failed.push(name);
    }
  } catch (err) {
    failed.push(name);
    if (typeof console !== "undefined") {
      console.warn(`[gsap] plugin "${name}" registration failed`, err);
    }
  }
}

/**
 * Lazy require for Club plugins. We try a static-friendly require so
 * webpack tree-shakes the call when the package isn't present in the
 * bundle. Each is independently guarded.
 */
async function tryClubPlugin(
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
    }
  } catch {
    // Club plugin not installed or unlicensed — site must still render.
    failed.push(name);
  }
}

/**
 * Register the small, curated set of GSAP plugins the codebase needs.
 * Safe to call many times — only the first invocation does work.
 */
export async function registerEssentials(): Promise<GsapRegistrationResult> {
  if (typeof window === "undefined") {
    return { registered: [], failed: [] };
  }
  if (globalThis.__a5c_gsap_registered && _result) {
    return _result;
  }
  globalThis.__a5c_gsap_registered = true;

  const registered: string[] = [];
  const failed: string[] = [];

  // --- Free / always-available plugins (static imports) ---
  safeRegister("ScrollTrigger", ScrollTrigger, registered, failed);
  safeRegister("TextPlugin", TextPlugin, registered, failed);
  safeRegister("CustomEase", CustomEase, registered, failed);

  // --- Club plugins (try/catch so missing license is non-fatal) ---
  // Loaded dynamically so they end up in their own chunks and any
  // resolution failure is contained.
  await tryClubPlugin(
    "ScrambleTextPlugin",
    () => import("gsap/ScrambleTextPlugin"),
    registered,
    failed
  );
  await tryClubPlugin(
    "DrawSVGPlugin",
    () => import("gsap/DrawSVGPlugin"),
    registered,
    failed
  );
  await tryClubPlugin(
    "SplitText",
    () => import("gsap/SplitText"),
    registered,
    failed
  );
  await tryClubPlugin(
    "CustomWiggle",
    () => import("gsap/CustomWiggle"),
    registered,
    failed
  );

  // Register a few CustomEase curves now that the plugin is in.
  if (registered.includes("CustomEase")) {
    try {
      if (typeof CustomEase.create === "function") {
        CustomEase.create("powerSmooth", "M0,0 C0.2,0 0.1,1 1,1");
        CustomEase.create("bootOut", "M0,0 C0.2,0 0.1,1 1,1");
        CustomEase.create("signalSnap", "M0,0 C0.4,0 0.2,1 1,1");
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
 * Backwards-compat alias. Existing callers continue to work.
 */
export const registerAll = registerEssentials;

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

const gsapModule = {
  gsap,
  ScrollTrigger,
  registerAll,
  registerEssentials,
  hasPlugin
};
export default gsapModule;
