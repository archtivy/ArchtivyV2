import type { Config } from "tailwindcss";

/** Archtivy palette: accent-only (buttons, links, active states, focus rings). */
const archtivy = {
  dark: "#000029",
  "dark-alt": "#000051",
  primary: "#173DED",   // Primary button, links, active nav, focus ring
  bg: "#DCDEE2",
  muted: "#BABABA",
};

/**
 * Homepage editorial palette (Archtivy_Design_Tokens.md §1).
 *
 * ADDED, NOT SUBSTITUTED. The `archtivy` tokens above stay exactly as they are
 * and every existing page keeps rendering unchanged — replacing them globally
 * is a separate, deliberate migration. These four are scoped by convention to
 * the homepage: nothing outside src/components/home/ and the homepage route
 * should reference them until that migration happens.
 */
const editorial = {
  cream: "#F3F2EE", // primary page background — replaces "white" on the homepage
  stone: "#D9D3C8", // secondary surfaces, hover states, dividers, borders
  ink: "#161616", // primary text, primary buttons, wordmark — never pure black
  muted: "#6B6B68", // captions, metadata, secondary body text
  hairline: "#E4E1D9", // hairline dividers and card outlines
};

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        archtivy,
        ...editorial,
      },
      fontFamily: {
        // Display: Neue Haas Grotesk is licensed and unavailable, so this is the
        // fallback chain named in the tokens document itself.
        display: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
        // Body: Inter, loaded via next/font in app/layout.tsx.
        body: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      maxWidth: {
        // Tokens §5 — max content width, centred, never full-bleed except hero bands.
        content: "1440px",
      },
    },
  },
  plugins: [],
};
export default config;
