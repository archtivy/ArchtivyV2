import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * The browser-tab icon.
 *
 * ── WHY THIS FILE AND NOT A NEW ASSET ───────────────────────────────────────
 * There was no favicon at all: no favicon.ico, no icon.png, no `icons` entry in
 * the root metadata, and public/ is empty — so every tab showed the browser's
 * generic page glyph. The one brand mark that already exists is app/logo, an
 * ImageResponse route drawing "A" on the brand blue at 512x512 for the
 * Organization JSON-LD.
 *
 * This is that same mark, at icon size, through App Router's file convention:
 * `app/icon.tsx` is picked up automatically and emitted as <link rel="icon">,
 * so no metadata wiring and no duplicated image file. One mark, two sizes.
 *
 * ── SIZE-SPECIFIC, NOT A SCALED COPY ────────────────────────────────────────
 * /logo's letter is 240px inside 512 — 47% of the box. Reproduced literally at
 * 32px that is a 15px glyph with 8px of padding, which reads as a dot. The
 * proportion is set for the size it renders at instead: the letter fills the
 * tile, which is how a favicon stays legible at 16px.
 */
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
          backgroundColor: "#002abf",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span
          style={{
            fontSize: 26,
            fontWeight: 700,
            color: "#ffffff",
            letterSpacing: "-0.04em",
          }}
        >
          A
        </span>
      </div>
    ),
    size
  );
}
