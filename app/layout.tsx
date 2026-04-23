import type { Metadata } from "next";
import { Oxanium, IBM_Plex_Mono } from "next/font/google";
import "@/app/globals.css";
import { SmoothScrollProvider } from "@/components/providers/SmoothScrollProvider";
import { SceneContainer } from "@/components/three/SceneContainer";
import { HudFrame } from "@/components/ui/HudFrame";
import { Atmosphere } from "@/components/ui/Atmosphere";

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
  title: "Pradipta Kumar Jana — DEV.OS Control Room",
  description:
    "Pradipta Kumar Jana — Senior Software Engineer. A sci-fi developer operating system: orbiting skill modules, docking 3D laptop rig, and HUD sections for About, Skills, Projects, Experience, and Contact.",
  openGraph: {
    title: "Pradipta Kumar Jana — DEV.OS Control Room",
    description:
      "Full-stack developer orchestrating web, mobile and cloud from a single control surface.",
    type: "website",
    url: SITE_URL
  },
  twitter: {
    card: "summary_large_image",
    title: "Pradipta Kumar Jana — DEV.OS Control Room",
    description:
      "Full-stack developer orchestrating web, mobile and cloud from a single control surface."
  }
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable}`}>
      <body className="bg-bg text-ink font-mono antialiased">
        {/* Canvas lives OUTSIDE the smooth-scroll wrapper so it is not
            translated by ScrollSmoother / Lenis — it stays pinned. */}
        <SceneContainer />
        {/* Atmosphere + HUD frame — fixed overlays */}
        <Atmosphere />
        <HudFrame />
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
