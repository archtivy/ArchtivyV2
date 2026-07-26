/**
 * Maintenance gate.
 *
 * Explicit opt-in via the MAINTENANCE_MODE env var. It is OFF unless the
 * variable is set to "1" or "true".
 *
 * It is deliberately NOT keyed on VERCEL_ENV: gating on the environment made
 * maintenance mode permanently on in production, which redirected every public
 * URL to "/" and would de-index the entire site (see TECHNICAL_SEO_AUDIT.md C-5).
 *
 * When enabled, middleware answers with 503 + Retry-After + X-Robots-Tag: noindex
 * rather than a 307 to "/". A 503 tells search engines to hold the index and come
 * back later; a redirect to "/" tells them every page is a duplicate of the homepage.
 */
export function isMaintenanceMode(): boolean {
  const raw = process.env.MAINTENANCE_MODE?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}

/** Seconds search engines and browsers should wait before retrying during maintenance. */
export const MAINTENANCE_RETRY_AFTER_SECONDS = 3600;
