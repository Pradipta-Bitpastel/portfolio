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
      "Next.js 14 (App Router)",
      "React Three Fiber",
      "drei / postprocessing",
      "GSAP 3 + ScrollTrigger",
      "TypeScript (strict)",
      "Tailwind CSS",
      "CSS Modules",
      "Zustand",
      "Radix / shadcn"
    ]
  },
  backend: {
    label: "Backend",
    accent: "#ff8a3c",
    tagline: "Durable services and APIs under load.",
    items: [
      "Node.js",
      "Go",
      "PostgreSQL",
      "Redis",
      "gRPC",
      "tRPC",
      "GraphQL",
      "Kafka",
      "ClickHouse",
      "OpenAPI / Zod"
    ]
  },
  devops: {
    label: "DevOps",
    accent: "#39ffa5",
    tagline: "Reproducible infra and safe delivery.",
    items: [
      "Docker",
      "Kubernetes",
      "Terraform",
      "GitHub Actions",
      "Pulumi",
      "Prometheus / Grafana",
      "OpenTelemetry",
      "ArgoCD",
      "Helm",
      "Renovate"
    ]
  },
  cloud: {
    label: "Cloud",
    accent: "#9b5cff",
    tagline: "Multi-cloud with a preference for the edge.",
    items: [
      "AWS (ECS, Lambda, RDS, S3)",
      "GCP (Cloud Run, Pub/Sub)",
      "Cloudflare Workers",
      "Cloudflare R2 / D1",
      "Vercel Edge Functions",
      "Fly.io",
      "Fastly Compute",
      "Supabase",
      "Neon / Turso"
    ]
  },
  mobile: {
    label: "Mobile",
    accent: "#00d4ff",
    tagline: "Native-feeling apps on a single codebase.",
    items: [
      "React Native",
      "Expo (EAS)",
      "Reanimated 3",
      "Swift UI (basics)",
      "Jetpack Compose (basics)",
      "Push notifications",
      "Deep links / Universal links",
      "Biometric auth",
      "Offline-first sync"
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
