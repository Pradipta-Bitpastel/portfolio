/**
 * @process portfolio-perf-responsive
 * @description Optimize the existing DEV.OS portfolio for (1) animation performance on
 * Vercel free tier and low-spec / Windows devices, (2) full responsiveness across
 * mobile / tablet / desktop, and (3) cross-browser correctness.
 *
 * Strategy:
 *   - Aggressive perf tiering: any low-spec device (low cores, low RAM, integrated GPU,
 *     slow connection, coarse pointer, narrow viewport, prefers-reduced-motion, Windows
 *     without dedicated GPU heuristics) gets the SVG core fallback.
 *   - Three.js scene optimizations: LOD geometry, skip postprocessing on low tier, gate
 *     useFrame loops by visibility, disable bloom + antialiasing on low tier.
 *   - GSAP cleanup: lazy-register only used plugins, scope ScrollTriggers to gsap.context,
 *     disable expensive scrub on low tier.
 *   - Responsive layout: audit & fix all sections for 375 / 414 / 768 / 1024 / 1280 / 1920.
 *   - Cross-browser: chromium / firefox / webkit verification at every viewport.
 *   - Quality convergence loop: Lighthouse (mobile + desktop) + Playwright across
 *     viewports + visual regression + bundle-size analysis.
 *
 * @inputs {
 *   targetDesktopPerf: number,    // Lighthouse desktop perf floor (default 90)
 *   targetMobilePerf:  number,    // Lighthouse mobile perf floor (default 75)
 *   maxIterations:     number,    // max convergence iterations (default 5)
 *   viewports:         string[]   // viewport sizes to verify
 * }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

// ---------------------------------------------------------------------------
// MAIN PROCESS
// ---------------------------------------------------------------------------
export async function process(inputs, ctx) {
  const {
    targetDesktopPerf = 90,
    targetMobilePerf = 75,
    maxIterations = 5,
    viewports = ['375x812', '414x896', '768x1024', '1024x768', '1280x800', '1920x1080']
  } = inputs;

  ctx.log('info', '🛠  Starting Portfolio perf + responsive optimization');
  ctx.log('info', `Targets: desktop ≥ ${targetDesktopPerf}, mobile ≥ ${targetMobilePerf}`);

  // =========================================================================
  // PHASE 1 — AUDIT current state (no code changes)
  // Identify the worst offenders so later phases have a concrete punch list.
  // =========================================================================
  ctx.log('info', 'Phase 1 — audit current state');

  const audit = await ctx.task(auditTask, { viewports });

  // =========================================================================
  // PHASE 2 — Strengthen perf-tier + mobile detection
  // Make low-tier detection aggressive so weak devices get the SVG fallback.
  // =========================================================================
  ctx.log('info', 'Phase 2 — strengthen perf-tier detection');

  await ctx.task(perfTierUpgradeTask, { audit });

  // =========================================================================
  // PHASE 3 — 3D scene optimizations (geometry, postprocessing, frame loop)
  // =========================================================================
  ctx.log('info', 'Phase 3 — 3D scene optimization');

  await ctx.task(sceneOptimizeTask, { audit });

  // =========================================================================
  // PHASE 4 — Animation / GSAP optimization
  // =========================================================================
  ctx.log('info', 'Phase 4 — animation / GSAP optimization');

  await ctx.task(animationOptimizeTask, { audit });

  // =========================================================================
  // PHASE 5 — Responsive layout audit + fixes
  // =========================================================================
  ctx.log('info', 'Phase 5 — responsive layout fixes');

  await ctx.task(responsiveFixesTask, { audit, viewports });

  // =========================================================================
  // PHASE 6 — Cross-browser compatibility fixes
  // =========================================================================
  ctx.log('info', 'Phase 6 — cross-browser fixes');

  await ctx.task(crossBrowserFixesTask, { audit });

  // =========================================================================
  // PHASE 7 — Build + typecheck gate (with auto-repair)
  // =========================================================================
  ctx.log('info', 'Phase 7 — build + typecheck gate');

  let buildResult = await ctx.task(buildGateTask, { iteration: 0 });
  let buildIter = 0;
  while (!buildResult.success && buildIter < 3) {
    buildIter++;
    ctx.log('warn', `Build failed (try ${buildIter}); repairing`);
    await ctx.task(buildRepairTask, { errors: buildResult.errors, iteration: buildIter });
    buildResult = await ctx.task(buildGateTask, { iteration: buildIter });
  }
  if (!buildResult.success) {
    throw new Error('Build did not converge after repair attempts');
  }

  // =========================================================================
  // PHASE 8 — Quality convergence loop
  // Parallel: Lighthouse mobile + desktop, Playwright across viewports,
  // visual regression, bundle-size check. Refine until all targets met.
  // =========================================================================
  ctx.log('info', 'Phase 8 — quality convergence loop');

  let iteration = 0;
  let converged = false;
  const history = [];
  let lastScore = null;

  while (iteration < maxIterations && !converged) {
    iteration++;
    ctx.log('info', `Iteration ${iteration}/${maxIterations}`);

    const [lhDesktop, lhMobile, e2e, visual] = await ctx.parallel.all([
      () => ctx.task(lighthouseDesktopTask, { iteration }),
      () => ctx.task(lighthouseMobileTask, { iteration }),
      () => ctx.task(e2eMultiViewportTask, { iteration, viewports }),
      () => ctx.task(visualRegressionTask, { iteration, viewports })
    ]);

    const score = await ctx.task(qualityScoreTask, {
      iteration,
      lhDesktop,
      lhMobile,
      e2e,
      visual,
      targetDesktopPerf,
      targetMobilePerf
    });

    lastScore = score;
    history.push({ iteration, score, lhDesktop, lhMobile, e2e, visual });

    if (score.converged) {
      converged = true;
      break;
    }

    if (iteration < maxIterations) {
      await ctx.task(refineTask, {
        iteration,
        recommendations: score.recommendations,
        lhDesktop,
        lhMobile,
        e2e,
        visual
      });

      // Re-gate the build after refinement.
      const rebuild = await ctx.task(buildGateTask, { iteration });
      if (!rebuild.success) {
        await ctx.task(buildRepairTask, { errors: rebuild.errors, iteration });
      }
    }
  }

  // =========================================================================
  // PHASE 9 — Final report
  // =========================================================================
  ctx.log('info', 'Phase 9 — final report');

  const finalReport = await ctx.task(finalReportTask, {
    converged,
    lastScore,
    targetDesktopPerf,
    targetMobilePerf,
    iterations: iteration,
    history
  });

  return {
    success: converged,
    converged,
    iterations: iteration,
    lastScore,
    targetDesktopPerf,
    targetMobilePerf,
    history,
    artifacts: finalReport,
    metadata: {
      processId: 'portfolio-perf-responsive',
      timestamp: ctx.now()
    }
  };
}

// ===========================================================================
// PHASE 1 — AUDIT
// ===========================================================================
export const auditTask = defineTask('audit', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Audit current performance + responsive state',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior frontend perf engineer auditing a Next.js 14 + R3F + GSAP portfolio',
      task: 'Audit the existing /Users/pradiptajana/Portfolio codebase and produce a concrete punch list of performance, responsive, and cross-browser issues.',
      context: {
        cwd: '/Users/pradiptajana/Portfolio',
        viewports: args.viewports,
        scope: [
          'Animation performance on Vercel free tier and low-spec Windows machines',
          'Responsive correctness at 375 / 414 / 768 / 1024 / 1280 / 1920',
          'Cross-browser correctness (chromium / firefox / webkit)',
          'Bundle size + initial load'
        ]
      },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Read package.json, next.config.mjs, tailwind.config.ts to confirm stack.',
        'Read the entire components/three/ directory and components/sections/. Identify: useFrame loops, postprocessing usage, geometry detail levels, draw counts, GSAP ScrollTriggers, scrub usage.',
        'Read lib/usePerfTier.ts and lib/useIsMobile.ts. Note current low-tier detection thresholds.',
        'Read app/layout.tsx and app/globals.css. Note backdrop-filter usage, large fonts, expensive selectors.',
        'Read every section component. For each, list: GSAP ScrollTrigger config, scrub:true presence, pinning, large DOM nodes, hardcoded widths.',
        'Skim public/ for asset sizes; report the 10 biggest files in public/ with sizes.',
        'Run `npm run build 2>&1 | tail -120` and capture bundle size output.',
        'Produce a punch list with EXACT file paths and line numbers per issue. Categorize as: PERF-3D, PERF-DOM, RESPONSIVE, BROWSER-COMPAT, BUNDLE-SIZE.',
        'Return JSON: { issues: [{ category, severity:"critical|high|medium", file, line?, summary, recommendation }], bundleSize:{...}, threeJSStats:{useFrameLoops:N, postProcessing:bool, geometryDetail:[]}, gsapStats:{scrollTriggerCount:N, scrubUsage:N}, summary: "..." }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['issues'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// PHASE 2 — strengthen perf tier
// ===========================================================================
export const perfTierUpgradeTask = defineTask('perf-tier-upgrade', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Upgrade perf-tier + mobile detection (aggressive low-tier)',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior frontend engineer hardening device-capability detection',
      task: 'Make low-tier detection aggressive so all weak devices fall back to the SVG core. Update lib/usePerfTier.ts and lib/useIsMobile.ts.',
      context: { cwd: '/Users/pradiptajana/Portfolio', audit: args.audit },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Update lib/usePerfTier.ts to also flag as "low": deviceMemory < 4, hardwareConcurrency < 6 (was 4), Windows + integrated GPU heuristic via WebGL renderer string when available, save-data, effective connection 2g/3g, Battery API < 30% with !charging (best-effort), and any device matching `(hover: none) or (pointer: coarse)`.',
        'Add a new helper `getGPUTier()` that does a one-time WebGL probe: create a hidden <canvas>, get WEBGL_debug_renderer_info, read UNMASKED_RENDERER_WEBGL. If renderer string contains /SwiftShader|llvmpipe|Microsoft Basic Render|Mesa|VirtualBox|software/i, return "low". Cache the result. Be defensive — wrap in try/catch and return "high" as fallback.',
        'Update useIsMobile to additionally treat any device <= 1024px viewport OR coarse pointer OR low GPU tier OR low memory as mobile. The user picked the "Aggressive: SVG fallback for any low-tier device" option, so be conservative on the desktop side.',
        'Add SSR-safe guards: every browser API call must be inside `typeof window !== "undefined"` or `typeof navigator !== "undefined"`.',
        'Keep the existing `usePerfTier`, `readPerfTier`, default exports intact (no API breakage).',
        'Add a new `useDeviceCapabilities()` hook that returns `{ tier, isMobile, isTouch, gpuTier, prefersReducedMotion, isWindows, isLowEnd }` for components that need finer-grained info.',
        'Run `npm run typecheck` after changes; fix any errors.',
        'Return JSON: { filesChanged:[paths], typecheckOk:bool, summary }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['filesChanged'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// PHASE 3 — 3D scene optimization
// ===========================================================================
export const sceneOptimizeTask = defineTask('scene-optimize', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Optimize 3D scene (geometry / postprocessing / frame loop)',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'R3F / Three.js performance specialist',
      task: 'Reduce GPU + CPU cost of the 3D scene. Tighten frame loops; skip postprocessing on low tier; reduce geometry detail; ensure scene mounts only on capable devices.',
      context: { cwd: '/Users/pradiptajana/Portfolio', audit: args.audit },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Read components/three/_Scene.tsx and components/three/Scene.tsx. The Canvas is already gated by frameloop visibility — keep that.',
        'For low tier (perfLow=true): drop dpr to [1, 1.0], antialias=false, disable any postprocessing (Bloom, ChromaticAberration), set powerPreference="default" (not "high-performance" — Windows integrated GPUs misroute on that).',
        'In each three component (Core, Modules, ConnectionLines, TimelineRing, GroundReflector, HeroWarrior, DevStation): when perfLow, drop geometry detail (e.g., IcosahedronGeometry detail 2 -> 0, sphere segments 32 -> 12, torus radial 32 -> 16), disable shadow casting, drop emissive maps, swap MeshStandardMaterial for MeshBasicMaterial where the bloom-glow look is not critical.',
        'Verify ALL useFrame callbacks early-return when not visible, when reduced-motion, or when perfLow on non-essential frames (e.g., breath animations). Use `state.invalidate()`-style on-demand rendering for purely scrub-driven scenes if practical, else accept always-on for the high tier.',
        'Drop drei <Environment preset="city" /> on low tier (HDR cube map is heavy).',
        'Set up scene-level `frustumCulled` correctly; prune any objects that are off-screen but still receive frame updates.',
        'Confirm `next/dynamic({ ssr:false })` is still in use for the Scene chunk — and add `loading: () => null` fallback to avoid Layout shift.',
        'Update SceneContainer to also check `useDeviceCapabilities` (from phase 2) — if isMobile OR low tier OR low GPU, render <SvgCoreFallback/>. The SVG fallback path is the answer chosen by the user (Aggressive).',
        'Make sure the SceneContainer mount path is identical for SSR and first-client render to avoid hydration mismatches (use the existing `mounted` flag).',
        'Run `npm run typecheck` after changes.',
        'Return JSON { filesChanged:[paths], typecheckOk:bool, optimizations:[strings], summary }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['filesChanged'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// PHASE 4 — animation / GSAP optimization
// ===========================================================================
export const animationOptimizeTask = defineTask('animation-optimize', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Optimize GSAP / animation cost on low-tier devices',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'GSAP + scroll-driven animation expert',
      task: 'Reduce CPU cost of GSAP timelines on low-tier devices. Defer or simplify non-essential animations. Make sure all ScrollTriggers cleanup correctly.',
      context: { cwd: '/Users/pradiptajana/Portfolio', audit: args.audit },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Read lib/gsap.ts. Verify only the plugins actually used by the codebase are registered. Remove any import that is unused. Plugins must be lazy / registered once / SSR-safe.',
        'For each section component (HeroSection, AboutSection, SkillsSection, ProjectsSection, ExperienceSection, ContactSection): wrap all GSAP work in `gsap.context()`; clean up on unmount; if `prefersReducedMotion` OR low tier, replace ScrollTrigger scrub timelines with simple `from`/`to` reveals (or skip entirely).',
        'Drop `scrub: true` on low tier (scrub is the most expensive scroll behavior). Replace with `toggleActions: "play none none reverse"`.',
        'Make sure any `ScrollTrigger.refresh()` calls happen only after fonts + images load (use `document.fonts.ready` if available).',
        'Disable Lenis / SmoothScrollProvider when reduced-motion is set, OR when on touch (Lenis on iOS/Android causes jank with native momentum scroll). Keep the existing fallback path.',
        'For the SectionOrchestrator and SmoothScrollProvider: ensure no requestAnimationFrame loops keep running after unmount; add cleanup.',
        'Reduce expensive backdrop-filter usage in components/ui/GlassPanel.tsx on low tier — use a solid semi-opaque background fallback when perfLow.',
        'Run `npm run typecheck`.',
        'Return JSON { filesChanged:[paths], typecheckOk:bool, optimizations:[strings] }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['filesChanged'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// PHASE 5 — responsive layout fixes
// ===========================================================================
export const responsiveFixesTask = defineTask('responsive-fixes', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Audit + fix responsive layout across all viewports',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior frontend engineer specializing in responsive layouts',
      task: 'Make every section responsive at 375 / 414 / 768 / 1024 / 1280 / 1920. No horizontal overflow, no clipped text, no overlapping HUD, no fixed-px widths breaking on small screens.',
      context: { cwd: '/Users/pradiptajana/Portfolio', audit: args.audit, viewports: args.viewports },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Read components/ui/HudFrame.tsx, components/ui/SectionHUD.tsx, components/ui/SectionNav.tsx. Ensure they DO NOT overlap content at <= 768px (reposition or hide on mobile). The SectionNav should collapse to a bottom bar or hide on mobile.',
        'Read every section component. Replace fixed pixel widths/heights with fluid clamp() or Tailwind responsive utilities (sm:, md:, lg:, xl:).',
        'Use clamp(min, vw, max) for hero typography so it scales smoothly between viewports.',
        'Ensure no element exceeds 100vw — apply `overflow-x: hidden` on body in app/globals.css and remove any negative margins that cause horizontal scroll.',
        'For ProjectVisuals.tsx (currently modified): ensure the visual containers maintain aspect ratio across viewports and do not overflow on mobile. Make all interactive zones at least 44x44 CSS px on touch.',
        'For ContactSection: ensure form / link list stacks vertically on mobile and uses adequate touch targets.',
        'For the SVG core fallback (components/SvgCoreFallback.tsx): ensure the svg viewBox is correctly preserved-aspect-ratio and centers on all viewports.',
        'For tablet 768-1024: many designs collapse the side nav and stack the hero/about content. Implement that.',
        'Audit Atmosphere.tsx and IrisTransition.tsx for any fixed dimensions; make them viewport-relative.',
        'Add `min-h-[100svh]` (small viewport units) instead of `min-h-screen` so iOS Safari address-bar collapse does not break the hero.',
        'Run `npm run typecheck` + `npm run build`.',
        'Return JSON { filesChanged:[paths], typecheckOk:bool, responsiveFixes:[strings] }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['filesChanged'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// PHASE 6 — cross-browser fixes
// ===========================================================================
export const crossBrowserFixesTask = defineTask('cross-browser-fixes', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Cross-browser correctness — chromium / firefox / webkit',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior frontend engineer fixing cross-browser compatibility',
      task: 'Audit and fix browser-specific issues. Vendor prefixes, feature detection, fallback paths.',
      context: { cwd: '/Users/pradiptajana/Portfolio', audit: args.audit },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Audit all CSS for missing vendor prefixes (especially `-webkit-backdrop-filter` for Safari).',
        'Replace any modern-only feature without fallback: e.g. `:has()` selectors should be wrapped with @supports, `aspect-ratio` should have fallbacks, `100dvh`/`100svh` should fall back to `100vh`.',
        'Check Firefox: `backdrop-filter: blur(...)` is often disabled; provide a solid-fill fallback. Use @supports.',
        'Check Safari: `mix-blend-mode` glitches with WebGL canvas — confirm none of the fixed overlays use it on top of the Canvas. Use Atmosphere with opacity instead.',
        'Check that `next/font` is configured with `display: "swap"` for FOUT-friendly rendering (verified — keep as-is).',
        'Wrap all `window.matchMedia`, `navigator.connection`, `navigator.deviceMemory`, `navigator.hardwareConcurrency` reads in feature checks (these are not in Firefox/Safari).',
        'Add a small <noscript> banner stating the site requires JS to render the 3D experience.',
        'Run `npm run typecheck`.',
        'Return JSON { filesChanged:[paths], typecheckOk:bool, crossBrowserFixes:[strings] }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['filesChanged'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// build gate
// ===========================================================================
export const buildGateTask = defineTask('build-gate', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Run build + typecheck',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'CI engineer verifying build',
      task: 'Run typecheck and production build. Capture errors.',
      context: { cwd: '/Users/pradiptajana/Portfolio', iteration: args.iteration },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Run `npm run typecheck 2>&1 | tail -200` and capture stdout/stderr.',
        'Run `npm run build 2>&1 | tail -200` and capture stdout/stderr.',
        'Parse for errors. Return JSON { success:bool, typecheckOk:bool, buildOk:bool, errors:[{file,line,message}], stdoutTail, stderrTail }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['success'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// build repair
// ===========================================================================
export const buildRepairTask = defineTask('build-repair', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Repair build / typecheck errors',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior engineer repairing TypeScript / Next.js build errors',
      task: 'Fix each build error in place. Smallest viable patch. Do NOT remove functionality.',
      context: { cwd: '/Users/pradiptajana/Portfolio', errors: args.errors, iteration: args.iteration },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'For each error, read the referenced file and patch the smallest correct fix.',
        'Common fixes: add "use client", add type annotations, fix imports, guard window/document access.',
        'After patching, run `npm run typecheck` + `npm run build` to verify.',
        'Return JSON { filesPatched:[paths], fixed:bool, remainingErrors:[] }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object' }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// Lighthouse desktop
// ===========================================================================
export const lighthouseDesktopTask = defineTask('lighthouse-desktop', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Run Lighthouse desktop audit',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Performance auditor',
      task: 'Run Lighthouse against production build using DESKTOP form factor.',
      context: { cwd: '/Users/pradiptajana/Portfolio', iteration: args.iteration },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Ensure build is fresh: `npm run build 2>&1 | tail -10`.',
        'Start `npm run start -- -p 3100` in the background; wait up to 30s for port 3100 to respond. Confirm with `curl -sf http://localhost:3100 -o /dev/null && echo OK || echo FAIL`.',
        'Run `npx lighthouse http://localhost:3100 --preset=desktop --only-categories=performance,accessibility,best-practices --chrome-flags="--headless --no-sandbox" --output=json --output-path=artifacts/lh-desktop-${args.iteration}.json --quiet --max-wait-for-load=60000` (install lighthouse first if missing).',
        'Kill the dev/start server (find PID by port 3100 and kill it).',
        'Parse JSON. Return { performance, accessibility, bestPractices, lcp, cls, tbt, fcp, tti, totalBlockingTime, recommendations:[strings] }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['performance'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// Lighthouse mobile
// ===========================================================================
export const lighthouseMobileTask = defineTask('lighthouse-mobile', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Run Lighthouse mobile audit',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Performance auditor',
      task: 'Run Lighthouse against production build using MOBILE form factor.',
      context: { cwd: '/Users/pradiptajana/Portfolio', iteration: args.iteration },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Start `npm run start -- -p 3101` in the background; wait up to 30s for port 3101 to respond.',
        'Run `npx lighthouse http://localhost:3101 --only-categories=performance,accessibility,best-practices --chrome-flags="--headless --no-sandbox" --output=json --output-path=artifacts/lh-mobile-${args.iteration}.json --quiet --max-wait-for-load=60000` (default = mobile).',
        'Kill the start server.',
        'Return JSON same shape as desktop task.'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['performance'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// E2E across viewports
// ===========================================================================
export const e2eMultiViewportTask = defineTask('e2e-multi-viewport', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Playwright E2E across viewports + browsers',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'E2E test engineer',
      task: 'Run Playwright tests at every viewport size in chromium / firefox / webkit. Verify hero, sections, no console errors, no horizontal overflow.',
      context: { cwd: '/Users/pradiptajana/Portfolio', viewports: args.viewports, iteration: args.iteration },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Edit playwright.config.ts: add projects for chromium / firefox / webkit. Skip webkit on linux if missing deps. Set webServer to `npm run start -- -p 3200` with reuseExistingServer:true and timeout 120000. Pre-build with `npm run build`.',
        'Create or update tests/e2e/responsive.spec.ts with the viewport list from input. For each viewport, for each project: visit /, assert no horizontal overflow (document.documentElement.scrollWidth <= clientWidth), assert hero text "PRADIPTA JANA" or HUD heading visible, scroll through 6 sections, assert each section anchor is reachable, assert NO uncaught console errors and NO pageerrors.',
        'Run `npm run build` then `npx playwright test tests/e2e/responsive.spec.ts --reporter=json > artifacts/e2e-${args.iteration}.json || true`.',
        'Parse JSON for total/passed/failed/failures. Capture console errors per project/viewport.',
        'Return JSON { passed, failed, total, projects:[{name,passed,failed}], failures:[{title,project,viewport,error}], consoleErrors:[strings] }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['passed', 'failed'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// Visual regression
// ===========================================================================
export const visualRegressionTask = defineTask('visual-regression', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Visual regression — screenshots per viewport',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Visual QA engineer',
      task: 'Take full-page screenshots at every viewport for every section, then assess visual quality.',
      context: { cwd: '/Users/pradiptajana/Portfolio', viewports: args.viewports, iteration: args.iteration },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Write tests/visual/perf-responsive.spec.ts: for each viewport, visit /, scroll to each of 6 section ids, wait 600ms, take a full-page screenshot to artifacts/screenshots/iter${args.iteration}/${viewport}-${id}.png.',
        'Run `npx playwright test tests/visual/perf-responsive.spec.ts --reporter=list || true`.',
        'Read screenshots: report any with horizontal overflow, clipped HUD, missing canvas/svg, or obvious mis-layout. Score each viewport 0-100.',
        'Return JSON { perViewport: { "375x812": {score, issues:[]}, ... }, overallScore, totalIssues:N, screenshots:[paths] }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['overallScore'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// quality score / convergence decision
// ===========================================================================
export const qualityScoreTask = defineTask('quality-score', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Compute convergence score + recommendations',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'QA lead synthesizing perf + responsive scores',
      task: 'Decide if we have converged. If not, produce a prioritized recommendation list for the next iteration.',
      context: {
        lhDesktop: args.lhDesktop,
        lhMobile: args.lhMobile,
        e2e: args.e2e,
        visual: args.visual,
        targetDesktopPerf: args.targetDesktopPerf,
        targetMobilePerf: args.targetMobilePerf
      },
      instructions: [
        'Convergence rule: lhDesktop.performance >= targetDesktopPerf AND lhMobile.performance >= targetMobilePerf AND e2e.failed === 0 AND visual.overallScore >= 80.',
        'If E2E failed > 0, list the specific viewport+browser combos that failed and a concrete fix per failure.',
        'If lhDesktop or lhMobile under target, list the top 5 LH opportunities (e.g., "reduce unused JS", "minimize main-thread work") with file paths if known.',
        'If visual issues exist, list them with viewport + section + suggested fix.',
        'Return JSON { converged:bool, breakdown:{desktopPerf, mobilePerf, e2eRate, visual}, blockedBy:string[], recommendations:[{priority, category, file?, action}], summary:"..." }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['converged'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// refine
// ===========================================================================
export const refineTask = defineTask('refine', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Apply recommendations to converge',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Senior frontend engineer applying iterative refinements',
      task: 'Apply each recommendation. Smallest viable patch per issue. Verify build after.',
      context: {
        cwd: '/Users/pradiptajana/Portfolio',
        recommendations: args.recommendations,
        lhDesktop: args.lhDesktop,
        lhMobile: args.lhMobile,
        e2e: args.e2e,
        visual: args.visual,
        iteration: args.iteration
      },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'For each recommendation, identify the concrete file(s) to patch.',
        'Common patches: code-split heavy imports with next/dynamic + ssr:false, defer non-critical JS with requestIdleCallback, swap large images for next/image with sizes/srcset, drop unused npm deps, add `<link rel="preconnect">` for fonts, tune Bloom intensity, adjust DPR cap, reduce Three geometry detail, replace expensive backdrop-filter with semi-opaque bg, hide HUD on small viewports.',
        'After patching, run `npm run typecheck` + `npm run build`.',
        'Return JSON { patchesApplied:[{file,reason}], buildOk:bool }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object' }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ===========================================================================
// final report
// ===========================================================================
export const finalReportTask = defineTask('final-report', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write final perf + responsive report',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'Technical writer',
      task: 'Produce artifacts/perf-responsive-report.md and artifacts/perf-responsive-history.json.',
      context: {
        cwd: '/Users/pradiptajana/Portfolio',
        history: args.history,
        converged: args.converged,
        lastScore: args.lastScore,
        targetDesktopPerf: args.targetDesktopPerf,
        targetMobilePerf: args.targetMobilePerf,
        iterations: args.iterations
      },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Write artifacts/perf-responsive-report.md with: status (converged or not), final Lighthouse desktop+mobile scores, E2E pass rate per browser+viewport, list of optimizations applied per phase, remaining caveats, recommended manual checks (real device test list — iPhone SE, iPad, Pixel low-end, mid-range Windows laptop).',
        'Write artifacts/perf-responsive-history.json from history array.',
        'Return JSON { reportPath, historyPath, verdict, summary }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object' }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));
