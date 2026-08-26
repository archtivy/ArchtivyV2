/**
 * One function for "profile row -> ProjectOwner". Previously there were three.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * The same conversion was implemented separately in lib/db/explore.ts,
 * lib/db/networkFeed.ts, and inline inside the two directory fetchers. They
 * agreed on the interesting part — display name with a username fallback — and
 * disagreed on the boring part: whether the avatar was carried at all.
 *
 * That disagreement produced three separate bugs, found on three separate days:
 *
 *   · explore project cards had no owner logo (avatarUrl hardcoded null)
 *   · /products cards had no brand logo (avatar_url absent from the select)
 *   · the homepage network feed had no logo either (hardcoded null again)
 *
 * Each was a one-line fix, and finding each one cost far more than the fix. The
 * clones were the bug; the missing column was just how it showed up. Collapsing
 * them removes the whole class rather than patching instances.
 *
 * ── THE COLUMNS THIS NEEDS ──────────────────────────────────────────────────
 * `avatar_url` is OPTIONAL on the input type on purpose, so a caller whose
 * select omits it still compiles — but it will render a card with no logo. If
 * you are adding a caller and the surface shows an owner, make sure the select
 * includes avatar_url. That single omission is three of the six known instances
 * of the near-duplicate-path pattern in this codebase.
 */

import type { ProjectOwner } from "@/lib/canonical-models";

export interface OwnerProfileRow {
  id: string;
  display_name?: string | null;
  username?: string | null;
  /** Required for any surface that renders a logo or avatar. See note above. */
  avatar_url?: string | null;
}

/**
 * Returns null when the row has no usable name — a nameless owner is not worth
 * rendering a byline for, and every caller previously dropped it anyway, just
 * with its own slightly different check.
 */
export function toOwner(row: OwnerProfileRow | null | undefined): ProjectOwner | null {
  if (!row) return null;
  const displayName = row.display_name?.trim() || row.username?.trim() || "";
  if (!displayName) return null;
  return {
    displayName,
    avatarUrl: row.avatar_url?.trim() || null,
    profileId: row.id,
    username: row.username?.trim() || null,
  };
}

/** Batch helper: id -> owner, skipping rows with no usable name. */
export function toOwnerMap(rows: readonly OwnerProfileRow[] | null | undefined): Map<string, ProjectOwner> {
  const map = new Map<string, ProjectOwner>();
  for (const row of rows ?? []) {
    const owner = toOwner(row);
    if (owner) map.set(row.id, owner);
  }
  return map;
}
