import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./content/**/*.{ts,tsx,md,mdx}"
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        bg: "#0b0f19",
        "bg-2": "#0f1424",
        ink: "#e7ecf5",
        "ink-dim": "#9aa4b8",
        blue: "#4f9cff",
        purple: "#9b5cff",
        cyan: "#00d4ff",
        orange: "#ff8a3c",
        amber: "#FF7A1A",
        green: "#39ffa5"
      },
      fontFamily: {
        display: ["var(--font-display)", "ui-sans-serif", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
        // `sans` intentionally points at mono — whole site is mono-first.
        sans: ["var(--font-mono)", "ui-monospace", "monospace"]
      },
      boxShadow: {
        "glow-blue": "0 0 24px rgba(79,156,255,.55)",
        "glow-purple": "0 0 24px rgba(155,92,255,.55)",
        "glow-cyan": "0 0 24px rgba(0,212,255,.55)"
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": {
            opacity: "1",
            filter: "drop-shadow(0 0 6px rgba(79,156,255,0.6))"
          },
          "50%": {
            opacity: "0.75",
            filter: "drop-shadow(0 0 18px rgba(155,92,255,0.8))"
          }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" }
        },
        "grid-pan": {
          "0%": { backgroundPosition: "0px 0px" },
          "100%": { backgroundPosition: "80px 80px" }
        }
      },
      animation: {
        "pulse-glow": "pulse-glow 4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        "grid-pan": "grid-pan 20s linear infinite"
      }
    }
  },
  plugins: []
};

export default config;
