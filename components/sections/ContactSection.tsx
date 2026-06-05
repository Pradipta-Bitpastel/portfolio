"use client";

import { useEffect, useRef } from "react";
import { gsap, registerAll, SplitText } from "@/lib/gsap";
import { SectionFrame } from "@/components/ui/SectionFrame";
import { MagneticButton } from "@/components/ui/MagneticButton";
import { profile } from "@/content/profile";
import { getSection } from "@/lib/sections";

const CONTACT = getSection("contact")!;

// Theme-aware semantic tokens (flip with data-theme via globals.css).
const BONE = "var(--bone)";
const INK = "var(--ink)";
const STEEL = "var(--ink-faint)";
// Hairline borders / faint fills derived from the theme line token.
const HAIRLINE = "var(--line)";
const HAIRLINE_STRONG = "var(--line-strong)";
const FAINT_FILL = "var(--surface)";
// Accents read on BOTH themes — kept static.
const BLUE = "#4f9cff";
const CYAN = "#00d4ff";
const GREEN = "#39ffa5";

type Channel = {
  idx: string;
  label: string;
  handle: string;
  href: string;
  external: boolean;
};

const CHANNELS: ReadonlyArray<Channel> = [
  {
    idx: "01",
    label: "GITHUB",
    handle: "Pradipta-Bitpastel",
    href: profile.socials.github,
    external: true,
  },
  {
    idx: "02",
    label: "LINKEDIN",
    handle: "in/pradipta-kumar-jana",
    href: profile.socials.linkedin,
    external: true,
  },
  {
    idx: "03",
    label: "EMAIL",
    handle: profile.socials.email,
    href: `mailto:${profile.socials.email}`,
    external: false,
  },
];

/**
 * Beacon — the signature finale graphic. A horizontal "transmission"
 * line with a packet pulse traveling left→right toward the contact
 * channels, plus a soft expanding ring at the emitter. Drawn on an SVG
 * via GSAP so it shares the site's render cadence; static under
 * reduced motion (the pulse parks at the emitter).
 */
function Beacon() {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const svg = ref.current;
    if (!svg) return;
    let cancelled = false;
    let ctx: ReturnType<typeof gsap.context> | null = null;

    const boot = async () => {
      await registerAll();
      if (cancelled || !ref.current) return;
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;

      ctx = gsap.context(() => {
        const packet = svg.querySelector<SVGCircleElement>("[data-packet]");
        const tracer = svg.querySelector<SVGCircleElement>("[data-tracer]");
        const ring = svg.querySelector<SVGCircleElement>("[data-ring]");
        if (packet) {
          gsap.fromTo(
            packet,
            { attr: { cx: 8 }, opacity: 1 },
            {
              attr: { cx: 312 },
              opacity: 0,
              duration: 2.2,
              ease: "power1.in",
              repeat: -1,
              repeatDelay: 0.4,
            }
          );
        }
        if (tracer) {
          gsap.fromTo(
            tracer,
            { attr: { cx: 8 } },
            {
              attr: { cx: 312 },
              duration: 2.2,
              ease: "power1.in",
              repeat: -1,
              repeatDelay: 0.4,
            }
          );
        }
        if (ring) {
          gsap.fromTo(
            ring,
            { attr: { r: 3 }, opacity: 0.7 },
            {
              attr: { r: 16 },
              opacity: 0,
              duration: 1.6,
              ease: "power2.out",
              repeat: -1,
              repeatDelay: 0.4,
            }
          );
        }
      }, svg);
    };

    void boot();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <svg
      ref={ref}
      viewBox="0 0 320 24"
      className="h-6 w-full"
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id="beam-fade" x1="0" x2="1">
          <stop offset="0" stopColor={CYAN} stopOpacity="0.9" />
          <stop offset="0.6" stopColor={BLUE} stopOpacity="0.5" />
          <stop offset="1" stopColor={BLUE} stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <line
        x1="8"
        y1="12"
        x2="312"
        y2="12"
        stroke="url(#beam-fade)"
        strokeWidth="1"
        strokeDasharray="2 4"
      />
      {/* emitter */}
      <circle cx="8" cy="12" r="2.4" fill={CYAN} />
      <circle data-ring cx="8" cy="12" r="3" fill="none" stroke={CYAN} strokeWidth="1" />
      {/* traveling packet + soft tracer glow */}
      <circle
        data-tracer
        cx="8"
        cy="12"
        r="6"
        fill={CYAN}
        opacity="0.18"
        style={{ filter: "blur(2px)" }}
      />
      <circle data-packet cx="8" cy="12" r="2.2" fill={INK} />
    </svg>
  );
}

/**
 * Contact / SYS.SIGNAL. The closing transmission of the dossier: a
 * confident editorial headline, a live "open channel" beacon, the real
 * contact channels as numbered dossier rows, and a magnetic SEND SIGNAL
 * CTA wired to mailto. No fake form — every link is real.
 */
export function ContactSection() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let ctx: ReturnType<typeof gsap.context> | null = null;
    const splits: InstanceType<typeof SplitText>[] = [];

    const boot = async () => {
      await registerAll();
      if (cancelled || !rootRef.current) return;
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      ctx = gsap.context(() => {
        if (reduced) {
          gsap.set(
            [
              "[data-kicker]",
              "[data-head-line]",
              "[data-rise]",
              "[data-channel]",
              "[data-cta]",
              "[data-rule]",
            ],
            { opacity: 1, y: 0, x: 0, yPercent: 0, scaleX: 1, scale: 1 }
          );
          return;
        }

        gsap.from("[data-kicker]", {
          opacity: 0,
          y: -12,
          duration: 0.7,
          ease: "power3.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 82%", once: true },
        });

        // Hairline rule draws across as the section enters.
        gsap.from("[data-rule]", {
          scaleX: 0,
          transformOrigin: "left center",
          duration: 1.1,
          ease: "power3.inOut",
          scrollTrigger: { trigger: rootRef.current, start: "top 82%", once: true },
        });

        // Headline lines clip up from their masks, one after another.
        gsap.utils.toArray<HTMLElement>("[data-head-line]").forEach((line) => {
          const split = new SplitText(line, { type: "chars" });
          splits.push(split);
          gsap.from(split.chars, {
            yPercent: 120,
            opacity: 0,
            duration: 0.9,
            stagger: 0.02,
            ease: "power4.out",
            scrollTrigger: { trigger: line, start: "top 88%", once: true },
          });
        });

        gsap.from("[data-rise]", {
          opacity: 0,
          y: 26,
          duration: 0.8,
          stagger: 0.08,
          ease: "power3.out",
          scrollTrigger: { trigger: rootRef.current, start: "top 70%", once: true },
        });

        // Channels populate like rows of a connecting log.
        gsap.from("[data-channel]", {
          opacity: 0,
          x: 24,
          duration: 0.6,
          stagger: 0.09,
          ease: "power3.out",
          scrollTrigger: { trigger: "[data-channels]", start: "top 86%", once: true },
        });

        // CTA pops with a back-ease and a single expanding focus ring.
        const cta = rootRef.current?.querySelector<HTMLElement>("[data-cta]");
        if (cta) {
          gsap.from(cta, {
            opacity: 0,
            scale: 0.86,
            duration: 0.7,
            ease: "back.out(2)",
            scrollTrigger: { trigger: cta, start: "top 90%", once: true },
          });
          gsap.fromTo(
            cta,
            { boxShadow: "0 0 0 0 rgba(0,212,255,0.45)" },
            {
              boxShadow: "0 0 0 18px rgba(0,212,255,0)",
              duration: 1.2,
              ease: "power2.out",
              delay: 0.5,
              clearProps: "boxShadow",
              scrollTrigger: { trigger: cta, start: "top 90%", once: true },
            }
          );
        }
      }, rootRef.current);
    };

    void boot();
    return () => {
      cancelled = true;
      ctx?.revert();
      splits.forEach((s) => s.revert());
    };
  }, []);

  return (
    <SectionFrame id="contact" ariaLabelledBy="contact-title" className="overflow-visible">
      {/* local atmosphere: a cool blue/cyan signal wash + baseline grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div
          className="absolute left-1/2 top-[18%] h-[60vh] w-[60vh] -translate-x-1/2 rounded-full opacity-[0.10] blur-[150px]"
          style={{ background: BLUE }}
        />
        <div
          className="absolute right-[6%] bottom-[10%] h-[34vh] w-[34vh] rounded-full opacity-[0.07] blur-[120px]"
          style={{ background: CYAN }}
        />
        <div className="grid-bg absolute inset-0 opacity-[0.18]" />
      </div>

      <div ref={rootRef} className="relative mx-auto w-full max-w-6xl" style={{ color: BONE }}>
        {/* Kicker rule — dossier closing transmission */}
        <div
          data-kicker
          className="flex items-center justify-between border-t pt-3 font-mono text-[11px] uppercase tracking-[0.3em]"
          style={{ borderColor: HAIRLINE_STRONG, color: STEEL }}
        >
          <span className="flex items-center gap-2">
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: GREEN, boxShadow: `0 0 8px ${GREEN}` }}
            />
            SYS.SIGNAL · OPEN CHANNEL
          </span>
          <span className="hidden items-center gap-3 sm:flex">
            <span style={{ color: STEEL }}>REF · PKJ-0X9</span>
            <span style={{ color: BLUE }}>06 / 06</span>
          </span>
          <span style={{ color: BLUE }} className="sm:hidden">
            06 / 06
          </span>
        </div>

        <div className="mt-10 grid items-end gap-10 md:mt-16 md:grid-cols-[1.25fr_0.75fr] md:gap-16">
          {/* Left: the headline + lead */}
          <div>
            <span
              data-rise
              className="mb-5 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.32em]"
              style={{ color: CYAN }}
            >
              <span
                aria-hidden
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: CYAN, boxShadow: `0 0 10px ${CYAN}` }}
              />
              {CONTACT.eyebrow}
            </span>

            <h2
              id="contact-title"
              className="font-grotesk leading-[0.82] tracking-[-0.04em]"
              style={{ fontWeight: 800, fontSize: "clamp(2.9rem,9.5vw,7.5rem)" }}
            >
              <span className="block overflow-hidden">
                <span data-head-line className="inline-block">
                  LET&apos;S BUILD
                </span>
              </span>
              <span className="block overflow-hidden">
                <span
                  data-head-line
                  className="inline-block font-serif italic"
                  style={{ fontWeight: 400, color: BLUE }}
                >
                  something real.
                </span>
              </span>
            </h2>

            <p
              data-rise
              className="mt-7 max-w-md text-[15px] leading-[1.78]"
              style={{ color: STEEL }}
            >
              Open to full-stack, 3D-web and cloud-infra roles. Bring me a hard
              UI, a deploy path that needs owning, or a product that has to ship —
              the line below is live.
            </p>

            {/* CTA + status */}
            <div data-rise className="mt-10 flex flex-wrap items-center gap-5">
              <MagneticButton
                href={`mailto:${profile.socials.email}`}
                strength={22}
                data-cta
                className="group relative isolate overflow-hidden rounded-full px-9 py-4 font-mono text-sm uppercase tracking-[0.26em]"
                style={{
                  color: "#06121f",
                  background: `linear-gradient(105deg, ${CYAN}, ${BLUE})`,
                  boxShadow: `0 10px 40px -10px ${CYAN}66`,
                }}
              >
                {/* sweep highlight on hover */}
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-white/30 transition-transform duration-700 ease-out group-hover:translate-x-full"
                  style={{ mixBlendMode: "overlay" }}
                />
                <span className="relative z-10 flex items-center gap-2 font-semibold">
                  SEND SIGNAL
                  <span aria-hidden className="transition-transform duration-300 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </MagneticButton>

              <span
                className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.26em]"
                style={{ color: STEEL }}
              >
                <span
                  className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                  style={{ background: GREEN, boxShadow: `0 0 8px ${GREEN}` }}
                />
                avg reply &lt; 24h
              </span>
            </div>
          </div>

          {/* Right: live beacon + channels */}
          <div className="flex flex-col gap-5">
            <div
              data-rise
              className="crop-frame border p-5"
              style={{ borderColor: HAIRLINE_STRONG, background: FAINT_FILL }}
            >
              <div
                className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.28em]"
                style={{ color: STEEL }}
              >
                <span>transmission</span>
                <span className="flex items-center gap-1.5" style={{ color: CYAN }}>
                  <span
                    className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                    style={{ background: CYAN, boxShadow: `0 0 6px ${CYAN}` }}
                  />
                  live
                </span>
              </div>
              <div className="mt-4">
                <Beacon />
              </div>
              <div
                className="mt-4 grid grid-cols-2 gap-3 border-t pt-3 font-mono text-[10px] uppercase tracking-[0.14em]"
                style={{ borderColor: HAIRLINE, color: STEEL }}
              >
                <span className="flex flex-col gap-0.5">
                  LATENCY <b style={{ color: BONE, letterSpacing: "0.06em" }}>~24h</b>
                </span>
                <span className="flex flex-col gap-0.5">
                  REGION <b style={{ color: BONE, letterSpacing: "0.06em" }}>IN · UTC+5:30</b>
                </span>
              </div>
            </div>

            <ul data-channels className="font-mono text-[12px]">
              {CHANNELS.map((c) => (
                <li key={c.label} data-channel>
                  <a
                    href={c.href}
                    target={c.external ? "_blank" : undefined}
                    rel={c.external ? "noreferrer" : undefined}
                    className="group flex items-center gap-3 border-b py-3.5 transition-colors"
                    style={{ borderColor: HAIRLINE }}
                  >
                    <span
                      className="tabular-nums transition-colors"
                      style={{ color: `${CYAN}99` }}
                    >
                      {c.idx}
                    </span>
                    <span
                      className="w-[78px] shrink-0 uppercase tracking-[0.22em] transition-colors group-hover:text-[--ch-hover]"
                      style={
                        {
                          color: STEEL,
                          ["--ch-hover" as string]: CYAN,
                        } as React.CSSProperties
                      }
                    >
                      {c.label}
                    </span>
                    <span
                      className="min-w-0 flex-1 truncate text-right transition-colors"
                      style={{ color: INK }}
                    >
                      {c.handle}
                    </span>
                    <span
                      aria-hidden
                      className="inline-block -translate-x-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                      style={{ color: CYAN }}
                    >
                      ↗
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Closing signature rule */}
        <div className="relative mt-16 md:mt-24">
          <div
            data-rule
            className="absolute left-0 right-0 top-0 h-px"
            style={{ background: HAIRLINE_STRONG }}
          />
          <div
            data-rise
            className="flex flex-col gap-2 pt-5 font-mono text-[10px] uppercase tracking-[0.3em] sm:flex-row sm:items-center sm:justify-between"
            style={{ color: STEEL }}
          >
            <span style={{ color: BONE }}>{profile.name}</span>
            <span className="flex items-center gap-3">
              <span>NEXT.JS · R3F · GSAP</span>
              <span style={{ color: STEEL }}>·</span>
              <span>© {new Date().getFullYear()}</span>
            </span>
          </div>
        </div>
      </div>
    </SectionFrame>
  );
}

export default ContactSection;
