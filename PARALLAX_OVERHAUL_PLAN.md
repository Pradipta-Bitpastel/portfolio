# Portfolio Overhaul — Firewatch Parallax + Scroll-Driven 3D + Horizontal Pin

**Goal:** Transform the portfolio into a cinematic, scroll-driven experience:
1. **Hero** = true Firewatch parallax using the **real PNG layers** (already downloaded to `public/images/parallax/parallax0..8.png`).
2. A **single persistent 3D model** that travels through the page — repositioning/reorienting on scroll, "landing" (sticking) at each section, then flying to the next.
3. **One section pinned with horizontal scroll** (Projects) — vertical scroll drives a horizontal slide track.
4. Every section gets **GSAP ScrollTrigger** reveal/scrub choreography.

Keep the engine that already works: native scroll + `ScrollTrigger`, the scroll-progress driver (`lib/useScrollProgress.ts` → `lib/sceneStore.ts`), and per-frame `THREE.MathUtils.damp` toward sampled poses. **Do NOT reintroduce GSAP `pin` on a section that re-renders its DOM per state (it caused removeChild crashes before) — except the Projects horizontal pin, which is a static track.**

---

## Asset facts (verified)
- 9 layers `parallax0.png`..`parallax8.png`, each **7000×2076**, in `public/images/parallax/`.
- **Depth order: `parallax0` = BACK** (sky + sun + clouds + far ridges, warm orange), ascending to **`parallax8` = FRONT** (near-black foreground trees, posts, rocks; transparent above the silhouette).
- Wide aspect (7000×2076 ≈ 3.37:1) → render `object-cover`, oversize ~110%, leaving headroom for vertical scroll-parallax + horizontal mouse-parallax without exposing edges.

## 3D model
- Source from three.js examples (MIT/CC0) or a free CC0 GLB. **Theme tie-in: Pradipta is a Cloud/DevOps engineer → a drone / satellite / floating probe reads perfectly as the "traveling" object.**
- Default plan: download a lightweight animated/hover-friendly GLB. Candidates (download to `public/models/`):
  - `https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/RobotExpressive/RobotExpressive.glb` (animated, ~2 MB)
  - existing `public/models/DamagedHelmet.glb` (already present, 3.6 MB) — strong fallback, no download.
- The traveling model is one `<Canvas>` (reuse `SceneContainer`/`_Scene`). It is gated off on low-tier/touch/reduced-motion → static SVG/poster fallback (existing `SceneContainer` gating).

---

## Section map (current order in `SectionOrchestrator.tsx`)
`Hero → Terminal → About → EmojiConverge → Metrics → StackMarquee → Skills → Projects → Showcase → Experience → KineticReveal → Contact`

Canonical SECTIONS (drive the 6 scene poses): `hero, about, skills, projects, experience, contact`.

---

## Workstreams

### WS1 — Hero: real Firewatch parallax  (`components/sections/HeroSection.tsx`)
- Replace the SVG mountains with 9 stacked `next/image` (or `<img>`) layers, `parallax0` (z-0, back) → `parallax8` (z-8, front), each `absolute inset-0`, `object-cover`, `scale-[1.1]` baked via wrapper (NOT transform — the rAF engine owns `transform`).
- Per-layer `data-speed` (vertical scroll factor) ramps **back≈0.0 → front≈0.55**; `data-depth` (horizontal mouse factor) ramps back≈2 → front≈26.
- Reuse the existing rAF engine: `translate3d(mouseX*depth, min(scrollY,vh)*speed, 0)`. No scroll-hijack.
- Keep the `PRADIPTA JANA` identity + role cycler overlaid (z-20), fading/rising slightly on scroll (`data-speed` ~0.1).
- Optional: float the 3D model (drone) near the sun in the hero (model canvas sits z-10, between far sky and foreground trees, so the foreground occludes its base — true depth compositing).
- Reduced-motion: static composition (first frame), no rAF.
- Preload `parallax0/1/8` (LCP) ; lazy the rest.

### WS2 — Traveling 3D model  (`components/three/*`, `lib/scenePoses.ts`)
- Reintroduce a model component (e.g. `TravelerModel.tsx`) loaded with drei `useGLTF`, lazy + `Suspense`.
- Add `pos:[x,y,z]` + `rot:[x,y,z]` + `scale` to each `ScenePose` (extend the interface). Model damps toward `samplePose(progress)` each frame (same pattern as camera).
- Trajectory: hero (hover, hero-right near sun) → about (dolly close, left) → skills (orbit right, spin) → projects (recede high) → experience (orbit left) → contact (centered, calm). It visibly **flies between sections and settles** at each.
- Subtle idle: bob + slow rotation layered on top of the damped pose.
- Pause its frameloop when Showcase is in view (existing `portfolio:bg-pause` event) so only one WebGL canvas renders at a time.

### WS3 — Projects: horizontal-scroll pin  (`components/sections/ProjectsSection.tsx`)
- Build a horizontal track of project "slides". Pin the section with `ScrollTrigger` (`pin:true`, `scrub:true`), translate the track `x: -(trackWidth - viewport)` across a scroll distance ≈ `trackWidth`.
- `gsap.matchMedia()`: enable the pin only on `(min-width: 768px)` + no reduced-motion; on mobile/reduced-motion fall back to normal vertical stacked cards (no pin).
- Per-slide entrance (scale/opacity) tied to horizontal progress; a progress rail at the bottom.

### WS4 — GSAP choreography on remaining sections
- **About** — line-by-line clip/`y` reveal (SplitText-style via spans), depth parallax on the dossier panels.
- **Skills** — staggered reveal + hover 3D tilt on capability rows.
- **Experience** — vertical timeline with an SVG line that **draws** on scroll (`drawSVG`-style via `strokeDashoffset` + `ScrollTrigger` scrub), entries fade/slide in.
- **KineticReveal / Contact** — keep/upgrade the clip-path word wipes; add a final CTA flourish.
- All effects wrapped in `gsap.context()` + `matchMedia`, cleaned up on unmount, and guarded for reduced-motion.

### WS5 — Polish & perf pass
- Verify 60fps (one WebGL canvas active at a time; transforms only; `will-change` on parallax layers).
- LCP: hero sky layer eager, rest lazy. Confirm bundle still reasonable (model lazy via `next/dynamic`).
- Cross-check reduced-motion + touch fallbacks on every new effect.
- Browser-verify each section with a Playwright screenshot before moving on.

---

## Build order (one section at a time, verify each in a real browser)
1. WS1 Hero real-image parallax → screenshot, confirm depth + mouse/scroll feel.
2. WS3 Projects horizontal pin → screenshot mid-scroll.
3. WS2 Traveling model (extend poses, mount, trajectory) → screenshot at 2–3 scroll positions.
4. WS4 About / Skills / Experience / Contact GSAP effects → screenshot each.
5. WS5 perf + reduced-motion + final full-page review.

## Guardrails (from prior rebuild — do not regress)
- Native scroll only; no Lenis. One ScrollTrigger writes `sceneStore.progress`; scene damps in its own loop.
- Never give a node BOTH React children AND imperative `textContent` (count-up crash).
- Only the Projects track may use GSAP `pin` (static DOM). No `pin` on per-state re-rendering sections.
- rAF parallax engine OWNS each layer's inline `transform` — bake scale/offset via wrapper/inset, never utility `transform` classes on `[data-speed]` nodes.
- Keep the low-tier/touch/reduced-motion fallbacks (`SceneContainer`, `SvgCoreFallback`).
- `gl_PointSize` for particles stays small.
