/**
 * Canonical list of the 6 scroll sections, matching the spec in
 * artifacts/spec.md §2 and §6. Each section is paired with one of the
 * 5 orbiting modules (plus `core` for Hero, which is the central
 * engine itself). Colors map to the neon palette in globals.css.
 *
 * Downstream scene graph, camera rig and section nav all read from
 * this single source.
 */

export type SectionId =
  | "hero"
  | "about"
  | "skills"
  | "projects"
  | "experience"
  | "contact";

export type ModuleId =
  | "core"
  | "frontend"
  | "backend"
  | "devops"
  | "cloud"
  | "mobile";

export interface Section {
  id: SectionId;
  title: string;
  subtitle: string;
  eyebrow: string;
  color: string;
  moduleId: ModuleId;
}

export const SECTIONS: readonly Section[] = [
  {
    id: "hero",
    title: "Boot",
    subtitle:
      "A full-stack engineer orchestrating web, mobile and cloud from a single command surface.",
    eyebrow: "SYS.BOOT // 01",
    color: "#4f9cff",
    moduleId: "core"
  },
  {
    id: "about",
    title: "Init",
    subtitle: "Operator profile. Five years shipping production software.",
    eyebrow: "SYS.INIT // 02",
    color: "#9b5cff",
    moduleId: "frontend"
  },
  {
    id: "skills",
    title: "Activation",
    subtitle: "Five modules. One runtime.",
    eyebrow: "SYS.ACTIVATION // 03",
    color: "#00d4ff",
    moduleId: "backend"
  },
  {
    id: "projects",
    title: "Execution",
    subtitle: "Selected work across the stack.",
    eyebrow: "SYS.EXECUTION // 04",
    color: "#ff8a3c",
    moduleId: "devops"
  },
  {
    id: "experience",
    title: "Timeline",
    subtitle: "A short history of shipping.",
    eyebrow: "SYS.TIMELINE // 05",
    color: "#39ffa5",
    moduleId: "cloud"
  },
  {
    id: "contact",
    title: "Signal",
    subtitle: "Ping the core.",
    eyebrow: "SYS.SIGNAL // 06",
    color: "#4f9cff",
    moduleId: "mobile"
  }
] as const;

export function getSection(id: SectionId): Section | undefined {
  return SECTIONS.find((s) => s.id === id);
}
