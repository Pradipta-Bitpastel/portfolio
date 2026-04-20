"use client";

import { useEffect } from "react";
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
 * Wraps all 6 sections and layers a few global behaviors on top:
 *
 *   1. Section SMASH transition — a brief chromatic-aberration pulse
 *      fired each time a section boundary is crossed. We tween
 *      `sceneStore.fx.chromaticIntensity` from 0 → 0.6 → 0 on each
 *      enter; the SceneChromaticController picks it up inside the
 *      EffectComposer.
 *   2. `gsap.matchMedia` — pin:true timelines inside the child
 *      sections are cheap to disable by forcing `scrub: false` via
 *      mobile breakpoint, but the pin logic itself is harmless on
 *      mobile because the Canvas is replaced by SvgCoreFallback.
 *      We do still kill ScrollTriggers at unmount.
 *
 * Each section owns its own pin — this orchestrator is additive.
 */

const SECTION_IDS = ["hero", "about", "skills", "projects", "experience", "contact"] as const;

export function SectionOrchestrator() {
  useEffect(() => {
    let cancelled = false;
    const killers: Array<() => void> = [];

    const boot = async () => {
      await registerAll();
      if (cancelled) return;

      // Per-section SMASH flash on enter. Fires both directions so a
      // user scrolling back up still sees the transition.
      SECTION_IDS.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        const flash = () => {
          gsap.fromTo(
            sceneStore.fx,
            { chromaticIntensity: 0 },
            {
              chromaticIntensity: 0.6,
              duration: 0.18,
              ease: "power2.out",
              yoyo: true,
              repeat: 1,
              overwrite: "auto",
            }
          );
        };
        const t = ScrollTrigger.create({
          trigger: el,
          start: "top 60%",
          end: "bottom 40%",
          onEnter: flash,
          onEnterBack: flash,
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
