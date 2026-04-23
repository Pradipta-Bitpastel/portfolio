"use client";

import { useEffect } from "react";
import type * as THREE from "three";
import { gsap, registerAll, ScrollTrigger } from "@/lib/gsap";
import { sceneStore } from "@/lib/sceneStore";
import {
  SCENE_POSES,
  SECTION_TO_POSE,
  applyBrightness,
  type ModuleId
} from "@/lib/scenePoses";
import { readPerfTier } from "@/lib/usePerfTier";

/**
 * SceneDock — single master ScrollTrigger that choreographs the
 * entire 3D scene across 6 section poses.
 *
 * What moves, per scroll-scrub tick:
 *   1. Core (laptop) — position, rotation, scale
 *   2. Camera — world position + FOV
 *   3. Each module satellite — world-space position, scale, brightness
 *
 * Module positions are written on an additive parent — we store the
 * target position on each module's group.userData.poseTarget and a
 * per-frame hook inside each ModuleOrbit lerps toward it. This lets
 * the existing orbit bob/spin continue undisturbed; the pose tween
 * dictates the CENTER of each module's drift.
 *
 * Perf-tier gating:
 *   - high: full module choreography + per-frame brightness update
 *   - low:  we still run the core/camera tween (they already existed)
 *           but skip the per-module position tween so module refs
 *           stay in their cheap orbital defaults.
 */

const MODULE_IDS: ModuleId[] = [
  "frontend",
  "backend",
  "devops",
  "cloud",
  "mobile"
];

export function SceneDock() {
  useEffect(() => {
    let cancelled = false;
    const timelines: gsap.core.Timeline[] = [];
    const killers: Array<() => void> = [];

    const low = readPerfTier() === "low";

    const boot = async () => {
      await registerAll();
      if (cancelled) return;

      const waitForScene = () => {
        const core = sceneStore.core.ref;
        const cam = sceneStore.camera.ref;
        if (!core || !cam) return false;
        return true;
      };

      if (!waitForScene()) {
        const poll = setInterval(() => {
          if (cancelled) {
            clearInterval(poll);
            return;
          }
          if (waitForScene()) {
            clearInterval(poll);
            buildPerSection();
          }
        }, 120);
        killers.push(() => clearInterval(poll));
        return;
      }

      buildPerSection();
    };

    /**
     * Build one ScrollTrigger+timeline PER SECTION (not a single master
     * timeline). Each trigger is anchored to its section's DOM TOP,
     * so it runs while that section's top crosses the viewport — once
     * past the "end" position, the tween stays at its final state
     * regardless of how far the user scrolls inside a pinned section.
     *
     * This is the critical fix: the Projects section is pinned for
     * ~4 viewports of extra scroll, and a shared master timeline with
     * equal-spaced labels would lerp the laptop AWAY from the projects
     * pose as the user scrolled through the pin. With per-section
     * triggers anchored to each section's top, the laptop reaches
     * projects pose when the section enters view and HOLDS there for
     * the entire pin — then transitions to the next pose only when
     * the NEXT section's top enters view (after the pin ends).
     */
    const buildPerSection = () => {
      if (cancelled) return;
      const core = sceneStore.core.ref;
      const cam = sceneStore.camera.ref;
      if (!core || !cam) return;

      // Seed everything to the hero pose so first paint lines up.
      const first = SCENE_POSES[0];
      core.position.set(...first.core.pos);
      core.rotation.set(first.core.rotX, first.core.rotY, first.core.rotZ);
      core.scale.setScalar(first.core.scale);
      sceneStore.camera.basePos.set(...first.cam);
      sceneStore.camera.baseFov = first.fov;
      cam.fov = first.fov;
      cam.updateProjectionMatrix();

      // Seed module userData targets.
      MODULE_IDS.forEach((id) => {
        const group = sceneStore.modules[id].ref;
        const mesh = sceneStore.modules[id].mesh;
        const pose = first.modules[id];
        if (group) {
          group.userData.poseTarget = {
            x: pose.pos[0],
            y: pose.pos[1],
            z: pose.pos[2],
            scale: pose.scale
          };
        }
        applyBrightness(mesh, pose.brightness);
      });

      const segEase = "power2.inOut";

      // Hero (i=0) is already seeded; no trigger needed for it. For
      // i>=1, create a scrubbed timeline that tweens to that section's
      // pose as its top crosses the viewport.
      SCENE_POSES.forEach((pose, i) => {
        if (i === 0) return; // hero already seeded
        const sectionId = SECTION_TO_POSE[i]?.sectionId;
        if (!sectionId) return;
        const el = document.getElementById(sectionId);
        if (!el) return;

        // Trigger window tuned for "stay in pose, smoothly transition
        // to next". The section must be clearly entering the viewport
        // (top at 70% = ~30% entered) before the tween starts, and the
        // tween completes when the section is near viewport top-edge
        // (top at 15%). This widens the trigger range to 55% of the
        // viewport so the tween itself reads slowly + smoothly, and
        // leaves generous HOLDs between sections (no trigger active
        // between "top 15% of A" and "top 70% of B").
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: el,
            start: "top 70%",
            end: "top 15%",
            scrub: 1.5,
            invalidateOnRefresh: true
          }
        });

        // Core (laptop) position/rotation/scale.
        tl.to(
          core.position,
          { x: pose.core.pos[0], y: pose.core.pos[1], z: pose.core.pos[2], ease: segEase },
          0
        );
        tl.to(
          core.rotation,
          { x: pose.core.rotX, y: pose.core.rotY, z: pose.core.rotZ, ease: segEase },
          0
        );
        tl.to(
          core.scale,
          { x: pose.core.scale, y: pose.core.scale, z: pose.core.scale, ease: segEase },
          0
        );

        // Camera basePos + baseFov (CameraController composites with
        // mouse parallax + cinematic boundary offset).
        tl.to(
          sceneStore.camera.basePos,
          { x: pose.cam[0], y: pose.cam[1], z: pose.cam[2], ease: segEase },
          0
        );
        tl.to(sceneStore.camera, { baseFov: pose.fov, ease: segEase }, 0);

        if (!low) {
          MODULE_IDS.forEach((mid) => {
            const group = sceneStore.modules[mid].ref;
            const mesh = sceneStore.modules[mid].mesh;
            const mpose = pose.modules[mid];
            if (group) {
              if (!group.userData.poseTarget) {
                group.userData.poseTarget = {
                  x: mpose.pos[0],
                  y: mpose.pos[1],
                  z: mpose.pos[2],
                  scale: mpose.scale
                };
              }
              const target = group.userData.poseTarget as {
                x: number;
                y: number;
                z: number;
                scale: number;
              };
              tl.to(
                target,
                {
                  x: mpose.pos[0],
                  y: mpose.pos[1],
                  z: mpose.pos[2],
                  scale: mpose.scale,
                  ease: segEase
                },
                0
              );
            }
            if (mesh) {
              const mat = (Array.isArray(mesh.material)
                ? mesh.material[0]
                : mesh.material) as
                | (THREE.Material & {
                    emissiveIntensity?: number;
                    opacity?: number;
                    transparent?: boolean;
                  })
                | undefined;
              if (mat) {
                mat.transparent = true;
                if (typeof mat.emissiveIntensity === "number") {
                  tl.to(
                    mat,
                    {
                      emissiveIntensity: 0.2 + mpose.brightness * 0.8,
                      ease: segEase
                    },
                    0
                  );
                }
                if (typeof mat.opacity === "number") {
                  tl.to(
                    mat,
                    {
                      opacity: 0.35 + mpose.brightness * 0.65,
                      ease: segEase
                    },
                    0
                  );
                }
              }
            }
          });
        }

        timelines.push(tl);
        killers.push(() => {
          try {
            tl.scrollTrigger?.kill();
            tl.kill();
          } catch {
            /* ignore */
          }
        });
      });

      try {
        ScrollTrigger.refresh();
      } catch {
        /* ignore */
      }
    };

    void boot();

    return () => {
      cancelled = true;
      sceneStore.camera.gsapControlled = false;
      killers.forEach((k) => k());
      timelines.forEach((t) => {
        try {
          t.kill();
        } catch {
          /* ignore */
        }
      });
    };
  }, []);

  return null;
}

export default SceneDock;
