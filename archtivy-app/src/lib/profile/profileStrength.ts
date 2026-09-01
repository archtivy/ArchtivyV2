import type { Profile } from "@/lib/types/profiles";

/**
 * Profile completeness, scored ONLY from columns that exist.
 *
 * ── WHAT THE REFERENCE SCORES THAT WE CANNOT ────────────────────────────────
 * The mockup's checklist is Profile information · Profile picture · Cover image
 * · Add team members. Two of those cannot be scored honestly:
 *
 *   Cover image   `profiles` has no cover column. The hero on a public profile
 *                 is derived from the owner's first published listing (see
 *                 lib/db/profilePage). Scoring it would mean marking a box the
 *                 owner has no control over — it ticks itself the moment they
 *                 publish anything, and nothing they can do in Edit Profile
 *                 changes it.
 *   About         Not a separate field. `bio` is rendered BOTH as the short
 *                 intro under the cover and as the About body, so scoring both
 *                 would award two points for typing once.
 *
 * Everything below maps to exactly one real column, and each item names the
 * field it checks so the score can be explained rather than trusted.
 *
 * Team members is scored from a COUNT passed in by the caller — it lives in
 * listing_team_members, not on the profile — and is skipped entirely for a
 * profile with no listings, where "add team members" is not yet an action the
 * owner can take.
 */

export interface StrengthItem {
  id: string;
  label: string;
  done: boolean;
  /** Where the owner goes to satisfy it. */
  href: string;
}

export interface ProfileStrength {
  percent: number;
  items: StrengthItem[];
  complete: boolean;
}

export function computeProfileStrength(
  profile: Profile,
  opts: { listingCount: number; teamMemberCount: number }
): ProfileStrength {
  const filled = (v: string | null | undefined) => Boolean(v && v.trim());
  const editHref = "/me/profile";

  const items: StrengthItem[] = [
    {
      id: "name",
      label: "Profile information",
      // display_name is NOT NULL, so the meaningful half of "information" is
      // the role detail beside it: a discipline for a designer, a type for a
      // brand. A reader has neither and is credited for the name alone.
      done:
        filled(profile.display_name) &&
        (profile.role === "designer"
          ? filled(profile.designer_discipline)
          : profile.role === "brand"
            ? filled(profile.brand_type)
            : true),
      href: editHref,
    },
    { id: "avatar", label: "Profile picture", done: filled(profile.avatar_url), href: editHref },
    { id: "bio", label: "Bio", done: filled(profile.bio), href: editHref },
    {
      id: "location",
      label: "Location",
      done: filled(profile.location_place_name) || filled(profile.location_city) || filled(profile.location_country),
      href: editHref,
    },
    {
      id: "links",
      label: "Website or social links",
      done:
        filled(profile.website) ||
        filled(profile.instagram) ||
        filled(profile.linkedin) ||
        // `behance` is a real column that the Profile type does not yet name —
        // widened here the way the rest of the codebase reads late-added
        // columns, so this branch does not depend on the type fix landing
        // first. 0 of 200 rows populate it, so it changes no score today.
        filled((profile as { behance?: string | null }).behance),
      href: editHref,
    },
  ];

  // Only asked of a profile that has something to credit people on.
  if (opts.listingCount > 0) {
    items.push({
      id: "team",
      label: "Credit your team",
      done: opts.teamMemberCount > 0,
      href: "/me/listings",
    });
  }

  const done = items.filter((i) => i.done).length;
  return {
    percent: items.length === 0 ? 0 : Math.round((done / items.length) * 100),
    items,
    complete: done === items.length,
  };
}
