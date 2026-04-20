/**
 * 5 showcase projects. `color` maps to the neon palette and is used
 * as the card accent / rim glow.
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
    id: "neurostream-analytics",
    name: "NeuroStream Analytics",
    tagline: "Realtime telemetry with ML-driven anomaly detection.",
    stack: ["Next.js", "Go", "Kafka", "ClickHouse", "WebSockets"],
    description:
      "Streaming analytics platform ingesting millions of events per minute, surfacing anomalies and trends in sub-second dashboards. Built a Kafka → ClickHouse pipeline with backpressure and a WebSocket gateway that drives the React dashboard, keeping p95 render under 80ms at 10k concurrent sockets.",
    color: "#4f9cff"
  },
  {
    id: "edgecast-cdn",
    name: "EdgeCast CDN",
    tagline: "Edge-routed CDN with per-region rule engine.",
    stack: ["Cloudflare Workers", "Rust", "R2", "WASM"],
    description:
      "Globally distributed CDN with a declarative rule engine, shipped on Workers and backed by R2 for low-cost object storage. Compiled the rule evaluator to WASM for cold-start safety and delivered 34% egress savings vs the previous origin-pull setup.",
    color: "#9b5cff"
  },
  {
    id: "pulse-devops",
    name: "Pulse DevOps",
    tagline: "Self-serve deployment dashboard for internal teams.",
    stack: ["Next.js", "Terraform", "GitHub Actions", "Postgres", "OIDC"],
    description:
      "Internal platform giving every squad the ability to ship to prod safely — previews, approvals, rollbacks, audit trail, all in one. Rolled out to 12 teams with OIDC-based RBAC and an opinionated Terraform module set that halved new-service onboarding time.",
    color: "#00d4ff"
  },
  {
    id: "aether-design-system",
    name: "Aether Design System",
    tagline: "Multi-brand design system with tokens and live playground.",
    stack: ["Storybook", "Figma API", "TypeScript", "Tailwind", "Style Dictionary"],
    description:
      "Tokens-first design system powering three product surfaces, with a live playground and a Figma ↔ code round-trip. Drove a monorepo split into headless logic + themed primitives so each brand could rebrand in an afternoon without forking components.",
    color: "#ff8a3c"
  },
  {
    id: "orbital-mobile-banking",
    name: "Orbital Mobile Banking",
    tagline: "Cross-platform mobile banking app with biometric auth.",
    stack: ["React Native", "Expo", "Node", "Postgres", "Reanimated"],
    description:
      "iOS + Android mobile banking client with biometric auth, instant transfers, and a native-feeling animated account view. Built a shared motion system on Reanimated 3 that matched the design team's Figma prototypes frame-for-frame across both platforms.",
    color: "#39ffa5"
  }
];

export default projects;
