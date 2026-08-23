/**
 * External URLs entered by users.
 *
 * ── THE 404 THIS EXISTS TO PREVENT ──────────────────────────────────────────
 * Website fields are free text. People type "archtivy.com", not
 * "https://archtivy.com" — and neither the product wizard nor the profile
 * editor has ever required a scheme or validated the value on submit.
 *
 * A schemeless value in an href is not a broken link, it is a RELATIVE one:
 *
 *   <a href="archtivy.com">  on  /products/furniture/seating/nena
 *   →  /products/furniture/seating/nena/archtivy.com  →  404
 *
 * which is exactly what "Visit Official Website" was doing. The link looked
 * fine, pointed somewhere plausible, and 404'd — the worst shape of broken,
 * because nothing about it reads as wrong until it is clicked.
 *
 * jsonld.ts already defended against this for `sameAs`, inline and alone. That
 * one call site being correct while every rendered link was not is the reason
 * this is now a shared helper rather than a second copy of the same ternary.
 */

/** Schemes we will emit into an href. Anything else is rejected outright. */
const SAFE_PROTOCOLS = new Set(["http:", "https:"]);

/**
 * Normalise a user-entered website into an absolute, safe URL — or null.
 *
 * Returns null rather than a best guess when the value cannot be made into a
 * usable link, so callers can decline to render the button at all. A dead
 * button is worse than no button: it promises a destination and spends a click
 * to disprove it.
 *
 * Rejects javascript:, data:, mailto: and friends. `javascript:alert(1)` parses
 * as a valid URL, so protocol checking is not optional — without it this helper
 * would launder an XSS vector into an href.
 */
export function normaliseExternalUrl(raw: string | null | undefined): string | null {
  const value = (raw ?? "").trim();
  if (!value) return null;

  // A bare "//example.com" is protocol-relative and resolves against the
  // current page's scheme. Harmless in practice, but normalising it here keeps
  // every returned value fully absolute.
  const candidate = /^\/\//.test(value)
    ? `https:${value}`
    : /^[a-z][a-z0-9+.-]*:/i.test(value)
      ? value
      : `https://${value}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }

  if (!SAFE_PROTOCOLS.has(parsed.protocol)) return null;
  // "https://" alone parses successfully with an empty hostname.
  if (!parsed.hostname) return null;
  // A hostname with no dot is not a public site — it is almost always a typo
  // or a local name, and linking to it externally cannot work.
  if (!parsed.hostname.includes(".")) return null;

  return parsed.toString();
}

/** Hostname without "www.", for showing a link's destination compactly. */
export function externalUrlLabel(raw: string | null | undefined): string | null {
  const url = normaliseExternalUrl(raw);
  if (!url) return null;
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}
