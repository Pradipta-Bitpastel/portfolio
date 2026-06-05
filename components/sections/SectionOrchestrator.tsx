"use client";

import { useSceneScrollDriver } from "@/lib/useScrollProgress";
import HeroSection from "./HeroSection";
import TerminalSection from "./TerminalSection";
import AboutSection from "./AboutSection";
import EmojiConvergeSection from "./EmojiConvergeSection";
import MetricsSection from "./MetricsSection";
import StackMarquee from "./StackMarquee";
import SkillsSection from "./SkillsSection";
import ProjectsSection from "./ProjectsSection";
import ShowcaseSection from "./ShowcaseSection";
import ExperienceSection from "./ExperienceSection";
import KineticRevealSection from "./KineticRevealSection";
import ContactSection from "./ContactSection";

/**
 * Renders the six sections and mounts the single scroll-progress driver
 * that feeds the 3D scene. The scene reacts to `sceneStore.progress` in
 * its own render loop — there is no per-section choreography here, which
 * is exactly what keeps the scroll smooth.
 */
export function SectionOrchestrator() {
  useSceneScrollDriver();

  return (
    <>
      {/* The HERO stays at z-auto — BELOW the ambient canvas (z-10) — so the
          single traveling robot is VISIBLE composited over the Firewatch hero
          (it's already playing "Wave" at progress 0, a natural greeting). */}
      <HeroSection />
      {/* Everything BELOW the hero is lifted into one stacking context at
          z-20, ABOVE the canvas, so the SAME robot keeps drifting BEHIND each
          section's content (transparent backgrounds let it show through) —
          identical to before. Only `position + z-index` here (no transform),
          so sticky/pinned descendants keep referencing the viewport. */}
      <div className="relative z-20">
        <TerminalSection />
        <AboutSection />
        <EmojiConvergeSection />
        <MetricsSection />
        <StackMarquee />
        <SkillsSection />
        <ProjectsSection />
        <ShowcaseSection />
        <ExperienceSection />
        <KineticRevealSection />
        <ContactSection />
      </div>
    </>
  );
}

export default SectionOrchestrator;
