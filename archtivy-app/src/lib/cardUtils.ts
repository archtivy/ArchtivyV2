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
 * City-only label for project cards: location_city, else first segment of location string.
 */
export function getCityLabel(project: {
  location?: { city?: string | null } | null;
  location_text?: string | null;
}): string | null {
  const city = project.location?.city?.trim();
  if (city) return city;
  const text = project.location_text?.trim();
  if (!text) return null;
  const first = text.split(",")[0]?.trim();
  return first || null;
}
