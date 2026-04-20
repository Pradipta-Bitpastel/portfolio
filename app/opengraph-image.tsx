import { ImageResponse } from "next/og";

/**
 * Opengraph image for social previews. Rendered on-demand at the edge
 * by Next.js via the `next/og` ImageResponse API. Uses only inline
 * styles (next/og does not ship a CSS pipeline), Tailwind is not
 * available here.
 */

export const runtime = "edge";
export const alt = "Alex Chen — Developer Control Core";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background:
            "radial-gradient(circle at 50% 45%, rgba(79,156,255,0.35) 0%, rgba(11,15,25,0) 55%), linear-gradient(180deg, #0b0f19 0%, #0f1424 100%)",
          color: "#e7ecf5",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          position: "relative"
        }}
      >
        {/* Neon glow accent circle */}
        <div
          style={{
            position: "absolute",
            top: 120,
            left: 550,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(0,212,255,1) 0%, rgba(79,156,255,0.6) 40%, rgba(79,156,255,0) 70%)",
            boxShadow: "0 0 80px 20px rgba(0,212,255,0.6)",
            display: "flex"
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            fontFamily: "ui-monospace, monospace",
            fontSize: 22,
            letterSpacing: 8,
            color: "#9aa4b8",
            textTransform: "uppercase",
            marginTop: 80,
            display: "flex"
          }}
        >
          SYS.BOOT // 01
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: 120,
            fontWeight: 700,
            letterSpacing: -2,
            marginTop: 24,
            background:
              "linear-gradient(92deg, #4f9cff 0%, #9b5cff 50%, #00d4ff 100%)",
            backgroundClip: "text",
            color: "transparent",
            display: "flex"
          }}
        >
          Alex Chen
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 40,
            color: "#e7ecf5",
            marginTop: 8,
            display: "flex"
          }}
        >
          Developer Control Core
        </div>

        {/* Footer line */}
        <div
          style={{
            position: "absolute",
            bottom: 60,
            fontFamily: "ui-monospace, monospace",
            fontSize: 18,
            color: "#9aa4b8",
            letterSpacing: 4,
            textTransform: "uppercase",
            display: "flex"
          }}
        >
          full-stack / 3d web / cloud / mobile
        </div>
      </div>
    ),
    {
      ...size
    }
  );
}
