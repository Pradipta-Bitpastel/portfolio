/**
 * Skills grouped by the 5 orbiting modules. The keys MUST match the
 * `ModuleId` union defined in `lib/sceneStore.ts`. Field shape
 * (`label`, `accent`, `tagline`, `items`) is consumed by SkillsSection.
 */

import type { ModuleId } from "@/lib/sceneStore";

export type ModuleSkills = Record<
  ModuleId,
  {
    label: string;
    accent: string;
    tagline: string;
    items: ReadonlyArray<string>;
  }
>;

export const skills: ModuleSkills = {
  frontend: {
    label: "Frontend",
    accent: "#4f9cff",
    tagline: "Interface layer — surfaces people actually touch.",
    items: [
      "React 18",
      "Next.js (App Router)",
      "JavaScript (ES2022+)",
      "jQuery",
      "Tailwind CSS",
      "Material UI",
      "SASS / CSS3",
      "AdminLTE",
      "Redux Toolkit",
      "React Query"
    ]
  },
  backend: {
    label: "Backend",
    accent: "#ff8a3c",
    tagline: "APIs, integrations and server-side glue.",
    items: [
      "PHP",
      "Django (deployment + env setup)",
      "Node.js",
      "REST APIs",
      "OpenAI API",
      "Gemini API",
      "MySQL",
      "WordPress (theme + plugin layer)",
      "Auth flows",
      "Webhooks"
    ]
  },
  devops: {
    label: "DevOps",
    accent: "#39ffa5",
    tagline: "Safe delivery, from first push to production.",
    items: [
      "Git / GitHub",
      "CI/CD pipeline setup",
      "GitHub Actions",
      "Linux server admin",
      "Windows Server",
      "Nginx / Apache",
      "SSL / Let's Encrypt",
      "Domain + DNS routing",
      "Environment config",
      "Release workflows"
    ]
  },
  cloud: {
    label: "Cloud",
    accent: "#9b5cff",
    tagline: "VM-up to go-live on Azure and GCP.",
    items: [
      "Microsoft Azure",
      "Google Cloud Platform",
      "VM instance setup",
      "Next.js deployment",
      "Django deployment",
      "Domain + SSL management",
      "Object storage",
      "Firewall + port config",
      "Database provisioning",
      "Monitoring basics"
    ]
  },
  mobile: {
    label: "Mobile",
    accent: "#00d4ff",
    tagline: "Cross-platform apps with Expo — Android + iOS.",
    items: [
      "React Native",
      "Expo (EAS build + submit)",
      "React Navigation",
      "Expo Router",
      "Async Storage",
      "Reanimated",
      "Push notifications",
      "Deep links",
      "App store release flow",
      "Platform APIs (Android + iOS)"
    ]
  }
};

export const MODULE_ORDER: ReadonlyArray<ModuleId> = [
  "frontend",
  "backend",
  "devops",
  "cloud",
  "mobile"
];

export default skills;
