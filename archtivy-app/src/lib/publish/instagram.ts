/**
 * Instagram handles are stored bare, lowercase, no '@', no URL — matching the
 * CHECK on listings.instagram (migration 20260810).
 *
 * Lives here rather than in createProject.ts because that file carries
 * "use server": every export from a server-action module must be an async
 * function, so a plain helper exported from it fails the build.
 *
 * Accepts what people actually paste — a full profile URL, an @handle, or the
 * bare handle — and returns null when it is not recoverable, so the caller can
 * say something useful instead of surfacing a constraint violation.
 */
export function normaliseInstagramHandle(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const fromUrl = raw.match(/instagram\.com\/([^/?#]+)/i);
  const candidate = (fromUrl ? fromUrl[1] : raw).replace(/^@/, "").trim().toLowerCase();
  return /^[a-z0-9._]{1,30}$/.test(candidate) ? candidate : null;
}
