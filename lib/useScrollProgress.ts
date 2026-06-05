"use client";

import { useEffect } from "react";
import { ScrollTrigger, registerAll } from "@/lib/gsap";
import { sceneStore } from "@/lib/sceneStore";
import { SECTIONS } from "@/lib/sections";

/**
 * Mounts ONE ScrollTrigger that spans the whole scrollable page and
 * writes normalized progress (0..1) into `sceneStore`. The 3D scene
 * reads this every frame and damps toward the matching pose, so there
 * is a single source of truth and zero GSAP-to-THREE coupling.
 *
 * We also derive the active section index from the live DOM positions
 * of each section element. Doing it from real offsets (rather than an
 * equal 1/N split) keeps the index correct even though the Projects
 * section is much taller than the others when its gallery is pinned.
 */
export function useSceneScrollDriver(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let trigger: ScrollTrigger | null = null;

    const boot = async () => {
      await registerAll();
      if (cancelled) return;

      const ids = SECTIONS.map((s) => s.id);

      // PERF: section tops are CACHED and only re-read on refresh (resize /
      // font load / pin layout change). Reading `el.offsetTop` inside
      // onUpdate forced a synchronous reflow on EVERY scroll frame, page-
      // wide — a major source of scroll jank, especially while the Projects
      // gallery is pinned. The cached tops stay valid during a scrub because
      // the pin-spacer height is constant.
      let tops: number[] = [];
      const measure = () => {
        tops = ids.map((id) => {
          const el = document.getElementById(id);
          return el ? el.offsetTop : Number.POSITIVE_INFINITY;
        });
      };

      const activeIndexFor = (scrollY: number): number => {
        // Pick the last section whose top is at or above the viewport
        // midpoint — that's the one currently "filling" the screen.
        const mid = scrollY + window.innerHeight * 0.5;
        let idx = 0;
        for (let i = 0; i < tops.length; i++) {
          if (tops[i] <= mid) idx = i;
        }
        return idx;
      };

      trigger = ScrollTrigger.create({
        start: 0,
        end: "max",
        onRefresh: measure,
        onUpdate: (self) => {
          sceneStore.progress = self.progress;
          sceneStore.sectionIndex = activeIndexFor(self.scroll());
          // px/s → a small normalized magnitude the scene can read each
          // frame. Clamped so a fling can't blow the spread out.
          const v = Math.min(Math.abs(self.getVelocity()) / 3000, 1.2);
          if (v > sceneStore.scrollVelocity) sceneStore.scrollVelocity = v;
        },
      });

      measure();
      ScrollTrigger.refresh();
    };

    void boot();

    return () => {
      cancelled = true;
      trigger?.kill();
    };
  }, []);
}

export default useSceneScrollDriver;
