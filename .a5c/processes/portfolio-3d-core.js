/**
 * @process portfolio-3d-core
 * @description Build a modern Next.js 14 developer portfolio — "Developer Control Core" —
 * with R3F 3D core, orbiting modules, full GSAP plugin suite, ScrollSmoother, section-bound
 * scroll timelines, mobile fallback, and iterative quality convergence (Playwright E2E +
 * Lighthouse + visual + build gates).
 *
 * @inputs {
 *   projectName: string,
 *   targetQuality: number,       // 0-100 — overall convergence target
 *   maxIterations: number,       // max polish iterations
 *   lighthousePerfMin: number    // min Lighthouse Perf score
 * }
 */

import { defineTask } from '@a5c-ai/babysitter-sdk';

// ----------------------------------------------------------------------------
// MAIN PROCESS
// ----------------------------------------------------------------------------
export async function process(inputs, ctx) {
  const {
    projectName = 'portfolio',
    targetQuality = 85,
    maxIterations = 4,
    lighthousePerfMin = 75
  } = inputs;

  ctx.log('info', `🚀 Building "Developer Control Core" portfolio: ${projectName}`);

  // ==========================================================================
  // PHASE 1: ARCHITECTURE & SPEC
  // ==========================================================================
  ctx.log('info', 'Phase 1: Research + architecture + spec');

  const spec = await ctx.task(architectSpecTask, {
    projectName
  });

  await ctx.breakpoint({
    tag: 'spec-approval',
    question: 'Review the architecture spec. Approve to start scaffolding?',
    title: 'Architecture Spec Review',
    context: {
      runId: ctx.runId,
      files: [
        { path: 'artifacts/spec.md', format: 'markdown', label: 'Architecture Spec' }
      ]
    }
  });

  // ==========================================================================
  // PHASE 2: SCAFFOLD (Next.js 14 + TS + Tailwind + R3F + GSAP)
  // ==========================================================================
  ctx.log('info', 'Phase 2: Scaffolding project');

  const scaffold = await ctx.task(scaffoldTask, {
    projectName,
    spec
  });

  // ==========================================================================
  // PHASE 3: CORE INFRASTRUCTURE
  //   Tailwind theme, layout, fonts, global CSS, SmoothScroller provider,
  //   GSAP plugin registration, Canvas container, shared hooks.
  // ==========================================================================
  ctx.log('info', 'Phase 3: Core infrastructure + smooth scroll + GSAP registration');

  const infra = await ctx.task(infraTask, {
    projectName,
    spec,
    scaffold
  });

  // ==========================================================================
  // PHASE 4: 3D SCENE (Core + Modules + Lights + CameraController)
  // ==========================================================================
  ctx.log('info', 'Phase 4: Building 3D Core scene');

  const scene3d = await ctx.task(scene3dTask, {
    projectName,
    spec
  });

  // ==========================================================================
  // PHASE 5: SECTIONS (Hero, About, Skills, Projects, Experience, Contact)
  //   Each section has GSAP ScrollTrigger timeline bound to 3D state,
  //   SVG draw animations, text splits, and all requested GSAP plugins.
  // ==========================================================================
  ctx.log('info', 'Phase 5: Implementing all sections');

  const sections = await ctx.task(sectionsTask, {
    projectName,
    spec
  });

  // ==========================================================================
  // PHASE 6: CONTENT + MOBILE FALLBACK + DEPLOY CONFIG
  // ==========================================================================
  ctx.log('info', 'Phase 6: Content data, mobile fallback, Vercel config');

  const polish = await ctx.task(contentMobileDeployTask, {
    projectName,
    spec
  });

  // ==========================================================================
  // PHASE 7: INITIAL BUILD + TYPECHECK GATE
  // ==========================================================================
  ctx.log('info', 'Phase 7: Build + typecheck gate');

  let buildResult = await ctx.task(buildGateTask, {
    projectName,
    iteration: 0
  });

  let buildIter = 0;
  while (!buildResult.success && buildIter < 3) {
    buildIter++;
    ctx.log('warn', `Build failed (try ${buildIter}); repairing`);
    await ctx.task(buildRepairTask, {
      projectName,
      errors: buildResult.errors,
      iteration: buildIter
    });
    buildResult = await ctx.task(buildGateTask, { projectName, iteration: buildIter });
  }

  if (!buildResult.success) {
    throw new Error('Build did not converge after repair attempts');
  }

  // ==========================================================================
  // PHASE 8: QUALITY CONVERGENCE LOOP
  //   Parallel: Lighthouse + Playwright E2E + Visual + Agent polish review.
  //   If combined score < target, refine and re-run.
  // ==========================================================================
  ctx.log('info', 'Phase 8: Quality convergence loop');

  let iteration = 0;
  let converged = false;
  let currentScore = 0;
  const history = [];

  while (iteration < maxIterations && !converged) {
    iteration++;

    const [lighthouse, e2e, visual] = await ctx.parallel.all([
      () => ctx.task(lighthouseTask, { projectName, iteration }),
      () => ctx.task(e2eTask, { projectName, iteration }),
      () => ctx.task(visualReviewTask, { projectName, iteration })
    ]);

    const score = await ctx.task(qualityScoreTask, {
      projectName,
      iteration,
      lighthouse,
      e2e,
      visual,
      spec,
      lighthousePerfMin,
      targetQuality
    });

    currentScore = score.overallScore;
    history.push({ iteration, score: currentScore, lighthouse, e2e, visual, recommendations: score.recommendations });

    if (currentScore >= targetQuality) {
      converged = true;
      break;
    }

    if (iteration < maxIterations) {
      await ctx.task(refineTask, {
        projectName,
        iteration,
        recommendations: score.recommendations,
        lighthouse,
        e2e,
        visual
      });

      // re-gate build after refinement
      const rebuild = await ctx.task(buildGateTask, { projectName, iteration });
      if (!rebuild.success) {
        await ctx.task(buildRepairTask, {
          projectName,
          errors: rebuild.errors,
          iteration
        });
      }
    }
  }

  // ==========================================================================
  // PHASE 9: FINAL REVIEW + HANDOFF
  // ==========================================================================
  ctx.log('info', 'Phase 9: Final review');

  const finalReport = await ctx.task(finalReportTask, {
    projectName,
    converged,
    currentScore,
    targetQuality,
    iterations: iteration,
    history,
    spec
  });

  await ctx.breakpoint({
    tag: 'final-approval',
    question: `Portfolio build ${converged ? 'CONVERGED' : 'partial'} at ${currentScore}/${targetQuality}. Approve to close the run?`,
    title: 'Final Portfolio Review',
    context: {
      runId: ctx.runId,
      files: [
        { path: 'artifacts/final-report.md', format: 'markdown', label: 'Final Report' },
        { path: 'artifacts/quality-history.json', format: 'code', language: 'json', label: 'Quality History' }
      ]
    }
  });

  return {
    success: converged,
    projectName,
    iterations: iteration,
    finalQuality: currentScore,
    targetQuality,
    converged,
    history,
    artifacts: {
      spec: 'artifacts/spec.md',
      finalReport: 'artifacts/final-report.md',
      qualityHistory: 'artifacts/quality-history.json'
    },
    metadata: {
      processId: 'portfolio-3d-core',
      timestamp: ctx.now()
    }
  };
}

// ============================================================================
// TASK: architect the spec — frontend-architect agent
// ============================================================================
export const architectSpecTask = defineTask('architect-spec', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Architect portfolio spec',
  agent: {
    name: 'frontend-architect',
    prompt: {
      role: 'senior frontend architect specializing in award-winning 3D/animated web experiences (R3F + GSAP)',
      task: 'Research modern Awwwards-style 3D developer portfolios and produce a COMPLETE architecture spec for the "Developer Control Core" portfolio.',
      context: {
        projectName: args.projectName,
        concept: 'A central 3D "Developer Control Core" — glowing core engine with 5 orbiting modules (Frontend, Backend, DevOps, Cloud, Mobile). As the user scrolls through 6 sections (Hero/Boot, About/Init, Skills/Activation, Projects/Execution, Experience/Timeline, Contact/Signal), the 3D scene evolves: camera moves, modules light up, lines connect, core pulses/collapses/expands.',
        stack: {
          framework: 'Next.js 14 App Router + TypeScript',
          styling: 'Tailwind CSS + CSS Modules',
          '3D': 'React Three Fiber + drei + three.js',
          animation: 'GSAP 3 + ALL plugins (ScrollTrigger, ScrollSmoother, SplitText, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin, Flip, Observer, InertiaPlugin, ScrambleText, Physics2D, PhysicsProps, CustomEase, CustomBounce, CustomWiggle, GSDevTools, EaselPlugin, Pixi, Text)',
          smoothscroll: 'GSAP ScrollSmoother (primary)',
          testing: 'Playwright E2E, Lighthouse CI, Vitest',
          deploy: 'Vercel'
        },
        style: {
          palette: { bg: '#0b0f19', blue: '#4f9cff', purple: '#9b5cff', cyan: '#00d4ff', orange: '#ff8a3c', green: '#39ffa5' },
          aesthetic: 'Dark UI, neon accents, glass panels (backdrop-blur), subtle noise grain, emissive glow on 3D',
          typography: 'Geist + JetBrains Mono; heavy tracking on display; gradient text'
        }
      },
      instructions: [
        'Write a spec.md in markdown at artifacts/spec.md.',
        'Spec sections: Stack, File/Folder Structure (concrete), Dependency list (exact package names), Color tokens, Typography, 3D Scene graph (component tree with prop contracts), ScrollTrigger timeline map (section -> 3D state mutations), GSAP plugin registration strategy (note Club plugins need trial license — document this), Per-section spec (Hero, About, Skills, Projects, Experience, Contact) with text content and animation recipe, Mobile fallback strategy, Performance budget, Testing plan (Playwright scenarios, Lighthouse thresholds, visual checks).',
        'Include placeholder persona: "Alex Chen, Full-Stack Developer" with 5 demo projects and 4 experience entries.',
        'Explicitly cite that GSAP 3.12+ is now free via the GreenSock/GSAP registry (as of April 2026 — Club plugins moved to free registry). All plugins import from `gsap/*`.',
        'List EXACT concrete file paths that the scaffold phase will create.',
        'End with a single JSON block summarizing {stack, sections[], scenePaths[], testScenarios[]} for downstream tasks.'
      ],
      outputFormat: 'Write the spec to artifacts/spec.md and return JSON: { sections:[{id,name,title,sceneState}], stack:{...}, deps:[...], scenePaths:[...], testScenarios:[...] }'
    },
    outputSchema: {
      type: 'object',
      required: ['sections', 'stack', 'deps'],
      properties: {
        sections: { type: 'array' },
        stack: { type: 'object' },
        deps: { type: 'array' },
        scenePaths: { type: 'array' },
        testScenarios: { type: 'array' }
      }
    }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ============================================================================
// TASK: scaffold project — nextjs-developer
// ============================================================================
export const scaffoldTask = defineTask('scaffold', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Scaffold Next.js + R3F + GSAP project',
  agent: {
    name: 'nextjs-developer',
    prompt: {
      role: 'Next.js 14 expert scaffolding a modern portfolio',
      task: 'Scaffold the Next.js 14 App Router + TypeScript project AT THE CURRENT WORKING DIRECTORY (which is /Users/pradiptajana/Portfolio). Install all deps. Do NOT create a sub-folder — create package.json / next.config / etc. AT THE ROOT.',
      context: {
        projectName: args.projectName,
        spec: args.spec,
        cwd: '/Users/pradiptajana/Portfolio'
      },
      instructions: [
        'pwd should be /Users/pradiptajana/Portfolio. Do NOT run `npx create-next-app` (that creates a subfolder and overwrites). Instead, hand-write package.json, tsconfig.json, next.config.mjs, postcss.config.js, tailwind.config.ts, .eslintrc.json, .gitignore, app/layout.tsx, app/page.tsx, app/globals.css, app/loading.tsx, public/.gitkeep, next-env.d.ts',
        'package.json scripts: dev, build, start, lint, typecheck (tsc --noEmit), test:e2e (playwright test), lighthouse (lhci autorun || lighthouse ...)',
        'package.json deps — ensure these EXACT packages: next@14, react@18, react-dom@18, three, @react-three/fiber, @react-three/drei, @react-three/postprocessing, gsap (version 3.12 or newer — latest), @gsap/react, lenis (for fallback smooth scroll on reduced-motion users), clsx, tailwind-merge. devDeps: typescript, @types/react, @types/react-dom, @types/three, @types/node, tailwindcss, postcss, autoprefixer, eslint, eslint-config-next, @playwright/test, vitest, @vitejs/plugin-react, jsdom, @testing-library/react, @testing-library/jest-dom, @lhci/cli',
        'Run `npm install` after writing package.json. If install fails due to registry issues, document the exact error but still leave package.json in place.',
        'After install, run `npx playwright install --with-deps chromium` (chromium only, to save time) — if that fails, continue and log the error.',
        'Write Tailwind config with dark palette tokens (bg #0b0f19, blue #4f9cff, purple #9b5cff, cyan #00d4ff, orange #ff8a3c, green #39ffa5) plus a `glass` plugin layer helper and font families (sans: Geist, mono: JetBrains Mono).',
        'app/layout.tsx must load Geist + JetBrains Mono via next/font, set dark bg, include <SmoothScrollProvider> wrapper slot (component built in next phase — for now just a placeholder div).',
        'app/page.tsx should render a single <main> with 6 section placeholders (ids: hero, about, skills, projects, experience, contact) with viewport-height sections so layout is testable immediately.',
        'Write a README.md (root) documenting dev/build/test commands.',
        'Return JSON: { filesCreated:[paths], installOk:bool, playwrightOk:bool, warnings:[] }'
      ],
      outputFormat: 'JSON { filesCreated, installOk, playwrightOk, warnings }'
    },
    outputSchema: { type: 'object', required: ['filesCreated'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ============================================================================
// TASK: infra — smooth scroll + GSAP registration + layout + global CSS
// ============================================================================
export const infraTask = defineTask('infra', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Build core infra: SmoothScroll provider, GSAP registration, shared hooks',
  agent: {
    name: 'react-developer',
    prompt: {
      role: 'Senior React engineer building animation infrastructure',
      task: 'Build the core animation/scroll infrastructure: GSAP plugin registration, SmoothScroll provider, theme provider, shared hooks, and global CSS tokens.',
      context: { projectName: args.projectName, spec: args.spec, cwd: '/Users/pradiptajana/Portfolio' },
      instructions: [
        'Create `lib/gsap.ts`: registers ALL GSAP plugins that are available in the installed `gsap` package: ScrollTrigger, ScrollSmoother (may be behind /ScrollSmoother path — try dynamic import with try/catch), SplitText, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin, Flip, Observer, InertiaPlugin, ScrambleTextPlugin, Physics2DPlugin, PhysicsPropsPlugin, CustomEase, CustomBounce, CustomWiggle, EaselPlugin, PixiPlugin, TextPlugin. Use a client-side guard `if (typeof window !== \'undefined\')`. Export `gsap` and helper `registerAll()` that runs once (idempotent). For plugins that may not exist in free registry, wrap each import in a try/catch and log but do NOT throw — the site must still render if a plugin is missing.',
        'Create `components/providers/SmoothScrollProvider.tsx` (client component): registers GSAP, initializes ScrollSmoother wrapping #smooth-wrapper > #smooth-content (fallback to Lenis + ScrollTrigger.scrollerProxy if ScrollSmoother not available). Respect prefers-reduced-motion: skip smoother, use native scroll. Cleanup on unmount.',
        'Update `app/layout.tsx`: wrap children in SmoothScrollProvider; children render inside <div id="smooth-wrapper"><div id="smooth-content">{children}</div></div>.',
        'Create `components/three/SceneContainer.tsx` (client): fixed-position full-viewport R3F <Canvas> with transparent background, camera setup, low power preference. Placeholder <Core /> + <Modules /> + <Lights /> import slots. Use dpr={[1, 2]} + performance.min=0.5.',
        'Create `lib/useSectionProgress.ts` hook: returns ScrollTrigger progress for a given section id.',
        'Create `lib/sections.ts`: single-source-of-truth array of 6 sections [{id, title, color, moduleId}] used by both scene and nav.',
        'Create `components/ui/GlassPanel.tsx`: glass-blur panel wrapper component.',
        'Create `components/ui/NeonText.tsx`: gradient neon text component.',
        'Create `components/ui/SectionNav.tsx`: right-side dot nav with active section indicator (uses useSectionProgress).',
        'Update `app/globals.css`: dark bg, custom properties for palette, noise-grain layer, scrollbar styling, @keyframes for pulse/glow, utilities for .text-neon-blue, .text-neon-purple, .text-neon-cyan, .glass, .grid-bg (SVG grid pattern).',
        'Update `app/page.tsx`: render <SceneContainer /> fixed behind content; render 6 <Section id=...> placeholders each min-h-screen so scroll length is present.',
        'Run `npm run typecheck` — fix any errors. Return JSON { filesCreated:[], typecheckOk:bool, errors:[] }.'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['filesCreated'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ============================================================================
// TASK: 3D Scene — animation-developer
// ============================================================================
export const scene3dTask = defineTask('scene3d', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Build the Developer Core 3D scene',
  agent: {
    name: 'animation-developer',
    prompt: {
      role: 'R3F/Three.js animation specialist',
      task: 'Build the 3D Core + orbiting Modules + Lights + CameraController, all driven by shared section state from GSAP ScrollTrigger.',
      context: { spec: args.spec, cwd: '/Users/pradiptajana/Portfolio' },
      instructions: [
        'Create `components/three/Core.tsx` — central glowing core: IcosahedronGeometry (radius 1, detail 2) with emissive MeshStandardMaterial (blue #4f9cff emissive), subtle breath animation via useFrame (scale 1 + sin(t*1.2)*0.02). Exposes imperative ref for GSAP to tween scale/emissiveIntensity/rotation.',
        'Create `components/three/Modules.tsx` — 5 orbiting modules: Frontend (blue #4f9cff), Backend (orange #ff8a3c), DevOps (green #39ffa5), Cloud (purple #9b5cff), Mobile (cyan #00d4ff). Each is an octahedron or rounded-box at a distinct orbital angle (0, 72, 144, 216, 288 degrees) at radius 3 on XZ plane with slight Y offset. Each slow-rotates on its own axis. Exposes per-module refs so GSAP can tween position/emissive/scale. Pulsing glow loop on active module.',
        'Create `components/three/ConnectionLines.tsx` — thin lines from core to each module (rendered with three/examples/jsm/lines Line2 or drei <Line>) — opacity 0 by default, fade in during Projects section.',
        'Create `components/three/TimelineRing.tsx` — thin circular torus ring around the core with 4 glowing nodes (one per experience entry). Hidden by default; fades in during Experience section.',
        'Create `components/three/Lights.tsx` — 3-point lighting: ambientLight (intensity 0.2), directional key light, 3 rimLights colored neon. Add drei <Environment preset="city" /> at low intensity for reflections.',
        'Create `components/three/CameraController.tsx` — PerspectiveCamera (fov 45, z=8). Exposes GSAP-controllable ref for position + lookAt tweens.',
        'Create `components/three/Scene.tsx` — composes Core, Modules, ConnectionLines, TimelineRing, Lights, CameraController. Uses postprocessing Bloom from @react-three/postprocessing for glow.',
        'Create `lib/sceneStore.ts` — zustand-free shared refs: a plain singleton object exposing refs to each scene part so section components can attach GSAP timelines.',
        'Wire `components/three/SceneContainer.tsx` to render <Scene /> inside <Canvas>.',
        'Add mouse parallax to camera: on mousemove, tween camera position.x/y by ±0.3 (lerp in useFrame, NOT GSAP — smoother).',
        'Run `npm run typecheck`. Return JSON { filesCreated, typecheckOk, warnings }'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['filesCreated'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ============================================================================
// TASK: Sections — animation-developer (text, SVG, scroll timelines)
// ============================================================================
export const sectionsTask = defineTask('sections', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Build all 6 sections with GSAP scroll timelines',
  agent: {
    name: 'animation-developer',
    prompt: {
      role: 'GSAP animation expert wiring ScrollTrigger timelines to 3D scene state',
      task: 'Implement the 6 sections: Hero, About, Skills, Projects, Experience, Contact. Each one has a GSAP ScrollTrigger timeline that tweens BOTH in-page DOM (text, SVG, cards) AND the shared 3D scene refs from lib/sceneStore.',
      context: { spec: args.spec, cwd: '/Users/pradiptajana/Portfolio' },
      instructions: [
        'Create `components/sections/HeroSection.tsx` — full-viewport. Big animated headline "SYSTEM // BOOT" with SplitText per-char reveal on mount; subheadline "The Developer Control Core"; animated SVG grid background with DrawSVG stroking. CustomEase for entrance. On scroll-out: core in scene assembles (tween sceneStore.core.scale from 0 -> 1, emissiveIntensity 0 -> 1).',
        'Create `components/sections/AboutSection.tsx` — scrub timeline camera zoom into core (camera.position.z 8 -> 5), MorphSVG icon morph between 3 shapes, ScrambleText effect on role labels, GlassPanel with bio: "I build scalable, production-ready systems that span the full stack."',
        'Create `components/sections/SkillsSection.tsx` — 5 sub-pinned sub-scrolls (one per module). Each sub-scroll activates its module: tweens its emissive up, scales it forward by ~1.4, fades other modules to emissiveIntensity 0.2. List skill chips per category with Flip layout animation.',
        'Create `components/sections/ProjectsSection.tsx` — 5 demo project cards in 3D-feel layout (perspective CSS + rotate-y on scroll via ScrollTrigger). Sync with scene: connection lines fade in (tween ConnectionLines opacity 0 -> 0.8), core scale tween to 1.3. Cards: "NeuroStream Analytics", "EdgeCast CDN", "Pulse DevOps", "Aether Design System", "Orbital Mobile Banking".',
        'Create `components/sections/ExperienceSection.tsx` — camera orbit around core (tween camera.position x/z via sin/cos at scrub). TimelineRing fades in. 4 experience entries populate as glass panels distributed along the ring visually. Use MotionPath to animate a small icon along the ring path. 4 jobs: Sr. Fullstack @ Aurora Labs (2024-present), Fullstack @ PulseGrid (2022-2024), Frontend @ Moonlit (2020-2022), Intern @ Bitforge (2019-2020).',
        'Create `components/sections/ContactSection.tsx` — core collapses to small glowing orb (scale 1 -> 0.3, emissive intensity spikes), pulses outward (simulated with drei <Trail> or shader uniform). CTA "Let\'s build something powerful." Contact links: email, GitHub, LinkedIn, X (use placeholder hrefs).',
        'Each section must: register its own ScrollTrigger; cleanup on unmount; use gsap.context() for scope; export a default component.',
        'Replace `app/page.tsx` placeholders with these 6 section components, all rendered inside #smooth-content.',
        'Add a footer component.',
        'Run `npm run typecheck`. Fix errors. Return JSON { filesCreated, typecheckOk, warnings }.'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['filesCreated'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ============================================================================
// TASK: content + mobile fallback + deploy
// ============================================================================
export const contentMobileDeployTask = defineTask('content-mobile-deploy', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Content data, mobile fallback, Vercel deploy config',
  agent: {
    name: 'frontend-architect',
    prompt: {
      role: 'Frontend architect finalizing content + responsive + deploy',
      task: 'Populate placeholder data files, implement mobile-safe fallback for the 3D scene, and add Vercel deploy configuration.',
      context: { spec: args.spec, cwd: '/Users/pradiptajana/Portfolio' },
      instructions: [
        'Create `content/projects.ts`, `content/experience.ts`, `content/skills.ts`, `content/profile.ts` with typed placeholder data matching the section components.',
        'Create `lib/useIsMobile.ts` hook: returns true if viewport < 768 OR navigator.hardwareConcurrency < 4 OR prefers-reduced-motion.',
        'Update `components/three/SceneContainer.tsx`: if useIsMobile -> render a lightweight animated SVG fallback (`components/SvgCoreFallback.tsx`) instead of <Canvas>. The SVG fallback has a central circle with glow + 5 smaller orbiting circles animated via CSS @keyframes.',
        'Create `components/SvgCoreFallback.tsx` — pure SVG/CSS animation, no JS animation libs needed.',
        'Ensure all sections degrade gracefully: ScrollTrigger markers off, reduced animation if prefers-reduced-motion.',
        'Add `vercel.json` with clean framework config (framework: nextjs, regions: iad1).',
        'Add `public/robots.txt` and basic `app/sitemap.ts`.',
        'Add `app/opengraph-image.tsx` with a generated OG image.',
        'Update README.md with deploy-to-Vercel button.',
        'Run `npm run typecheck`. Return JSON.'
      ],
      outputFormat: 'JSON'
    },
    outputSchema: { type: 'object', required: ['filesCreated'] }
  },
  io: {
    inputJsonPath: `tasks/${taskCtx.effectId}/input.json`,
    outputJsonPath: `tasks/${taskCtx.effectId}/result.json`
  }
}));

// ============================================================================
// TASK: build + typecheck gate
// ============================================================================
export const buildGateTask = defineTask('build-gate', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Run build + typecheck',
  agent: {
    name: 'general-purpose',
    prompt: {
      role: 'CI engineer verifying build',
      task: 'Run typecheck and production build. Capture any errors.',
      context: { projectName: args.projectName, cwd: '/Users/pradiptajana/Portfolio', iteration: args.iteration },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Run `npm run typecheck` — capture output.',
        'Run `npm run build` — capture output.',
        'Parse errors and return a structured list.',
        'Return JSON { success:bool, typecheckOk:bool, buildOk:bool, errors:[{file,line,message}], stdout, stderr }'
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

// ============================================================================
// TASK: build repair
// ============================================================================
export const buildRepairTask = defineTask('build-repair', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Repair build errors',
  agent: {
    name: 'code-reviewer',
    prompt: {
      role: 'Senior engineer repairing TypeScript/Next.js build errors',
      task: 'Read each error and fix it in place. Do not remove functionality — fix types, imports, SSR/CSR boundaries, etc.',
      context: { errors: args.errors, iteration: args.iteration, cwd: '/Users/pradiptajana/Portfolio' },
      instructions: [
        'For each error, read the referenced file and patch the smallest correct fix.',
        'Common fixes: add "use client" directive, add type annotations, fix imports, guard window access with typeof window !== "undefined".',
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

// ============================================================================
// TASK: Lighthouse
// ============================================================================
export const lighthouseTask = defineTask('lighthouse', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Run Lighthouse audit',
  agent: {
    name: 'lighthouse',
    prompt: {
      role: 'Performance auditor',
      task: 'Run Lighthouse against the production build and capture scores.',
      context: { cwd: '/Users/pradiptajana/Portfolio', iteration: args.iteration },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Start `npm run build && npm run start` in background (port 3000).',
        'Wait up to 30s for port 3000 to respond.',
        'Run `npx lighthouse http://localhost:3000 --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless --no-sandbox" --output=json --output-path=artifacts/lighthouse-${args.iteration}.json --quiet` (if lighthouse missing, `npm i -D lighthouse` first).',
        'Kill the server process.',
        'Parse the JSON and return { performance, accessibility, bestPractices, seo, lcp, cls, tbt, fcp, recommendations:[] }.'
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

// ============================================================================
// TASK: Playwright E2E
// ============================================================================
export const e2eTask = defineTask('e2e', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Run Playwright E2E scroll tests',
  agent: {
    name: 'e2e-testing',
    prompt: {
      role: 'E2E test engineer',
      task: 'Write and run Playwright E2E tests that scroll through every section, verify canvas renders, verify headline appears, verify no console errors.',
      context: { cwd: '/Users/pradiptajana/Portfolio', iteration: args.iteration },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Create `playwright.config.ts` targeting http://localhost:3000 with webServer: { command: "npm run start", port: 3000, reuseExistingServer: true, timeout: 120000 } and a preBuild step `npm run build`.',
        'Create `tests/e2e/portfolio.spec.ts` with scenarios: (1) hero loads with headline "SYSTEM" visible, (2) canvas element or svg-fallback present, (3) scroll to each of 6 sections, each visible when anchor navigated, (4) no console errors/pageerrors, (5) viewport 375x812 renders fallback or canvas without throwing.',
        'Run `npm run build` then `npx playwright test --reporter=json > artifacts/e2e-${args.iteration}.json || true`.',
        'Parse and return { passed, failed, total, failures:[{title, error}], consoleErrors:[] }.'
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

// ============================================================================
// TASK: visual review — design-qa / code-reviewer hybrid
// ============================================================================
export const visualReviewTask = defineTask('visual-review', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Visual design review via Playwright screenshots',
  agent: {
    name: 'visual-regression',
    prompt: {
      role: 'Visual QA engineer checking polish vs. the design spec',
      task: 'Take full-page screenshots at each section scroll position, then assess visual quality vs. the spec.',
      context: { cwd: '/Users/pradiptajana/Portfolio', iteration: args.iteration, spec: 'artifacts/spec.md' },
      instructions: [
        'cd /Users/pradiptajana/Portfolio',
        'Write `tests/visual/screenshot.spec.ts` that visits / at 1440x900, scrolls to each of 6 section ids, waits 800ms, takes a screenshot -> artifacts/screenshots/section-${id}-iter${args.iteration}.png.',
        'Run `npx playwright test tests/visual/ --reporter=list` (start server first — reuse from config).',
        'Read the spec.md and each screenshot. Score visual quality 0-100 on: (a) palette adherence, (b) glass panel fidelity, (c) 3D/SVG presence, (d) typography polish, (e) section distinctness.',
        'Return JSON { visualScore, perSection:{hero,about,skills,projects,experience,contact}, issues:[strings], screenshots:[paths] }.'
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

// ============================================================================
// TASK: quality score — synthesize
// ============================================================================
export const qualityScoreTask = defineTask('quality-score', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Compute overall quality score',
  agent: {
    name: 'code-quality',
    prompt: {
      role: 'QA lead synthesizing scores',
      task: 'Combine Lighthouse + E2E + Visual into an overall 0-100 score, against targetQuality and lighthousePerfMin.',
      context: {
        lighthouse: args.lighthouse,
        e2e: args.e2e,
        visual: args.visual,
        targetQuality: args.targetQuality,
        lighthousePerfMin: args.lighthousePerfMin
      },
      instructions: [
        'Weights: Lighthouse Perf 30%, Lighthouse A11y 10%, E2E pass rate 25%, Visual score 25%, Spec coverage 10%.',
        'If Lighthouse Perf < lighthousePerfMin, cap overallScore at 79 and mark `blockedBy: "lighthouse-perf"`.',
        'If E2E failed > 0, cap at 79 and mark `blockedBy: "e2e-failures"`.',
        'List top 5 prioritized recommendations to improve the next iteration.',
        'Return JSON { overallScore, breakdown:{perf,a11y,e2e,visual,spec}, blockedBy, recommendations:[]}.'
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

// ============================================================================
// TASK: refine — polish pass driven by recommendations
// ============================================================================
export const refineTask = defineTask('refine', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Refine based on recommendations',
  agent: {
    name: 'frontend-architect',
    prompt: {
      role: 'Senior frontend engineer polishing the portfolio',
      task: 'Apply each recommendation. Prefer the smallest viable patch per issue.',
      context: { recommendations: args.recommendations, lighthouse: args.lighthouse, e2e: args.e2e, visual: args.visual, cwd: '/Users/pradiptajana/Portfolio', iteration: args.iteration },
      instructions: [
        'For each recommendation, identify the concrete files to patch.',
        'Common refinements: code-split 3D scene with next/dynamic + ssr:false, convert heavy imports to lazy, tune Bloom intensity, swap <img> for next/image, add loading states, tighten DPR, reduce draw calls, improve contrast, enlarge touch targets.',
        'After patching, verify with `npm run typecheck` + `npm run build`.',
        'Return JSON { patchesApplied:[{file,reason}], buildOk:bool }.'
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

// ============================================================================
// TASK: final report
// ============================================================================
export const finalReportTask = defineTask('final-report', (args, taskCtx) => ({
  kind: 'agent',
  title: 'Write final report',
  agent: {
    name: 'technical-writer',
    prompt: {
      role: 'Technical writer',
      task: 'Produce artifacts/final-report.md and artifacts/quality-history.json summarizing build, convergence, quality, known caveats, and next steps.',
      context: { history: args.history, converged: args.converged, currentScore: args.currentScore, targetQuality: args.targetQuality, iterations: args.iterations, cwd: '/Users/pradiptajana/Portfolio' },
      instructions: [
        'Write artifacts/final-report.md: status, final scores, list of implemented features vs. spec checklist, deployment steps, local dev steps, caveats (any GSAP Club plugins skipped, any failed tests), suggested next improvements.',
        'Write artifacts/quality-history.json from history array.',
        'Return JSON { reportPath, historyPath, verdict }.'
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
