/**
 * 4 career milestones for the Timeline section.
 */

export interface ExperienceEntry {
  company: string;
  role: string;
  period: string;
  highlights: ReadonlyArray<string>;
}

export const experience: ReadonlyArray<ExperienceEntry> = [
  {
    company: "Aurora Labs",
    role: "Sr. Fullstack Engineer",
    period: "2024 — present",
    highlights: [
      "Led the rewrite of the analytics dashboard, shipping a realtime streaming core.",
      "Introduced an R3F-driven data-viz layer powering three internal products.",
      "Owned the migration to edge runtime, cutting p95 latency by 62%."
    ]
  },
  {
    company: "PulseGrid",
    role: "Fullstack Engineer",
    period: "2022 — 2024",
    highlights: [
      "Built the internal DevOps dashboard used by 12 product teams.",
      "Shipped a self-serve deployment pipeline on Terraform + GitHub Actions.",
      "Owned the design system that unified 4 independent front-ends."
    ]
  },
  {
    company: "Moonlit",
    role: "Frontend Engineer",
    period: "2020 — 2022",
    highlights: [
      "Delivered the flagship marketing site and design system foundation.",
      "Introduced GSAP-based scroll choreography and a reusable motion library.",
      "Mentored two juniors from first commit to production ownership."
    ]
  },
  {
    company: "Bitforge",
    role: "Software Intern",
    period: "2019 — 2020",
    highlights: [
      "Shipped two internal tools consumed daily by the support team.",
      "First intern to merge to main in week one.",
      "Earned a return full-time offer at the end of the program."
    ]
  }
];

export default experience;
