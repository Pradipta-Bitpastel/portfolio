"use client";

import { useTheme } from "@/lib/useTheme";

/**
 * DEV.OS day/night toggle — a HUD pill fixed top-centre. Sun (day) / moon
 * (night) crossfade + slide, mono label, accent ring. Pointer-events on (the
 * surrounding HudFrame is pointer-none), keyboard accessible.
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const day = theme === "day";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Switch to ${day ? "night" : "day"} mode`}
      title={`Switch to ${day ? "night" : "day"} mode`}
      className="group pointer-events-auto fixed left-1/2 top-3 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.28em] backdrop-blur-sm transition-colors md:top-5"
      style={{
        borderColor: "rgba(255,255,255,0.14)",
        background: "rgba(11,15,25,0.5)",
        color: day ? "#ff9b4d" : "#a9c6ff",
      }}
    >
      {/* icon stack — sun/moon crossfade */}
      <span className="relative inline-block h-4 w-4">
        {/* MOON */}
        <svg
          viewBox="0 0 24 24"
          className="absolute inset-0 h-4 w-4 transition-all duration-500"
          style={{
            opacity: day ? 0 : 1,
            transform: day ? "rotate(-40deg) scale(0.4)" : "rotate(0) scale(1)",
          }}
          fill="none"
          stroke="#a9c6ff"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
        </svg>
        {/* SUN */}
        <svg
          viewBox="0 0 24 24"
          className="absolute inset-0 h-4 w-4 transition-all duration-500"
          style={{
            opacity: day ? 1 : 0,
            transform: day ? "rotate(0) scale(1)" : "rotate(40deg) scale(0.4)",
          }}
          fill="none"
          stroke="#ff9b4d"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8" />
        </svg>
      </span>
      <span className="hidden sm:inline">{day ? "DAY" : "NIGHT"}</span>
    </button>
  );
}

export default ThemeToggle;
