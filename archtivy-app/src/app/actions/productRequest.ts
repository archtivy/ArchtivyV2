"use server";

import { auth } from "@clerk/nextjs/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getListingForLead, insertLead } from "@/lib/db/leads";
import { resolveLeadRecipient } from "@/lib/leads/recipient";

/**
 * "Request Information" on a product page.
 *
 * ── WHY THIS EXISTS ALONGSIDE POST /api/leads ───────────────────────────────
 * That endpoint takes sender_name and sender_email straight from the request
 * body and never calls auth(). Anyone could post an enquiry as anyone. It is
 * left in place because the project contact form still uses it, but the
 * product request path does not go through it: identity here comes from the
 * Clerk session and from the profile that session owns, and nothing the
 * browser sends can change who the requester is.
 *
 * The first and last name fields ARE sent, and they are contact metadata only
 * — they land in `sender_name`, which is what a brand reads in the message
 * header. `requester_profile_id` is what the system trusts, and that is
 * resolved server-side.
 *
 * The RECIPIENT is never accepted from the client at all. It is resolved from
 * the listing's canonical ownership at approval time; this only records
 * whether one exists, so the admin queue can say so.
 */

const MIN_MESSAGE_LENGTH = 15;
const MAX_LINKS = 2;

export type ProductRequestResult = { ok: true } | { ok: false; error: string };

const text = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function submitProductRequest(
  listingId: string,
  formData: FormData
): Promise<ProductRequestResult> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "Please sign in to send a request." };

  const profileRes = await getProfileByClerkId(userId);
  const profile = profileRes.data as { id: string; display_name: string | null } | null;
  if (!profile?.id) {
    return {
      ok: false,
      error: "Your Archtivy profile is still being set up. Please try again in a moment.",
    };
  }

  const firstName = text(formData.get("first_name"));
  const lastName = text(formData.get("last_name"));
  const message = text(formData.get("message"));
  const idempotencyKey = text(formData.get("idempotency_key")) || null;

  if (!firstName) return { ok: false, error: "Please enter your first name." };
  if (message.length < MIN_MESSAGE_LENGTH) {
    return { ok: false, error: `Please write at least ${MIN_MESSAGE_LENGTH} characters.` };
  }
  if ((message.match(/https?:\/\/[^\s]+/gi) ?? []).length > MAX_LINKS) {
    return { ok: false, error: `Please include at most ${MAX_LINKS} links.` };
  }

  /* The listing is re-read here rather than trusted from the page that
     rendered the button: it must still exist, still be a product, and still be
     public. */
  const listing = await getListingForLead(listingId);
  if (!listing || listing.type !== "product") {
    return { ok: false, error: "This product is no longer available." };
  }
  const sup = getSupabaseServiceClient();
  const { data: statusRow } = await sup
    .from("listings")
    .select("status")
    .eq("id", listing.id)
    .maybeSingle();
  if ((statusRow as { status?: string } | null)?.status !== "APPROVED") {
    return { ok: false, error: "This product is no longer available." };
  }

  const recipient = await resolveLeadRecipient(listing.id);
  if (recipient.profileId && recipient.profileId === profile.id) {
    return { ok: false, error: "This is your own product." };
  }

  const senderName = [firstName, lastName].filter(Boolean).join(" ");

  const inserted = await insertLead({
    listing_id: listing.id,
    listing_type: listing.type,
    listing_title: listing.title,
    listing_owner_email: null, // filled by the existing email path at approval
    sender_name: senderName,
    /* sender_email is a NOT NULL column and predates authenticated senders.
       The authoritative identity is requester_profile_id; this stays a
       readable placeholder rather than a Clerk email copied into a table the
       admin queue exports. */
    sender_email: "",
    sender_company: null,
    message,
    kind: "contact",
    idempotency_key: idempotencyKey,
  });
  if ("error" in inserted) {
    return { ok: false, error: "Could not send your request. Please try again." };
  }

  /*
   * Written AFTER the insert rather than through insertLead, which is shared
   * with the anonymous endpoint and must not grow an auth-only parameter.
   * recipient_profile_id is recorded only when a real account exists — a
   * synthetic archtivy_internal_* owner leaves it null, which is what makes
   * the admin queue able to say "in-app delivery unavailable" before anyone
   * clicks Approve.
   */
  await sup
    .from("leads")
    .update({
      requester_profile_id: profile.id,
      recipient_profile_id: recipient.deliverable ? recipient.profileId : null,
    })
    .eq("id", inserted.id);

  return { ok: true };
}
