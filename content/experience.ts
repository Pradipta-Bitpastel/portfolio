/**
 * Career milestones for the Timeline section.
 *
 * NOTE: the 3D TimelineRing is tuned for ~4 milestones spaced on the
 * ring. We have 2 real entries; the ring will just look lighter, which
 * is fine — no layout code cares about the array length.
 */

export interface ExperienceEntry {
  company: string;
  role: string;
  period: string;
  highlights: ReadonlyArray<string>;
}

export const experience: ReadonlyArray<ExperienceEntry> = [
  {
    company: "Bitpastel Solution PVT LTD",
    role: "Senior Software Engineer",
    period: "Aug 2023 — Present",
    highlights: [
      "Led the frontend of multiple React and Next.js projects with responsive UI on Tailwind CSS and Material UI.",
      "Wired Redux Toolkit and React Query for complex data flows and measurable performance wins.",
      "Shipped AI-powered features by integrating OpenAI and Gemini APIs.",
      "Managed cloud deployments on Azure and GCP: VM setup, server config, domain + SSL.",
      "Built and maintained CI/CD pipelines from dev to production.",
      "Currently building a cross-platform React Native (Expo) app for Android and iOS."
    ]
  },
  {
    company: "Proclivity Digitech",
    role: "Junior Web Developer",
    period: "Mar 2023 — Aug 2023",
    highlights: [
      "Built responsive interfaces in HTML, CSS, JavaScript and jQuery with cross-browser parity.",
      "Converted Figma designs into pixel-perfect, production-ready pages and components.",
      "Shipped WordPress projects end-to-end: theme customisation, page layouts, plugin integration."
    ]
  }
];

export default experience;
