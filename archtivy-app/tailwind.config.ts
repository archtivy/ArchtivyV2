import type { Config } from "tailwindcss";

/** Archtivy palette: accent-only (buttons, links, active states, focus rings). */
const archtivy = {
  dark: "#000029",
  "dark-alt": "#000051",
  primary: "#173DED",   // Primary button, links, active nav, focus ring
  bg: "#DCDEE2",
  muted: "#BABABA",
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
      },
    },
  },
  plugins: [],
};
export default config;
