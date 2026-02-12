/**
 * Normalize username for display/storage: lowercase, spaces to hyphens, remove invalid chars.
 * Valid chars: a-z, 0-9, hyphen. Length not enforced here.
 */
export function slugifyUsername(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const MIN_LENGTH = 3;
const MAX_LENGTH = 32;

export type UsernameValidation =
  | { ok: true; normalized: string }
  | { ok: false; error: string };

/**
 * Validate and normalize username: slugify then enforce length (3–32).
 */
export function validateUsername(raw: string): UsernameValidation {
  const normalized = slugifyUsername(raw);
  if (normalized.length < MIN_LENGTH) {
    return { ok: false, error: `Username must be at least ${MIN_LENGTH} characters.` };
  }
  if (normalized.length > MAX_LENGTH) {
    return { ok: false, error: `Username must be at most ${MAX_LENGTH} characters.` };
  }
  return { ok: true, normalized };
}
