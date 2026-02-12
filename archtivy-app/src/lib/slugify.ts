/**
 * Deterministic slug builder for material display names.
 * Rules:
 * - lowercase
 * - trim
 * - replace '&' with 'and'
 * - replace '/' with '-'
 * - remove parentheses
 * - replace non-alphanumeric with single hyphen
 * - collapse multiple hyphens
 * - trim leading/trailing hyphen
 */
export function slugifyMaterialName(name: string): string {
  const trimmed = (name || "").trim().toLowerCase();
  const replaced = trimmed
    .replace(/&/g, "and")
    .replace(/\//g, "-")
    .replace(/[()]/g, "");
  const hyphenated = replaced.replace(/[^a-z0-9]+/g, "-");
  return hyphenated.replace(/-+/g, "-").replace(/^-|-$/g, "") || "material";
}
