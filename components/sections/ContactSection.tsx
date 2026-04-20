"use client";

import { memo, useRef, type FormEvent } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, registerAll, hasPlugin } from "@/lib/gsap";
import { sceneStore } from "@/lib/sceneStore";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { profile } from "@/content/profile";
import { SectionFrame } from "@/components/ui/SectionFrame";

/**
 * Contact — "SYS.TRANSMIT // 06". Brutalist center-column.
 * Terminal-style form (not glass). Amber "06" top-left.
 *
 * Scene: glow pulse + module disperse (core position owned by
 * SceneDock → center-small).
 */

function splitChars(el: HTMLElement): HTMLSpanElement[] {
  const text = el.textContent ?? "";
  el.textContent = "";
  const spans: HTMLSpanElement[] = [];
  for (const ch of Array.from(text)) {
    const span = document.createElement("span");
    span.className = "inline-block will-change-transform";
    span.textContent = ch === " " ? "\u00a0" : ch;
    el.appendChild(span);
    spans.push(span);
  }
  return spans;
}

function ContactSectionImpl() {
  const rootRef = useRef<HTMLElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const ringsRef = useRef<SVGSVGElement>(null);

  useGSAP(
    () => {
      if (!rootRef.current) return;
      let cancelled = false;

      const boot = async () => {
        await registerAll();
        if (cancelled) return;

        // Headline per-char reveal
        const headline = headlineRef.current;
        if (headline) {
          let spans: Element[] | null = null;
          if (hasPlugin("SplitText")) {
            try {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const SplitText = (gsap as any).core?.globals?.()?.SplitText;
              if (SplitText) {
                const split = new SplitText(headline, { type: "chars" });
                spans = split.chars as Element[];
              }
            } catch {
              /* ignore */
            }
          }
          if (!spans) spans = splitChars(headline);

          gsap.fromTo(
            spans,
            { y: 40, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              stagger: 0.02,
              ease: "power2.out",
              scrollTrigger: {
                trigger: rootRef.current,
                start: "top 70%"
              }
            }
          );
        }

        // Links stagger
        const links = linksRef.current?.querySelectorAll(".contact-link");
        if (links && links.length > 0) {
          gsap.fromTo(
            links,
            { y: 20, opacity: 0 },
            {
              y: 0,
              opacity: 1,
              duration: 0.5,
              stagger: 0.08,
              ease: "back.out(1.5)",
              scrollTrigger: {
                trigger: rootRef.current,
                start: "top 65%"
              }
            }
          );
        }

        // Glow spike (scene-enter) — position handled by SceneDock.
        const glow = sceneStore.core.glow;
        if (glow) {
          gsap.fromTo(
            glow,
            { intensity: 4 },
            {
              intensity: 12,
              ease: "power2.inOut",
              scrollTrigger: {
                trigger: rootRef.current,
                start: "top 60%",
                end: "top 10%",
                scrub: 1
              }
            }
          );
        }

        // Modules contract then disperse (visual finale).
        const moduleIds = [
          "frontend",
          "backend",
          "devops",
          "cloud",
          "mobile"
        ] as const;
        moduleIds.forEach((id, i) => {
          const g = sceneStore.modules[id].ref;
          if (!g) return;
          const angle = (i / 5) * Math.PI * 2;
          gsap.to(g.position, {
            x: Math.cos(angle) * 0.6,
            y: 0,
            z: Math.sin(angle) * 0.6,
            ease: "power2.inOut",
            scrollTrigger: {
              trigger: rootRef.current,
              start: "top 70%",
              end: "top 20%",
              scrub: 1
            }
          });
        });

        // Ping rings
        const svg = ringsRef.current;
        if (svg) {
          const circles = svg.querySelectorAll<SVGCircleElement>(
            ".ping-ring"
          );
          circles.forEach((c, i) => {
            gsap.fromTo(
              c,
              { attr: { r: 20 }, opacity: 0.9 },
              {
                attr: { r: 180 },
                opacity: 0,
                duration: 2.4,
                ease: "power2.out",
                repeat: -1,
                delay: i * 0.8
              }
            );
          });
        }
      };

      void boot();

      return () => {
        cancelled = true;
      };
    },
    { scope: rootRef, dependencies: [] }
  );

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    // eslint-disable-next-line no-console
    console.log("[contact] signal payload", {
      name: data.get("name"),
      email: data.get("email"),
      message: data.get("message")
    });
  };

  const termLinks = [
    { label: "github.com/alexchen", href: profile.socials.github },
    { label: "linkedin/in/alexchen", href: profile.socials.linkedin },
    { label: "x.com/alexchen", href: profile.socials.x }
  ];

  return (
    <SectionFrame
      id="contact"
      ref={rootRef}
      ariaLabelledBy="contact-heading"
      className="flex-col justify-center"
    >
      {/* Giant "06" top-left, amber — inside the frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-[clamp(48px,6vw,96px)] top-[clamp(64px,8vh,140px)] z-0 hidden select-none font-mono text-[10rem] font-bold leading-none opacity-[0.95] md:block lg:text-[14rem]"
        style={{ color: "#FF7A1A", letterSpacing: "-0.02em" }}
      >
        06
      </div>

      {/* Ping rings */}
      <svg
        ref={ringsRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-60"
        width="420"
        height="420"
        viewBox="0 0 420 420"
      >
        <g fill="none" stroke="#FF7A1A" strokeWidth="1.2">
          <circle className="ping-ring" cx="210" cy="210" r="20" />
          <circle className="ping-ring" cx="210" cy="210" r="20" />
          <circle className="ping-ring" cx="210" cy="210" r="20" />
        </g>
      </svg>

      <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-col items-center gap-6 text-center">
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.32em] text-ink-dim">
          <span className="text-[#FF7A1A]">SYS.TRANSMIT // 06</span>
          <span className="opacity-40">—</span>
          <span>AWAITING_SIGNAL...</span>
        </div>

        <h2
          ref={headlineRef}
          id="contact-heading"
          className="font-display text-6xl leading-[0.88] tracking-[-0.035em] text-ink md:text-[8rem]"
          style={{ fontWeight: 800 }}
        >
          PING // THE_CORE
        </h2>

        <p className="max-w-[50ch] font-mono text-sm leading-relaxed text-ink-dim">
          Open to full-stack and 3D-web roles. Happy to chat about hard UI,
          infra, and everything between.
        </p>

        {/* Terminal-style form */}
        <div
          className="w-full max-w-xl text-left"
          style={{
            background: "#0d1320",
            border: "1px solid #FF7A1A66",
            boxShadow: "0 0 60px rgba(255,122,26,0.12)"
          }}
        >
          {/* Terminal top bar */}
          <div className="flex items-center justify-between border-b border-[#FF7A1A]/30 px-4 py-2">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#ff5f57]" />
              <span className="h-2 w-2 rounded-full bg-[#febc2e]" />
              <span className="h-2 w-2 rounded-full bg-[#28c840]" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#FF7A1A]">
              signal.tx
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-ink-dim/70">
              T+00:02:47
            </span>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4 p-5 md:p-7">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#FF7A1A]">
                &gt; NAME_
              </span>
              <input
                required
                type="text"
                name="name"
                autoComplete="name"
                className="border-b border-[#FF7A1A]/40 bg-transparent px-0 py-2 font-mono text-sm text-ink outline-none transition focus:border-[#FF7A1A]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#FF7A1A]">
                &gt; EMAIL_
              </span>
              <input
                required
                type="email"
                name="email"
                autoComplete="email"
                className="border-b border-[#FF7A1A]/40 bg-transparent px-0 py-2 font-mono text-sm text-ink outline-none transition focus:border-[#FF7A1A]"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#FF7A1A]">
                &gt; PAYLOAD_
              </span>
              <textarea
                required
                name="message"
                rows={4}
                className="resize-none border-b border-[#FF7A1A]/40 bg-transparent px-0 py-2 font-mono text-sm text-ink outline-none transition focus:border-[#FF7A1A]"
              />
            </label>
            <div className="pt-2">
              <MagneticButton
                type="submit"
                className="inline-flex items-center gap-2 bg-[#FF7A1A] px-5 py-3 font-mono text-[11px] uppercase tracking-[0.28em] text-black transition hover:bg-[#ff8f3f]"
              >
                SEND SIGNAL
                <span aria-hidden>→</span>
              </MagneticButton>
            </div>
          </form>
        </div>

        {/* Mono links row */}
        <div
          ref={linksRef}
          className="mt-3 flex flex-wrap items-center justify-center gap-4 font-mono text-[12px] uppercase tracking-[0.2em] text-ink-dim"
        >
          {termLinks.map((l, i) => (
            <span key={l.label} className="contact-link flex items-center gap-4">
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="text-ink-dim transition hover:text-[#FF7A1A] hover:underline hover:underline-offset-4"
                style={{ textDecorationColor: "#FF7A1A" }}
              >
                {l.label}
              </a>
              {i < termLinks.length - 1 && (
                <span className="text-[#FF7A1A]">▸</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <footer className="relative z-10 mt-20 flex w-full max-w-4xl flex-col items-center gap-1 font-mono text-[10px] uppercase tracking-[0.28em] text-ink-dim/70">
        <span>&copy; {new Date().getFullYear()} {profile.name} — DEV.OS v14.2.0</span>
        <span>SID:01K-MZ09-37TT — LAT 37.77°N / LON −122.42°W</span>
      </footer>
    </SectionFrame>
  );
}

export const ContactSection = memo(ContactSectionImpl);
export default ContactSection;
