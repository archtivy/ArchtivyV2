import type { ProjectOwner } from "@/lib/canonical-models";

/**
 * Build profile URL: /u/[username] or /u/id/[profileId].
 * Used for "by {OwnerName}" links on listing cards.
 */
export function getOwnerProfileHref(owner: ProjectOwner | null | undefined): string | null {
  if (!owner) return null;
  if (owner.username?.trim()) return `/u/${encodeURIComponent(owner.username.trim())}`;
  if (owner.profileId?.trim()) return `/u/id/${owner.profileId.trim()}`;
  return null;
}

/**
 * City label for project surfaces: `location_city`, or nothing.
 *
 * ── WHY THE FREE-TEXT FALLBACK WAS REMOVED ──────────────────────────────────
 * This used to fall back to the first comma-segment of the free-text location.
 * On address-style entries that segment is a STREET, not a city. Measured
 * against production:
 *
 *   "Calle Santa Elena, Pérez Zeledón - San José, 11902, Costa Rica" -> street
 *   "Praça Do Príncipe Real, 1250-184 Lisboa, Lisbon, Portugal"      -> square
 *   "Oude Waalsdorperweg, 2597 HH Den Haag, Netherlands"             -> street
 *
 * Roughly two in five of the longest entries. The consequence was not only a
 * wrong label: the value is also used to build the `?city=` filter link, so
 * every one of those cards linked to a filter that matches nothing.
 *
 * Returning null instead means the caller shows country alone and omits the
 * link — less specific, but true, and never a dead end. `location_city` is
 * populated on only 7 of 53 live projects today; backfilling it is tracked as
 * its own follow-up, and this function starts working the moment it lands.
 */
export function getCityLabel(project: {
  location?: { city?: string | null } | null;
  location_text?: string | null;
}): string | null {
  return project.location?.city?.trim() || null;
}
