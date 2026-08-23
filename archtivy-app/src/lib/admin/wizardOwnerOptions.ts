import { searchProfilesForOwner } from "@/lib/db/profiles";
import type { WizardOwnerOption } from "@/components/add/wizard/adminContext";

/**
 * Candidate owner profiles for the admin wizard's owner picker.
 *
 * Wraps searchProfilesForOwner, which already applies the role rule — products
 * may only be owned by a brand, projects by a designer or a brand — and hides
 * hidden and username-less profiles.
 *
 * ── THE 100-ROW CAP IS INHERITED, AND DELIBERATE FOR NOW ────────────────────
 * searchProfilesForOwner limits to 100. Passing an empty term means "the first
 * 100 alphabetically", which is what the legacy admin form did, so this is not
 * a regression — but it is a ceiling. If the roster outgrows it the picker
 * needs to become a search rather than a select, and this function plus
 * OwnerField are the two places that change.
 */
export async function getWizardOwnerOptions(
  type: "project" | "product"
): Promise<WizardOwnerOption[]> {
  const { data, error } = await searchProfilesForOwner("", type);
  if (error || !data) return [];
  return data.map((p) => ({
    id: p.id,
    // A profile with no display name still has to be pickable, so fall back to
    // the username rather than rendering a blank option.
    label: p.display_name?.trim() || p.username?.trim() || "Untitled profile",
    sub: p.username?.trim() || null,
  }));
}
