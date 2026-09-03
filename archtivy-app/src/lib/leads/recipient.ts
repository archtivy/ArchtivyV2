import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/**
 * Who, if anyone, can receive a listing's enquiry IN THE APP.
 *
 * ── WHY A SYNTHETIC ID IS NOT A RECIPIENT ───────────────────────────────────
 * Most brand profiles were created by the catalogue import, and the importer
 * wrote a placeholder into profiles.clerk_user_id of the form
 * `archtivy_internal_<uuid>`. It looks exactly like an owner. It is not a
 * Clerk account, nobody can sign in as it, and nothing addressed to it will
 * ever be read.
 *
 * Measured 2026-09-02 across the 80 approved products: 79 have an owner
 * profile, and 14 of the 16 owning brand profiles carry a synthetic id —
 * Molteni&C (12 products), Flexform (10), 5A Design, Barausse, Ross Gardam,
 * LEDS C4, De Sede, Focus, Lunawood, Siller, Metadecor, General Shale,
 * Zanotta, VOLA. Only Bonnet Studio (6) and Archtivy (2) resolve to real Clerk
 * users. So 72 of 80 products have no reachable in-app owner, and a resolver
 * that trusted clerk_user_id would file most of the catalogue's enquiries
 * against accounts that cannot be logged into.
 *
 * claim_status is deliberately NOT part of the test: no brand profile is
 * 'claimed' today, so requiring it would make the entire catalogue
 * undeliverable. Reachability is the question here; ownership verification is
 * a separate one.
 */

/** Placeholder ids written by the catalogue importer. Never a real account. */
const SYNTHETIC_PREFIX = "archtivy_internal_";

export function isRealClerkUserId(id: string | null | undefined): boolean {
  const v = (id ?? "").trim();
  if (!v) return false;
  if (v.startsWith(SYNTHETIC_PREFIX)) return false;
  // Clerk mints `user_...`. Anything else is not something we got from Clerk.
  return v.startsWith("user_");
}

export interface LeadRecipient {
  /** The owning profile, when one exists — set even when not deliverable. */
  profileId: string | null;
  /** Set only when in-app delivery is possible. */
  clerkUserId: string | null;
  displayName: string | null;
  deliverable: boolean;
  /** Why not, for the admin review screen. Null when deliverable. */
  reason: string | null;
}

/**
 * Resolve a listing's in-app recipient from CANONICAL OWNERSHIP only.
 *
 * Never takes a recipient from client input — the only argument is a listing
 * id; everything else is read from the database on the server.
 */
export async function resolveLeadRecipient(listingId: string): Promise<LeadRecipient> {
  const sup = getSupabaseServiceClient();

  const { data: listingRow } = await sup
    .from("listings")
    .select("id, owner_profile_id, owner_clerk_user_id")
    .eq("id", listingId)
    .is("deleted_at", null)
    .maybeSingle();

  const listing = listingRow as {
    owner_profile_id: string | null;
    owner_clerk_user_id: string | null;
  } | null;

  if (!listing) {
    return {
      profileId: null,
      clerkUserId: null,
      displayName: null,
      deliverable: false,
      reason: "The listing no longer exists.",
    };
  }

  if (!listing.owner_profile_id) {
    return {
      profileId: null,
      clerkUserId: null,
      displayName: null,
      deliverable: false,
      reason: "This listing has no owner profile.",
    };
  }

  const { data: profileRow } = await sup
    .from("profiles")
    .select("id, display_name, username, clerk_user_id, owner_user_id")
    .eq("id", listing.owner_profile_id)
    .maybeSingle();

  const profile = profileRow as {
    id: string;
    display_name: string | null;
    username: string | null;
    clerk_user_id: string | null;
    owner_user_id: string | null;
  } | null;

  if (!profile) {
    return {
      profileId: null,
      clerkUserId: null,
      displayName: null,
      deliverable: false,
      reason: "The owner profile no longer exists.",
    };
  }

  const displayName = profile.display_name?.trim() || profile.username?.trim() || null;

  /*
   * Three candidates, in order of how directly they assert ownership. The
   * first REAL Clerk id wins; a synthetic one does not disqualify the next
   * candidate from being tried.
   */
  const candidate =
    [listing.owner_clerk_user_id, profile.clerk_user_id, profile.owner_user_id].find(
      isRealClerkUserId
    ) ?? null;

  if (!candidate) {
    return {
      profileId: profile.id,
      clerkUserId: null,
      displayName,
      deliverable: false,
      reason: "This profile does not currently have a reachable account.",
    };
  }

  return {
    profileId: profile.id,
    clerkUserId: candidate,
    displayName,
    deliverable: true,
    reason: null,
  };
}
