import { ImageResponse } from "next/og";

export const runtime = "edge";

/**
 * GET /logo — generates a 512x512 logo image for Archtivy.
 * Used by Organization JSON-LD schema and anywhere a square logo is needed.
 * Google recommends min 112x112px for Organization logos.
 */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#002abf",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span
          style={{
            fontSize: 240,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.04em",
          }}
        >
          A
        </span>
      </div>
    ),
    {
      width: 512,
      height: 512,
    },
  );
}
