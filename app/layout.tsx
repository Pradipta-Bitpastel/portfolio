import type { Metadata } from "next";
import { Oxanium, IBM_Plex_Mono, Bricolage_Grotesque, Instrument_Serif } from "next/font/google";
import "@/app/globals.css";

// Editorial display — Bricolage Grotesque: characterful, high-contrast
// grotesque for the oversized "dossier" headlines. Distinctive, not the
// usual sci-fi/Space-Grotesk default.
const grotesk = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-grotesk",
  display: "swap",
  fallback: ["ui-sans-serif", "sans-serif"]
});

// Editorial accent — Instrument Serif: an elegant high-contrast serif for
// pull quotes / lead text, a deliberate counterpoint to the mono UI.
const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "serif"]
});
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { SceneContainer } from "@/components/three/SceneContainer";
import { HudFrame } from "@/components/ui/HudFrame";
import { Atmosphere } from "@/components/ui/Atmosphere";
import { Preloader } from "@/components/ui/Preloader";
import { Reticle } from "@/components/ui/Reticle";
import { ParallaxBackdrop } from "@/components/ui/ParallaxBackdrop";
import { CelestialSky } from "@/components/ui/CelestialSky";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ThemeTransitionOverlay } from "@/components/ui/ThemeTransitionOverlay";
import { ThemeProvider } from "@/lib/useTheme";

// Display — Oxanium: geometric sci-fi, free on Google Fonts. Used
// for giant section numbers + headline display text.
const display = Oxanium({
  subsets: ["latin"],
  weight: ["500", "700", "800"],
  variable: "--font-display",
  display: "swap",
  fallback: ["ui-sans-serif", "sans-serif"]
});

// Mono — IBM Plex Mono: mono-first body + HUD labels + numerics.
// Weights 400/500/700.
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-mono",
  display: "swap",
  fallback: ["ui-monospace", "monospace"]
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://portfolio.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Pradipta Kumar Jana — Senior Software Engineer",
  description:
    "Pradipta Kumar Jana — Senior Software Engineer. A scroll-driven 3D portfolio: Next.js, React, React Native and cloud-deployed apps, built around a reactive control core.",
  openGraph: {
    title: "Pradipta Kumar Jana — Senior Software Engineer",
    description:
      "Full-stack developer shipping web, mobile and cloud from a single command surface.",
    type: "website",
    url: SITE_URL
  },
  twitter: {
    card: "summary_large_image",
    title: "Pradipta Kumar Jana — Senior Software Engineer",
    description:
      "Full-stack developer shipping web, mobile and cloud from a single command surface."
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${grotesk.variable} ${serif.variable}`}>
      <body className="bg-bg text-ink font-mono antialiased">
        {/* Phase 5 cross-browser audit: a minimal no-JS notice. The
            entire site is a client-side 3D + scroll experience, so a
            user with JS disabled gets nothing usable — give them a
            single line explaining why and a link to the email contact. */}
        <noscript>
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
              background: "#0b0f19",
              color: "#e7ecf5",
              fontFamily: "ui-monospace, monospace",
              textAlign: "center"
            }}
          >
            This portfolio renders a scroll-driven 3D experience and needs
            JavaScript. Please enable it and reload, or reach me at{" "}
            <a
              href="mailto:pradiptajana.co@gmail.com"
              style={{ color: "#4f9cff", marginLeft: "0.4em" }}
            >
              pradiptajana.co@gmail.com
            </a>
            .
          </div>
        </noscript>
        <ThemeProvider>
          {/* Celestial sky (moon/stars/shooting-stars ↔ sun/clouds), BEHIND
              the ridge backdrop + the transparent Canvas. */}
          <CelestialSky />
          {/* Layered depth backdrop, BEHIND the transparent Canvas. */}
          <ParallaxBackdrop />
          {/* Canvas lives OUTSIDE the smooth-scroll wrapper so it is not
              translated by ScrollSmoother / Lenis — it stays pinned. */}
          <SceneContainer />
          {/* Atmosphere + HUD frame — fixed overlays */}
          <Atmosphere />
          <HudFrame />
          {/* Day/night toggle (top-centre HUD pill). */}
          <ThemeToggle />
          {/* Cloud reveal that veils the screen while the theme swaps. */}
          <ThemeTransitionOverlay />
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
          {/* Custom reticle cursor (desktop/fine-pointer only) + one-shot
              boot preloader. Both self-gate and remove themselves when
              not applicable. */}
          <Reticle />
          <Preloader />
        </ThemeProvider>
      </body>
    </html>
  );
}
