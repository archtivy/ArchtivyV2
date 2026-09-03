import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { createNotification } from "@/lib/db/notifications";
import { resolveLeadRecipient } from "@/lib/leads/recipient";
import type { LeadRow } from "@/lib/db/leads";

/**
 * Turn an approved lead into a conversation in the recipient's inbox.
 *
 * ── THE IDEMPOTENCY, IN DETAIL ──────────────────────────────────────────────
 * There is no multi-statement transaction available through PostgREST, so the
 * safety comes from a COMPARE-AND-SWAP on a column that can only be claimed
 * once, plus a partial unique index behind it:
 *
 *   1. build the conversation, participants and first message
 *   2. UPDATE leads SET conversation_id = <new> WHERE id = <lead>
 *        AND conversation_id IS NULL AND status = 'pending'   -- the CAS
 *   3. no row came back?  someone else already delivered this lead:
 *        delete the conversation we just built and report `already`.
 *        ON DELETE CASCADE takes its participants and message with it, so a
 *        loser leaves nothing behind.
 *   4. a row came back?  we hold the only claim. Notify and approve.
 *
 * The conversation is fully built BEFORE the claim, so winning the CAS means
 * the thread is already complete — a lead can never end up pointing at an
 * empty conversation. Two admins clicking Approve at the same moment produce
 * exactly one conversation, one message and one notification; the second gets
 * `already` and no duplicate.
 *
 * A disabled button is not part of this. Server actions are endpoints.
 */

export type DeliveryOutcome =
  | { kind: "delivered"; conversationId: string; recipientProfileId: string }
  | { kind: "already"; conversationId: string }
  | { kind: "not_deliverable"; reason: string; recipientProfileId: string | null }
  | { kind: "error"; error: string };

export async function deliverLeadToInbox(lead: LeadRow): Promise<DeliveryOutcome> {
  const sup = getSupabaseServiceClient();

  // Already delivered — the cheap check before doing any work. The CAS below
  // is what actually makes it safe; this only avoids the wasted writes.
  const existing = (lead as LeadRow & { conversation_id?: string | null }).conversation_id;
  if (existing) return { kind: "already", conversationId: existing };

  /*
   * Resolved AGAIN here, on the server, at approval time — not read from the
   * lead row and never from anything the requester or the admin's browser
   * sent. Ownership can change between submission and review.
   */
  const recipient = await resolveLeadRecipient(lead.listing_id);
  if (!recipient.deliverable || !recipient.profileId) {
    return {
      kind: "not_deliverable",
      reason: recipient.reason ?? "No reachable account for this listing.",
      recipientProfileId: recipient.profileId,
    };
  }

  const requesterProfileId =
    (lead as LeadRow & { requester_profile_id?: string | null }).requester_profile_id ?? null;
  if (!requesterProfileId) {
    return {
      kind: "not_deliverable",
      reason:
        "This request predates authenticated submission and has no Archtivy sender profile, so it cannot become a conversation.",
      recipientProfileId: recipient.profileId,
    };
  }

  if (requesterProfileId === recipient.profileId) {
    return {
      kind: "not_deliverable",
      reason: "The requester owns this listing; there is nobody to deliver to.",
      recipientProfileId: recipient.profileId,
    };
  }

  const now = new Date().toISOString();

  // ── 1. the thread ─────────────────────────────────────────────────────────
  const { data: convRow, error: convErr } = await sup
    .from("conversations")
    .insert({
      context_type: "product_request",
      subject_listing_id: lead.listing_id,
      last_message_at: lead.created_at,
    })
    .select("id")
    .single();
  if (convErr || !convRow) {
    return { kind: "error", error: convErr?.message ?? "Could not create the conversation." };
  }
  const conversationId = (convRow as { id: string }).id;

  /** Undo everything on any failure after this point. Cascade does the rest. */
  const rollback = async () => {
    await sup.from("conversations").delete().eq("id", conversationId);
  };

  // ── 2. participants ───────────────────────────────────────────────────────
  const { error: partErr } = await sup.from("conversation_participants").insert([
    // The sender has read what they wrote; only the recipient starts unread.
    { conversation_id: conversationId, profile_id: requesterProfileId, role: "sender", last_read_at: now },
    { conversation_id: conversationId, profile_id: recipient.profileId, role: "recipient", last_read_at: null },
  ]);
  if (partErr) {
    await rollback();
    return { kind: "error", error: partErr.message };
  }

  // ── 3. the message, exactly as submitted ──────────────────────────────────
  // created_at is the lead's own timestamp, so the thread is dated when the
  // person wrote it rather than when an admin got round to it.
  const { error: msgErr } = await sup.from("messages").insert({
    conversation_id: conversationId,
    sender_profile_id: requesterProfileId,
    body: lead.message,
    created_at: lead.created_at,
  });
  if (msgErr) {
    await rollback();
    return { kind: "error", error: msgErr.message };
  }

  // ── 4. THE CLAIM ──────────────────────────────────────────────────────────
  const { data: claimed, error: claimErr } = await sup
    .from("leads")
    .update({
      conversation_id: conversationId,
      recipient_profile_id: recipient.profileId,
    })
    .eq("id", lead.id)
    .is("conversation_id", null)
    .eq("status", "pending")
    .select("id");
  if (claimErr) {
    await rollback();
    return { kind: "error", error: claimErr.message };
  }
  if (!claimed || claimed.length === 0) {
    // Lost the race, or the lead stopped being pending underneath us.
    await rollback();
    const { data: fresh } = await sup
      .from("leads")
      .select("conversation_id")
      .eq("id", lead.id)
      .maybeSingle();
    const existingId = (fresh as { conversation_id: string | null } | null)?.conversation_id;
    if (existingId) return { kind: "already", conversationId: existingId };
    return { kind: "error", error: "This lead is no longer pending." };
  }

  // ── 5. notification, on the system that already exists ───────────────────
  const { data: requesterRow } = await sup
    .from("profiles")
    .select("display_name, username")
    .eq("id", requesterProfileId)
    .maybeSingle();
  const requesterName =
    (requesterRow as { display_name: string | null; username: string | null } | null)
      ?.display_name?.trim() ||
    (requesterRow as { username: string | null } | null)?.username ||
    lead.sender_name ||
    "Someone";

  await createNotification({
    recipient_profile_id: recipient.profileId,
    actor_profile_id: requesterProfileId,
    source: "system",
    event_type: "product_request",
    entity_type: "product",
    entity_id: lead.listing_id,
    title: "New product request",
    body: `${requesterName} sent a request about ${lead.listing_title}.`,
    cta_label: "View message",
    cta_url: `/me/messages/${conversationId}`,
  });

  return { kind: "delivered", conversationId, recipientProfileId: recipient.profileId };
}
