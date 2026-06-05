"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap, registerAll } from "@/lib/gsap";
import { SectionFrame } from "@/components/ui/SectionFrame";
import { profile } from "@/content/profile";
import { projects } from "@/content/projects";
import { skills, MODULE_ORDER } from "@/content/skills";

/**
 * SYS.SHELL — the signature interactive section. The tagline is "from a
 * single command surface", so this gives visitors a real one: a focusable
 * terminal where `help · about · stack · projects · contact · clear`
 * print themed responses, and a couple of commands actually *do* things
 * (jump to the project gallery, open mail). Keyboard-first, on-brand.
 *
 * Visually this is a cinematic, gorgeous terminal/HUD: refined window
 * chrome, color-coded prompt segments, a blinking block caret, a scanline
 * + scan-beam glow, and a tasteful GSAP entrance. Command handling is
 * fully preserved (input + history + quick-run chips).
 *
 * Not one of the six canonical scroll sections — it's an interstitial
 * showcase band between BOOT and INIT, so the section nav/HUD ignore it.
 */

type Line = { kind: "in" | "out" | "sys" | "err"; text: string };

const USER = "core";
const HOST = "portfolio";
const PROMPT = `${USER}@${HOST}:~$`;

const stackLines = MODULE_ORDER.map((id) => {
  const m = skills[id];
  return `${m.label.toLowerCase().padEnd(9)} ${m.items.slice(0, 4).join(" · ")}`;
});

const projectLines = projects.map(
  (p, i) => `${String(i + 1).padStart(2, "0")} ${p.name}`
);

const STATIC: Record<string, string[]> = {
  help: [
    "available commands —",
    "  about      operator dossier",
    "  stack      capability modules",
    "  projects   jump to execution log",
    "  contact    open comms channels",
    "  whoami     identity",
    "  clear      wipe scrollback",
    "(psst — try 'sudo deploy')",
  ],
  about: [
    `${profile.name} — ${profile.role.toLowerCase()}.`,
    "3+ yrs shipping web, mobile & cloud.",
    profile.location.replace(" — ", " · "),
  ],
  stack: stackLines,
  whoami: [profile.name.toLowerCase().replace(/\s+/g, "-")],
  ls: ["about  stack  projects  contact"],
};

/** Quick-run chips — one tap runs the command, same path as typing it. */
const QUICK = ["about", "stack", "projects", "contact", "clear"] as const;

/** Auto-typed hint shown once on mount, then the prompt takes over. */
const INTRO: Line[] = [
  { kind: "sys", text: "control surface online — type 'help' to begin" },
];

export function TerminalSection() {
  const rootRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [lines, setLines] = useState<Line[]>(INTRO);
  const [draft, setDraft] = useState("");
  const [focused, setFocused] = useState(false);
  const historyRef = useRef<string[]>([]);
  const histIdxRef = useRef<number>(-1);

  // Reveal the terminal frame as it scrolls into view.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let cancelled = false;
    let ctx: ReturnType<typeof gsap.context> | null = null;
    const boot = async () => {
      await registerAll();
      if (cancelled || !rootRef.current) return;
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) {
        gsap.set(["[data-shell]", "[data-window]", "[data-chip]"], {
          opacity: 1,
          y: 0,
          scaleY: 1,
        });
        return;
      }
      ctx = gsap.context(() => {
        const tl = gsap.timeline({
          scrollTrigger: { trigger: rootRef.current, start: "top 78%", once: true },
        });
        tl.from("[data-kicker]", { opacity: 0, y: 16, duration: 0.6, ease: "power3.out" })
          .from(
            "[data-window]",
            { opacity: 0, y: 44, scale: 0.985, duration: 0.85, ease: "power3.out" },
            "-=0.3"
          )
          .from(
            "[data-scan]",
            { scaleX: 0, transformOrigin: "left center", duration: 0.7, ease: "power2.out" },
            "-=0.55"
          )
          .from(
            "[data-chip]",
            { opacity: 0, y: 14, duration: 0.45, stagger: 0.06, ease: "power3.out" },
            "-=0.35"
          )
          .from(
            "[data-foot]",
            { opacity: 0, y: 10, duration: 0.5, ease: "power2.out" },
            "-=0.25"
          );
      }, rootRef.current);
    };
    void boot();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  // Keep the log scrolled to the newest line, like a native terminal.
  // rAF defers the measurement until after the new row has laid out, so
  // scrollHeight is accurate and the prompt is always pinned to the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const id = requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
    return () => cancelAnimationFrame(id);
  }, [lines]);

  const run = useCallback((raw: string) => {
    const cmd = raw.trim().toLowerCase();
    if (!cmd) return;

    // Record into history (most-recent-last); reset the cursor.
    historyRef.current = [...historyRef.current, raw.trim()];
    histIdxRef.current = -1;

    if (cmd === "clear") {
      setLines([]);
      return;
    }

    const echo: Line = { kind: "in", text: raw };

    // Action commands.
    if (cmd === "projects") {
      setLines((h) => [
        ...h,
        echo,
        ...projectLines.map((t) => ({ kind: "out" as const, text: t })),
        { kind: "sys", text: "→ jumping to SYS.EXECUTION…" },
      ]);
      const target = document.getElementById("projects");
      const lenis = (window as unknown as { __lenis?: { scrollTo: (t: HTMLElement) => void } }).__lenis;
      if (target) {
        if (lenis?.scrollTo) lenis.scrollTo(target);
        else target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    if (cmd === "contact") {
      setLines((h) => [
        ...h,
        echo,
        { kind: "out", text: `mail   ${profile.socials.email}` },
        { kind: "out", text: `github ${profile.socials.github.replace("https://", "")}` },
        { kind: "out", text: `in     ${profile.socials.linkedin.replace("https://www.", "")}` },
        { kind: "sys", text: "→ opening mail client…" },
      ]);
      window.location.href = `mailto:${profile.socials.email}`;
      return;
    }

    if (cmd === "sudo deploy") {
      setLines((h) => [
        ...h,
        echo,
        { kind: "out", text: "deploying core … ████████████ 100%" },
        { kind: "sys", text: "✓ signal locked. you found the easter egg." },
      ]);
      return;
    }

    const out = STATIC[cmd];
    setLines((h) => [
      ...h,
      echo,
      ...(out
        ? out.map((t) => ({ kind: "out" as const, text: t }))
        : [
            { kind: "err" as const, text: `command not found: ${cmd}` },
            { kind: "out" as const, text: "type 'help' for the command list" },
          ]),
    ]);
  }, []);

  // Submit current draft and clear the field.
  const submit = useCallback(() => {
    run(draft);
    setDraft("");
  }, [draft, run]);

  // Run a quick-run chip command and keep the keyboard focus.
  const runChip = useCallback(
    (c: string) => {
      run(c);
      setDraft("");
      inputRef.current?.focus();
    },
    [run]
  );

  // Arrow-key command history recall.
  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      submit();
      return;
    }
    const hist = historyRef.current;
    if (e.key === "ArrowUp") {
      if (!hist.length) return;
      e.preventDefault();
      histIdxRef.current =
        histIdxRef.current < 0 ? hist.length - 1 : Math.max(0, histIdxRef.current - 1);
      setDraft(hist[histIdxRef.current] ?? "");
    } else if (e.key === "ArrowDown") {
      if (!hist.length) return;
      e.preventDefault();
      if (histIdxRef.current < 0) return;
      histIdxRef.current = histIdxRef.current + 1;
      if (histIdxRef.current >= hist.length) {
        histIdxRef.current = -1;
        setDraft("");
      } else {
        setDraft(hist[histIdxRef.current] ?? "");
      }
    }
  }, [submit]);

  return (
    <SectionFrame id="shell" ariaLabelledBy="shell-title">
      {/* local atmosphere: cyan wash so the surface reads as a lit console */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <div
          className="absolute left-1/2 top-1/2 h-[60vh] w-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.07] blur-[140px]"
          style={{ background: "var(--cyan)" }}
        />
      </div>

      <div ref={rootRef} className="shell-root relative mx-auto w-full max-w-3xl">
        <h2 id="shell-title" className="sr-only">
          Interactive command terminal
        </h2>

        {/* Kicker */}
        <div
          data-kicker
          className="mb-5 flex items-end justify-between gap-4 border-t border-line pt-3 font-mono"
        >
          <span className="shell-acc-cyan flex items-center gap-2 text-[11px] uppercase tracking-[0.32em] text-cyan">
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-cyan"
              style={{ boxShadow: "0 0 10px var(--cyan)" }}
            />
            SYS.SHELL // command surface
          </span>
          <span className="hidden text-[10px] uppercase tracking-[0.28em] text-ink-dim sm:inline">
            from a single command surface
          </span>
        </div>

        {/* Terminal window */}
        <div
          data-window
          onClick={() => inputRef.current?.focus()}
          className="shell-window group relative cursor-text overflow-hidden rounded-2xl border border-line font-mono backdrop-blur-md"
        >
          {/* Scanline + grain overlay (decorative, non-interactive). */}
          <div
            aria-hidden
            className="shell-scan pointer-events-none absolute inset-0 z-20 opacity-[0.35] mix-blend-soft-light"
          />
          {/* Top edge cyan glow line */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-px"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(0,212,255,0.7), transparent)",
            }}
          />

          {/* Title bar */}
          <div className="shell-titlebar relative z-10 flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              {[
                { c: "#ff5f57", g: "rgba(255,95,87,0.7)" },
                { c: "#febc2e", g: "rgba(254,188,46,0.7)" },
                { c: "#28c840", g: "rgba(40,200,64,0.7)" },
              ].map((d) => (
                <span
                  key={d.c}
                  className="h-3 w-3 rounded-full"
                  style={{ background: d.c, boxShadow: `0 0 8px ${d.g}` }}
                />
              ))}
            </div>
            <span className="mx-auto flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-ink-dim">
              <span className="shell-acc-cyan text-cyan">●</span>
              {USER}@{HOST} — bash
            </span>
            <span
              className="shell-badge hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.24em] text-green sm:inline-flex"
              style={{
                borderColor: "rgba(57,255,165,0.25)",
                background: "rgba(57,255,165,0.06)",
              }}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full bg-green"
                style={{ boxShadow: "0 0 8px var(--green)" }}
              />
              connected
            </span>
          </div>

          {/* Body */}
          <div className="relative z-10 px-4 pb-4 pt-4 text-[12.5px] leading-[1.65] sm:px-6 sm:pb-5 sm:text-[13px]">
            {/* Scrollback */}
            <div
              ref={scrollRef}
              className="terminal-scroll h-[42vh] space-y-0.5 overflow-y-auto pr-1"
            >
              {lines.map((line, i) => (
                <Row key={i} line={line} />
              ))}

              {/* Live input row */}
              <div className="flex items-baseline gap-2 pt-1.5">
                <PromptLabel />
                <div className="relative flex-1">
                  {/* The real input is transparent-text; we render the
                      typed value + a blinking block caret on top so the
                      caret matches the terminal aesthetic. */}
                  <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    aria-label="Terminal command input"
                    onKeyDown={onKeyDown}
                    className="shell-input w-full bg-transparent text-transparent caret-transparent outline-none"
                    style={{ caretColor: "transparent" }}
                  />
                  {/* Visible overlay text + caret */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 flex items-center whitespace-pre text-ink"
                  >
                    <span>{draft}</span>
                    <span
                      className="ml-px inline-block h-[1.05em] w-[0.55em] translate-y-[0.1em] bg-cyan"
                      style={{
                        boxShadow: "0 0 8px rgba(0,212,255,0.7)",
                        animation: focused
                          ? "none"
                          : "shell-blink 1.05s steps(1) infinite",
                        opacity: focused ? 1 : undefined,
                      }}
                    />
                  </div>
                </div>
                <kbd
                  className="hidden shrink-0 select-none rounded border border-line px-1.5 py-0.5 text-[9px] uppercase tracking-[0.18em] text-ink-dim sm:inline-block"
                >
                  ⏎ run
                </kbd>
              </div>
            </div>
          </div>

          {/* Status footer */}
          <div className="shell-footer relative z-10 flex items-center justify-between gap-3 border-t border-line px-4 py-2.5 text-[9.5px] uppercase tracking-[0.2em] text-ink-dim sm:px-6">
            <span className="flex items-center gap-3">
              <span>
                ln <b className="text-ink/80">{String(lines.length).padStart(2, "0")}</b>
              </span>
              <span className="hidden sm:inline">utf-8</span>
              <span className="hidden sm:inline">/bin/bash</span>
            </span>
            <span data-scan className="flex items-center gap-2">
              <span className="shell-acc-cyan text-cyan">↑↓</span> history
              <span className="text-ink-dim/60">·</span>
              <span className="shell-acc-cyan text-cyan">⏎</span> exec
            </span>
          </div>
        </div>

        {/* Quick-run chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {QUICK.map((c) => (
            <button
              key={c}
              data-chip
              type="button"
              onClick={() => runChip(c)}
              className="group/chip rounded-full border border-line bg-surface px-3 py-1.5 font-mono text-[11px] lowercase tracking-[0.06em] text-ink-dim transition-colors duration-200 hover:border-cyan/50 hover:text-cyan"
            >
              <span className="text-cyan/60 transition-colors group-hover/chip:text-cyan">$</span>{" "}
              {c}
            </button>
          ))}
        </div>

        <p
          data-foot
          className="mt-4 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-dim"
        >
          tip: type a command or tap a chip · arrows recall history
        </p>
      </div>

      {/* Component-scoped keyframes + scrollbar styling (no globals.css edit). */}
      <style jsx>{`
        /* Terminal-window surfaces — theme-aware via the <html data-theme>
           attribute so they flip in BOTH directions (CSS, not JS state).
           NIGHT values reproduce the original hardcoded console exactly. */
        .shell-window {
          background: rgba(7, 10, 18, 0.85);
          box-shadow: 0 30px 80px -30px rgba(0, 0, 0, 0.85),
            0 0 80px -10px rgba(0, 212, 255, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
        }
        .shell-scan {
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(255, 255, 255, 0.05) 0px,
            rgba(255, 255, 255, 0.05) 1px,
            transparent 1px,
            transparent 3px
          );
        }
        .shell-titlebar {
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.04),
            rgba(255, 255, 255, 0)
          );
        }
        .shell-footer {
          background: rgba(255, 255, 255, 0.015);
        }
        :global(:root[data-theme="day"]) .shell-window {
          background: rgba(255, 255, 255, 0.82);
          box-shadow: 0 30px 80px -30px rgba(28, 34, 48, 0.3),
            0 0 80px -10px rgba(0, 212, 255, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.7);
        }
        :global(:root[data-theme="day"]) .shell-scan {
          background-image: repeating-linear-gradient(
            to bottom,
            rgba(28, 34, 48, 0.05) 0px,
            rgba(28, 34, 48, 0.05) 1px,
            transparent 1px,
            transparent 3px
          );
        }
        :global(:root[data-theme="day"]) .shell-titlebar {
          background: linear-gradient(
            180deg,
            rgba(28, 34, 48, 0.05),
            rgba(28, 34, 48, 0)
          );
        }
        :global(:root[data-theme="day"]) .shell-footer {
          background: rgba(28, 34, 48, 0.02);
        }
        @keyframes shell-blink {
          0%,
          49% {
            opacity: 1;
          }
          50%,
          100% {
            opacity: 0;
          }
        }
        .terminal-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .terminal-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .terminal-scroll::-webkit-scrollbar-thumb {
          background: rgba(0, 212, 255, 0.22);
          border-radius: 999px;
        }
        .terminal-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 212, 255, 0.4);
        }
        .terminal-scroll {
          scrollbar-width: thin;
          scrollbar-color: rgba(0, 212, 255, 0.22) transparent;
        }
      `}</style>

      {/* DAY-mode accent contrast. The console accents (cyan/green) are very
          light hues that wash out on the parchment/white day surfaces, so on
          day we swap them for deeper variants of the SAME hue — the terminal
          identity is preserved, readability is restored. NIGHT is untouched.
          Global (not scoped) so it can reach the PromptLabel/Row subcomponents,
          but every selector is namespaced under .shell-root. */}
      <style jsx global>{`
        /* The site-wide :focus-visible ring (cyan outline + 4px radius) is
           great everywhere else, but on the terminal it drew a rounded cyan
           box around the command line. The blinking block caret already
           signals focus here, so suppress the generic ring on this field. */
        .shell-root .shell-input:focus,
        .shell-root .shell-input:focus-visible {
          outline: none;
          border-radius: 0;
        }
        :root[data-theme="day"] .shell-root .shell-sys {
          color: #0883a0;
        }
        :root[data-theme="day"] .shell-root .shell-acc-cyan {
          color: #0883a0;
        }
        :root[data-theme="day"] .shell-root .shell-acc-green {
          color: #0a8f57;
        }
        :root[data-theme="day"] .shell-root .shell-acc-blue {
          color: #1f6fe0;
        }
        :root[data-theme="day"] .shell-root .shell-acc-purple {
          color: #7a3fe0;
        }
        :root[data-theme="day"] .shell-root .shell-badge {
          color: #0a8f57;
          border-color: rgba(10, 143, 87, 0.4) !important;
          background: rgba(10, 143, 87, 0.08) !important;
        }
      `}</style>
    </SectionFrame>
  );
}

/** Color-coded prompt label (user@host:~$). */
function PromptLabel() {
  return (
    <span className="shrink-0 select-none whitespace-pre">
      <span className="shell-acc-green text-green">{USER}</span>
      <span className="text-ink-dim">@</span>
      <span className="shell-acc-blue text-blue">{HOST}</span>
      <span className="text-ink-dim">:</span>
      <span className="shell-acc-purple text-purple">~</span>
      <span className="shell-acc-cyan text-cyan">$</span>
    </span>
  );
}

/** A single scrollback row, styled per line kind. */
function Row({ line }: { line: Line }) {
  if (line.kind === "in") {
    return (
      <div className="flex items-baseline gap-2">
        <PromptLabel />
        <span className="text-ink">{line.text}</span>
      </div>
    );
  }
  if (line.kind === "sys") {
    return <div className="shell-sys text-cyan">{line.text}</div>;
  }
  if (line.kind === "err") {
    return (
      <div className="text-amber">
        <span className="opacity-60">✗ </span>
        {line.text}
      </div>
    );
  }
  return (
    <div className="flex gap-2 whitespace-pre-wrap text-ink/75">
      <span aria-hidden className="select-none text-cyan/35">
        ›
      </span>
      <span>{line.text}</span>
    </div>
  );
}

export default TerminalSection;
