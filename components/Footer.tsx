import { profile } from "@/content/profile";

/**
 * Minimal dark footer. Mono font, neon accent dot, copyright and a
 * short credit line. Rendered at the end of the page; ContactSection
 * already renders its own closing credit, so this is intentionally
 * sparse and available for pages that don't include the Contact block.
 */
export function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/5 bg-bg/80 px-6 py-10 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 font-mono text-[11px] uppercase tracking-[0.25em] text-ink-dim md:flex-row">
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-[color:var(--cyan)]"
          />
          {profile.name} — Developer Control Core
        </span>
        <span>
          Next.js 14 · R3F · GSAP · &copy; {new Date().getFullYear()}
        </span>
        <div className="flex gap-4">
          <a
            href={profile.socials.github}
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink"
          >
            GitHub
          </a>
          <a
            href={profile.socials.linkedin}
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink"
          >
            LinkedIn
          </a>
          <a
            href={profile.socials.x}
            target="_blank"
            rel="noreferrer"
            className="hover:text-ink"
          >
            X
          </a>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
