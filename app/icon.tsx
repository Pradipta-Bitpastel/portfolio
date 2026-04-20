import { ImageResponse } from "next/og";

/**
 * Favicon (32x32) rendered via `next/og`. A glowing neon circle on a
 * dark background — a miniature version of the developer control core.
 */

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0b0f19"
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, #00d4ff 0%, #4f9cff 50%, rgba(79,156,255,0) 100%)",
            boxShadow: "0 0 12px 2px rgba(0,212,255,0.9)",
            display: "flex"
          }}
        />
      </div>
    ),
    { ...size }
  );
}
