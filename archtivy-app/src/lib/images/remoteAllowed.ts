/**
 * Is this URL something `next/image` will actually accept?
 *
 * ── WHY A GUARD RATHER THAN A WIDER ALLOWLIST ───────────────────────────────
 * `next/image` does not degrade when handed a host missing from
 * `remotePatterns` — it throws, and because the image renders inside a server
 * component the throw takes the whole page with it. Three rows in the database
 * carry such a URL today (two profile avatars scraped from studio sites, one
 * listing cover still pointing at localhost:3000), and any page unlucky enough
 * to include one of them returns a 500. That is the standing failure on
 * /designers, and it reached universal search the moment search could return a
 * designer.
 *
 * Widening `remotePatterns` would fix the symptom by opting the image
 * optimiser into fetching from hosts nobody has vetted, which is a decision
 * about bandwidth and trust rather than about this bug. Dropping the image
 * costs one avatar and keeps the page up.
 *
 * The allowlist below mirrors next.config.mjs. It has to be kept in step by
 * hand; the alternative is importing the config into the runtime bundle, which
 * is worse. A host present in the config but absent here loses an image it
 * could have shown — a visible, harmless failure, and the safe direction for
 * this to be wrong in.
 */

/** Mirrors `images.remotePatterns` in next.config.mjs. */
const ALLOWED_HOSTS: (string | RegExp)[] = [
  /\.supabase\.co$/,
  "img.clerk.com",
  /\.clerk\.accounts\.dev$/,
  "archtivy.com",
  "localhost",
];

export function isRenderableImageUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Relative and data URLs bypass remotePatterns entirely.
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("data:")) return true;

  let host: string;
  try {
    host = new URL(trimmed).hostname;
  } catch {
    // Not a URL at all. Whatever it is, it is not something to hand an
    // optimiser that throws on surprises.
    return false;
  }

  return ALLOWED_HOSTS.some((p) => (typeof p === "string" ? host === p : p.test(host)));
}

/** The URL when it is renderable, and null when it is not. */
export function renderableImageUrl(url: string | null | undefined): string | null {
  return isRenderableImageUrl(url) ? (url as string).trim() : null;
}
