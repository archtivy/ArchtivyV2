/**
 * Allowlist for avatar URLs in admin Users UI only.
 * next/image requires allowed hostnames; external/unconfigured hosts cause runtime errors.
 */
const BLOCKED_HOST_SUBSTRING = "archinect.gumlet.io";

const ALLOWED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "archtivy.com",
]);

function getSiteHost(): string | null {
  const u = process.env.NEXT_PUBLIC_SITE_URL;
  if (typeof u !== "string" || !u.trim()) return null;
  try {
    const url = new URL(u.startsWith("http") ? u : `https://${u}`);
    const host = url.hostname?.toLowerCase();
    return host || null;
  } catch {
    return null;
  }
}

/** True if url is safe to pass to next/image in admin users UI (same-origin or allowlisted host). */
export function isAllowedAvatarUrl(url: string | null | undefined): boolean {
  const s = typeof url === "string" ? url.trim() : "";
  if (!s) return false;
  if (s.includes(BLOCKED_HOST_SUBSTRING)) return false;
  if (s.startsWith("/")) return true;
  try {
    const parsed = new URL(s);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname?.toLowerCase();
    if (!host) return false;
    if (ALLOWED_HOSTS.has(host)) return true;
    const siteHost = getSiteHost();
    if (siteHost && host === siteHost) return true;
    return false;
  } catch {
    return false;
  }
}
