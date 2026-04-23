/**
 * 5 representative work types. `color` maps to the neon palette and
 * is used as the card accent / rim glow.
 *
 * Field shape is load-bearing: `ProjectCard` reads `id`, `name`,
 * `tagline`, `stack`, `description`, `color`. Do not rename.
 */

export interface Project {
  id: string;
  name: string;
  tagline: string;
  stack: ReadonlyArray<string>;
  description: string;
  color: string;
}

export const projects: ReadonlyArray<Project> = [
  {
    id: "ai-integrated-webapp",
    name: "AI-Integrated Web App",
    tagline: "Next.js app with OpenAI and Gemini features baked in.",
    stack: ["Next.js", "React", "Tailwind CSS", "OpenAI API", "Gemini API"],
    description:
      "Production Next.js application shipped at Bitpastel with AI assistance features wired through OpenAI and Gemini APIs — prompts, streaming responses, and prompt-state management handled in Redux Toolkit so the UI stays responsive while tokens arrive.",
    color: "#4f9cff"
  },
  {
    id: "react-native-expo-app",
    name: "Cross-Platform Mobile App",
    tagline: "One React Native codebase shipping to Android + iOS.",
    stack: ["React Native", "Expo", "EAS", "React Navigation", "TypeScript"],
    description:
      "Currently building a cross-platform mobile app with Expo for both Android and iOS — native-feeling navigation, async storage, push notifications, and EAS build + submit pipelines so releases go to both stores from the same main branch.",
    color: "#00d4ff"
  },
  {
    id: "cloud-cicd-pipeline",
    name: "Cloud + CI/CD Pipeline",
    tagline: "Next.js & Django on Azure / GCP with automated delivery.",
    stack: ["Azure", "GCP", "GitHub Actions", "Nginx", "SSL"],
    description:
      "End-to-end deployment path for Next.js and Django apps: VM provisioning, server configuration, domain + SSL setup, and GitHub Actions pipelines that take a push on main and ship it to production with zero manual steps.",
    color: "#9b5cff"
  },
  {
    id: "admin-dashboard",
    name: "Admin Dashboard",
    tagline: "Data-dense admin panel on React + AdminLTE.",
    stack: ["React", "Redux Toolkit", "React Query", "Tailwind CSS", "AdminLTE"],
    description:
      "Responsive admin dashboard with complex tables, filters, auth, and live data. Redux Toolkit for client state, React Query for server state + caching, and an AdminLTE-inspired layout that still feels fast at thousands of rows.",
    color: "#ff8a3c"
  },
  {
    id: "wordpress-build",
    name: "WordPress Build",
    tagline: "Figma → pixel-perfect WordPress theme + plugins.",
    stack: ["WordPress", "PHP", "HTML5", "SASS", "jQuery"],
    description:
      "Figma-to-WordPress delivery with theme customisation, layout implementation, and plugin integration — cross-browser tested and tuned so content editors can publish without a developer in the loop.",
    color: "#39ffa5"
  }
];

export default projects;
