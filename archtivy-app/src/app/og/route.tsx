import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * GET /og — generates a default 1200x630 Open Graph image for Archtivy.
 * Used as the fallback OG image for pages that don't have a listing-specific cover.
 */
export async function GET() {
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
          backgroundColor: "#f5f5f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 6,
            backgroundColor: "#002abf",
          }}
        />

        {/* Logo mark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 72,
            height: 72,
            borderRadius: 8,
            backgroundColor: "#002abf",
            marginBottom: 32,
          }}
        >
          <span style={{ fontSize: 36, fontWeight: 700, color: "#fff", letterSpacing: "-0.02em" }}>
            A
          </span>
        </div>

        {/* Title */}
        <span
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#18181b",
            letterSpacing: "-0.025em",
          }}
        >
          Archtivy
        </span>

        {/* Tagline */}
        <span
          style={{
            fontSize: 22,
            color: "#71717a",
            marginTop: 12,
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.4,
          }}
        >
          Projects, products, designers &amp; brands for architecture
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
