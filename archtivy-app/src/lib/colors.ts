/**
 * Shared color options and swatch map for product forms and tagging workstation.
 */

export const COLOR_OPTIONS = [
  "Black",
  "White",
  "Gray",
  "Silver",
  "Brown",
  "Beige",
  "Wood",
  "Natural",
  "Blue",
  "Green",
  "Red",
  "Yellow",
  "Orange",
  "Brass",
  "Copper",
  "Gold",
  "Chrome",
  "Other",
] as const;

export type ColorOption = (typeof COLOR_OPTIONS)[number];

export const COLOR_SWATCH: Record<string, string> = {
  Black: "#1a1a1a",
  White: "#f5f5f5",
  Gray: "#737373",
  Silver: "#c0c0c0",
  Brown: "#6b4423",
  Beige: "#d4b896",
  Wood: "#c19a6b",
  Natural: "#e8dcc4",
  Blue: "#2563eb",
  Green: "#16a34a",
  Red: "#dc2626",
  Yellow: "#eab308",
  Orange: "#ea580c",
  Brass: "#b5a642",
  Copper: "#b87333",
  Gold: "#ca8a04",
  Chrome: "#e5e5e5",
  Other: "#94a3b8",
};

export function getColorSwatch(color: string): string {
  return COLOR_SWATCH[color] ?? "#94a3b8";
}
