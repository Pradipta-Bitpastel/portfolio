"use client";

import { useEffect } from "react";
import type * as THREE from "three";
import { gsap, registerAll, ScrollTrigger } from "@/lib/gsap";
import { sceneStore } from "@/lib/sceneStore";
import HeroSection from "./HeroSection";
import AboutSection from "./AboutSection";
import SkillsSection from "./SkillsSection";
import ProjectsSection from "./ProjectsSection";
import ExperienceSection from "./ExperienceSection";
import ContactSection from "./ContactSection";
import SceneDock from "@/components/three/SceneDock";

/**
 * Wraps all 6 sections and layers the section-boundary CINEMATIC BEAT
 * on top. There is no DOM overlay / modal — the "transition" lives
 * entirely inside the 3D scene. Each time a boundary is crossed we
 * play a short, composited beat:
 *
 *   1. Camera push-in + settle — cinematicOffset tween (z dip + z
 *      snap-back) simulates a snap-zoom toward the subject.
 *   2. FOV punch — +3° then snap back, paired with the push-in for
 *      the classic "film punch" feel.
 *   3. Chromatic aberration pulse — sharp, short; reinforces the cut.
 *   4. Core light kick — laptop point light flares amber.
 *   5. Connection-line flash — web illuminates for a beat.
 *   6. Module scale pulse — each module briefly scales up 6%.
 *
 * All beats overlap in a ~420ms envelope so the crossing reads as a
 * single cinematic event, not a sequence.
 */

const SECTION_IDS = ["hero", "about", "skills", "projects", "experience", "contact"] as const;

export function SectionOrchestrator() {
  useEffect(() => {
    let cancelled = false;
    const killers: Array<() => void> = [];

    const boot = async () => {
      await registerAll();
      if (cancelled) return;

      SECTION_IDS.forEach((id, idx) => {
        const el = document.getElementById(id);
        if (!el) return;

        const beat = () => {
          // Direction-aware push: alternate z-dip vs. y-rise so
          // section crosses don't all feel identical. Hero + about
          // + skills dip forward (z-); projects + experience + contact
          // lift up (y+). Gives each cut its own flavor.
          const dipZ = idx % 2 === 0 ? -0.85 : -0.5;
          const liftY = idx % 2 === 0 ? 0.0 : 0.35;

          // 1) Camera push-in — cinematicOffset composites with the
          //    GSAP-driven basePos in CameraController.
          gsap.fromTo(
            sceneStore.camera.cinematicOffset,
            { x: 0, y: 0, z: 0 },
            {
              x: 0,
              y: liftY,
              z: dipZ,
              duration: 0.18,
              ease: "power3.out",
              yoyo: true,
              repeat: 1,
              overwrite: "auto"
            }
          );

          // 2) FOV punch — adds on top of the scroll-driven fov.
          gsap.fromTo(
            sceneStore.camera,
            { fovPulse: 0 },
            {
              fovPulse: 3.4,
              duration: 0.18,
              ease: "power2.out",
              yoyo: true,
              repeat: 1,
              overwrite: "auto"
            }
          );

          // 3) Chromatic pulse — short + sharp.
          gsap.fromTo(
            sceneStore.fx,
            { chromaticIntensity: 0 },
            {
              chromaticIntensity: 0.55,
              duration: 0.14,
              ease: "power2.out",
              yoyo: true,
              repeat: 1,
              overwrite: "auto"
            }
          );

          // 4) Core light kick.
          const glow = sceneStore.core.glow;
          if (glow) {
            gsap.fromTo(
              glow,
              { intensity: glow.intensity },
              {
                intensity: 8.5,
                duration: 0.22,
                ease: "power3.out",
                yoyo: true,
                repeat: 1,
                overwrite: "auto"
              }
            );
          }

          // 5) Connection-line web flash.
          const conn = sceneStore.connections.ref;
          if (conn) {
            const mats: Array<THREE.Material & { opacity?: number }> = [];
            conn.traverse((child) => {
              const obj = child as THREE.Object3D & {
                material?:
                  | (THREE.Material & { opacity?: number })
                  | THREE.Material[];
              };
              const raw = obj.material;
              const mat = (Array.isArray(raw) ? raw[0] : raw) as
                | (THREE.Material & { opacity?: number })
                | undefined;
              if (mat && typeof mat.opacity === "number") mats.push(mat);
            });
            if (mats.length > 0) {
              gsap.fromTo(
                mats,
                { opacity: "+=0" },
                {
                  opacity: "+=0.4",
                  duration: 0.16,
                  ease: "power2.out",
                  yoyo: true,
                  repeat: 1,
                  overwrite: false
                }
              );
            }
          }

          // 6) Module scale pulse — each module briefly bumps up.
          (["frontend", "backend", "devops", "cloud", "mobile"] as const).forEach(
            (mid, i) => {
              const grp = sceneStore.modules[mid].ref;
              if (!grp) return;
              const base = grp.scale.x;
              gsap.fromTo(
                grp.scale,
                { x: base, y: base, z: base },
                {
                  x: base * 1.06,
                  y: base * 1.06,
                  z: base * 1.06,
                  duration: 0.16,
                  delay: i * 0.015,
                  ease: "power2.out",
                  yoyo: true,
                  repeat: 1,
                  overwrite: "auto"
                }
              );
            }
          );
        };

        const t = ScrollTrigger.create({
          trigger: el,
          start: "top 60%",
          end: "bottom 40%",
          onEnter: beat,
          onEnterBack: beat
        });
        killers.push(() => {
          try {
            t.kill();
          } catch {
            /* ignore */
          }
        });
      });
    };

    void boot();
    return () => {
      cancelled = true;
      killers.forEach((k) => k());
      sceneStore.fx.chromaticIntensity = 0;
      sceneStore.camera.cinematicOffset.set(0, 0, 0);
      sceneStore.camera.fovPulse = 0;
    };
  }, []);

  return (
    <>
      {/* Master timeline that docks the DevStation + camera across
          all 6 sections. Mounted once, owns core transforms. */}
      <SceneDock />
      <HeroSection />
      <AboutSection />
      <SkillsSection />
      <ProjectsSection />
      <ExperienceSection />
      <ContactSection />
    </>
  );
}

export default SectionOrchestrator;
