"use client";

import { useEffect } from "react";
import { gsap, registerAll, ScrollTrigger } from "@/lib/gsap";
import { sceneStore } from "@/lib/sceneStore";

/**
 * SceneDock — single master ScrollTrigger tweening the DevStation
 * (sceneStore.core.ref) + camera across 6 docked poses over the
 * full document. scrub: 1 maps scroll 0-1 to timeline progress.
 *
 * Per-section files no longer own core transforms; they only drive
 * module emissive, connection opacity, ring visibility, and UI.
 *
 * | 01 Hero     |  [ 2.2,-0.1, 0.0]  rY:-0.12 rX:0.05  s:1.55  cam:[0,0.1,8]
 * | 02 About    |  [ 3.0, 0.3,-0.5]  rY:-0.40 rX:0.12  s:0.88  cam:[-0.4,0.3,6.5]
 * | 03 Skills   |  [-2.6, 0.1,-0.3]  rY: 0.42 rX:0.00  s:0.88  cam:[0.4,0.2,6.8]
 * | 04 Projects |  [ 0.0, 1.8,-1.5]  rY: 0.00 rX:0.30  s:0.72  cam:[0,2.4,9]
 * | 05 Exp      |  [ 2.4,-0.5, 0.2]  rY:-0.55 rX:0.00  s:0.85  cam:[-0.6,1.0,7.2]
 * | 06 Contact  |  [ 0.0, 0.0, 0.0]  rY: 0.00 rX:0.00  s:0.48  cam:[0,0,8.5]
 *
 * iter7: hero pose pulls in slightly (2.6 → 2.2) and scales up
 * (1.0 → 1.55) so the laptop is the dominant object on first paint.
 */

type Pose = {
  label: string;
  pos: [number, number, number];
  rotY: number;
  rotX: number;
  scale: number;
  cam: [number, number, number];
};

const POSES: Pose[] = [
  { label: "hero",     pos: [ 2.2, -0.1,  0.0], rotY: -0.12, rotX: 0.05, scale: 1.55, cam: [ 0.0, 0.1, 8.0] },
  { label: "about",    pos: [ 3.0,  0.3, -0.5], rotY: -0.40, rotX: 0.12, scale: 0.88, cam: [-0.4, 0.3, 6.5] },
  { label: "skills",   pos: [-2.6,  0.1, -0.3], rotY:  0.42, rotX: 0.00, scale: 0.88, cam: [ 0.4, 0.2, 6.8] },
  { label: "projects", pos: [ 0.0,  1.8, -1.5], rotY:  0.00, rotX: 0.30, scale: 0.72, cam: [ 0.0, 2.4, 9.0] },
  { label: "exp",      pos: [ 2.4, -0.5,  0.2], rotY: -0.55, rotX: 0.00, scale: 0.85, cam: [-0.6, 1.0, 7.2] },
  { label: "contact",  pos: [ 0.0,  0.0,  0.0], rotY:  0.00, rotX: 0.00, scale: 0.48, cam: [ 0.0, 0.0, 8.5] }
];

const SECTION_IDS = ["hero", "about", "skills", "projects", "experience", "contact"] as const;

export function SceneDock() {
  useEffect(() => {
    let cancelled = false;
    let master: gsap.core.Timeline | null = null;
    const killers: Array<() => void> = [];

    const boot = async () => {
      await registerAll();
      if (cancelled) return;

      // Wait for sceneStore refs to populate. Retry until core + cam
      // exist (Canvas mounts async behind dynamic import).
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
            buildMaster();
          }
        }, 120);
        killers.push(() => clearInterval(poll));
        return;
      }

      buildMaster();
    };

    const buildMaster = () => {
      if (cancelled) return;
      const core = sceneStore.core.ref;
      const cam = sceneStore.camera.ref;
      if (!core || !cam) return;

      // Seed to the hero pose so first paint lines up.
      const first = POSES[0];
      core.position.set(first.pos[0], first.pos[1], first.pos[2]);
      core.rotation.set(first.rotX, first.rotY, 0);
      core.scale.setScalar(first.scale);

      // Compute start/end based on full doc height: from start of hero
      // through the top of the last section.
      const heroEl = document.getElementById(SECTION_IDS[0]);
      const lastEl = document.getElementById(
        SECTION_IDS[SECTION_IDS.length - 1]
      );
      if (!heroEl || !lastEl) return;

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: heroEl,
          start: "top top",
          endTrigger: lastEl,
          end: "bottom bottom",
          scrub: 1,
          anticipatePin: 0,
          onEnter: () => {
            sceneStore.camera.gsapControlled = true;
          },
          onEnterBack: () => {
            sceneStore.camera.gsapControlled = true;
          },
          onLeave: () => {
            sceneStore.camera.gsapControlled = false;
          },
          onLeaveBack: () => {
            sceneStore.camera.gsapControlled = false;
          }
        }
      });

      // 6 labels at equal fractions across the master.
      const step = 1 / (POSES.length - 1);
      POSES.forEach((p, i) => {
        const at = i * step;
        tl.addLabel(p.label, at);
        // At each label, snap-tween to this pose.
        tl.to(
          core.position,
          { x: p.pos[0], y: p.pos[1], z: p.pos[2], ease: "none" },
          at
        );
        tl.to(
          core.rotation,
          { x: p.rotX, y: p.rotY, ease: "none" },
          at
        );
        tl.to(
          core.scale,
          { x: p.scale, y: p.scale, z: p.scale, ease: "none" },
          at
        );
        tl.to(
          cam.position,
          { x: p.cam[0], y: p.cam[1], z: p.cam[2], ease: "none" },
          at
        );
      });

      master = tl;
      killers.push(() => {
        try {
          tl.scrollTrigger?.kill();
          tl.kill();
        } catch {
          /* ignore */
        }
      });

      // Nudge ScrollTrigger so pinned sections that may have been
      // measured before the master tween was built recalc against the
      // new layout.
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
      try {
        master?.kill();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return null;
}

export default SceneDock;
