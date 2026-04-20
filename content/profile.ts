/**
 * Owner persona, used across Hero/About/Contact copy.
 * Placeholder data — replace with real values for deployment.
 *
 * Field shape is load-bearing: sections import `profile.stats`,
 * `profile.roles`, `profile.socials`, `profile.summary`, etc.
 * Do not rename fields without updating the section files.
 */

export interface SocialLinks {
  github: string;
  linkedin: string;
  x: string;
  email: string;
}

export interface Profile {
  name: string;
  role: string;
  location: string;
  tagline: string;
  summary: string;
  bio: string;
  stats: ReadonlyArray<{ label: string; value: string }>;
  roles: ReadonlyArray<string>;
  socials: SocialLinks;
}

export const profile: Profile = {
  name: "Alex Chen",
  role: "Full-Stack Developer",
  location: "Remote — EU / US timezones",
  tagline:
    "A full-stack engineer orchestrating web, mobile and cloud from a single command surface.",
  summary:
    "I build scalable, production-ready systems that span the full stack — fast, reliable products across web, mobile and cloud. I care about product surface, system integrity, and a good-looking console.",
  bio:
    "Five years of shipping production software across startups and platform teams. I lead rewrites that nobody wants to touch, bring realtime data into interfaces that actually feel alive, and turn messy deploy pipelines into something a product team can self-serve. My favourite problems sit where UX meets systems: hot paths, data flow, animations that respect the 60fps budget.",
  stats: [
    { label: "deploys / month", value: "120+" },
    { label: "uptime", value: "99.98%" },
    { label: "stacks mastered", value: "5" },
    { label: "OSS contributions", value: "24" }
  ],
  roles: ["Full-Stack", "3D / R3F", "Cloud-Native", "DevOps", "Mobile"],
  socials: {
    github: "https://github.com/alexchen",
    linkedin: "https://linkedin.com/in/alexchen",
    x: "https://x.com/alexchen",
    email: "alex@example.com"
  }
};

export default profile;
