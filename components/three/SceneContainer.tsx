"use client";

import dynamic from "next/dynamic";
import {
  Component,
  type ComponentType,
  type ReactNode,
  useEffect,
  useState
} from "react";
import { useDeviceCapabilities } from "@/lib/usePerfTier";
import { SvgCoreFallback } from "@/components/SvgCoreFallback";

// Lazily-resolved reference to the dynamic Scene component. We do NOT
// call `dynamic(() => import("./_Scene"))` at module scope — that would
// hand the bundler a static `import()` reference on every route that
// imports SceneContainer (i.e. the root layout, every page), so the
// Scene chunk is preloaded even on mobile clients that never render it.
// Resolving it on first desktop render keeps the Scene chunk strictly
// lazy: mobile/low-tier sessions never fetch it.
let CachedScene: ComponentType | null = null;
function getScene(): ComponentType {
  if (CachedScene) return CachedScene;
  // Phase 5 hardening: wrap the dynamic import so a chunk-load failure
  // (offline, CDN hiccup, ad-blocker rule eating /_next/static/chunks/*,
  // strict-CSP browsers refusing eval) cannot crash the entire app —
  // the WebGLErrorBoundary below can then surface the SVG fallback.
  CachedScene = dynamic(
    () =>
      import("./_Scene")
        .then((m) => m.Scene)
        .catch((err) => {
          // eslint-disable-next-line no-console
          console.warn("[SceneContainer] dynamic import failed", err);
          return () => null;
        }),
    {
      ssr: false,
      loading: () => null
    }
  ) as ComponentType;
  return CachedScene;
}

/**
 * Boundary between the static marketing shell and the R3F Canvas.
 *
 * We do four things here to keep the main bundle small and the
 * above-the-fold render fast:
 *
 *   1. The 3D scene is imported via `next/dynamic` with `ssr: false`,
 *      and the dynamic() call itself is created LAZILY inside the
 *      desktop branch. That way the `import("./_Scene")` reference
 *      isn't evaluated at module load on mobile clients, and the Next
 *      bundler doesn't pre-fetch the _Scene chunk for routes that only
 *      ever render the SVG fallback.
 *
 *   2. We use a hydrate-then-mount guard: `mounted` starts false and
 *      flips true in the first `useEffect`. This ensures the Canvas is
 *      never attempted during SSR or the first hydration tick — which
 *      would either crash (no `window`) or fight React over the DOM.
 *
 *   3. `useDeviceCapabilities()` consolidates the AGGRESSIVE downgrade
 *      checks: viewport, touch, low core count, low memory, reduced
 *      motion, software GPU (SwiftShader / Mesa / llvmpipe), Save-Data,
 *      cheap Windows laptop heuristic. Anything that smells low-end
 *      renders the lightweight SVG fallback instead. This keeps the
 *      WebGL pipeline off devices known to crash or stall on it.
 *
 *   4. WebGLErrorBoundary wraps the dynamic Scene. If WebGL context
 *      creation throws (Firefox+Win software-fallback path, GPU process
 *      crash, lost context during init), we swap to the SVG fallback
 *      instead of showing a blank black screen.
 */

class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn("[SceneContainer] WebGL scene crashed; using SVG fallback.", error);
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export function SceneContainer() {
  const { isMobile, tier, gpuTier } = useDeviceCapabilities();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-hydration / first render: nothing. Avoids flashing a fallback
  // or attempting the Canvas before `window` is available.
  if (!mounted) return null;

  if (isMobile || tier === "low" || gpuTier === "low") {
    return <SvgCoreFallback />;
  }

  // iter7: the wrapper is `pointer-events-none` so DOM interactive
  // elements (links, CTAs) win the hit-test. R3F still receives
  // pointer events because `_Scene` registers the Canvas event source
  // at `document.documentElement`, so the DevStation laptop click /
  // hover handlers fire from window-level events.
  const Scene = getScene();
  return (
    <WebGLErrorBoundary fallback={<SvgCoreFallback />}>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
      >
        <Scene />
      </div>
    </WebGLErrorBoundary>
  );
}

export default SceneContainer;
