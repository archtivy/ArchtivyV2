import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export type LeadStatus = "pending" | "approved" | "rejected";

/**
 * What shape of request this is.
 *
 * Quote requests reuse `leads` rather than getting their own table: the
 * pipeline — pending → admin review → forward to owner — is identical, and a
 * parallel table would mean a second status enum, moderation screen and
 * forwarding path to keep in step. See migration 20260823100000.
 */
export type LeadKind = "contact" | "quote";

export interface LeadRow {
  id: string;
  listing_id: string;
  listing_type: string | null;
  listing_title: string;
  listing_owner_email: string | null;
  sender_name: string;
  sender_email: string;
  sender_company: string | null;
  message: string;
  status: LeadStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  ip_hash: string | null;
  user_agent: string | null;
  /** 'contact' (general enquiry) or 'quote' (product quote request). */
  kind: LeadKind;
  quantity: string | null;
  project_name: string | null;
  location: string | null;
  desired_timeline: string | null;
  idempotency_key: string | null;
}

export interface InsertLeadInput {
  listing_id: string;
  listing_type: string | null;
  listing_title: string;
  listing_owner_email: string | null;
  sender_name: string;
  sender_email: string;
  sender_company: string | null;
  message: string;
  ip_hash?: string | null;
  user_agent?: string | null;
  /** Defaults to 'contact' to match every row written before quotes existed. */
  kind?: LeadKind;
  quantity?: string | null;
  project_name?: string | null;
  location?: string | null;
  desired_timeline?: string | null;
  idempotency_key?: string | null;
}

export async function insertLead(
  input: InsertLeadInput
): Promise<{ id: string; duplicate?: boolean } | { error: string }> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("leads")
    .insert({
      listing_id: input.listing_id,
      listing_type: input.listing_type ?? null,
      listing_title: input.listing_title.trim(),
      listing_owner_email: input.listing_owner_email?.trim() || null,
      sender_name: input.sender_name.trim(),
      sender_email: input.sender_email.trim(),
      sender_company: input.sender_company?.trim() || null,
      message: input.message.trim(),
      status: "pending",
      ip_hash: input.ip_hash ?? null,
      user_agent: input.user_agent ?? null,
      kind: input.kind ?? "contact",
      quantity: input.quantity?.trim() || null,
      project_name: input.project_name?.trim() || null,
      location: input.location?.trim() || null,
      desired_timeline: input.desired_timeline?.trim() || null,
      idempotency_key: input.idempotency_key?.trim() || null,
    })
    .select("id")
    .single();

  if (error) {
    // 23505 on the partial unique index means this exact submission already
    // landed — a double-click, a retry, or a refresh-and-resend. Return the
    // original row instead of a duplicate, and instead of an error: from the
    // requester's side the request WAS received, and telling them otherwise
    // invites them to send a third.
    if (error.code === "23505" && input.idempotency_key) {
      const { data: existing } = await sup
        .from("leads")
        .select("id")
        .eq("idempotency_key", input.idempotency_key)
        .maybeSingle();
      if (existing) return { id: (existing as { id: string }).id, duplicate: true };
    }
    return { error: error.message };
  }
  return { id: (data as { id: string }).id };
}

export async function getLeads(options: {
  status?: LeadStatus | null;
  limit?: number;
}): Promise<LeadRow[]> {
  const sup = getSupabaseServiceClient();
  let q = sup.from("leads").select("*").order("created_at", { ascending: false });
  if (options.status) q = q.eq("status", options.status);
  q = q.limit(options.limit ?? 100);
  const { data, error } = await q;
  if (error) return [];
  return (data ?? []) as LeadRow[];
}

export async function getLeadById(id: string): Promise<LeadRow | null> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup.from("leads").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return data as LeadRow;
}

export async function updateLeadStatus(
  id: string,
  status: "approved" | "rejected",
  reviewedBy: string
): Promise<{ ok: true } | { error: string }> {
  const sup = getSupabaseServiceClient();
  const { error } = await sup
    .from("leads")
    .update({
      status,
      reviewed_at: new Date().toISOString(),
      reviewed_by_clerk_user_id: reviewedBy, // ✅ write Clerk id to text column
      // reviewed_by stays untouched (uuid column)
    })
    .eq("id", id);

  if (error) return { error: error.message };
  return { ok: true };
}

/** Fetch listing id, type, title and owner_clerk_user_id / owner_profile_id for lead creation. */
export async function getListingForLead(listingId: string): Promise<{
  id: string;
  type: string;
  title: string;
  owner_clerk_user_id: string | null;
  owner_profile_id: string | null;
} | null> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("listings")
    .select("id, type, title, owner_clerk_user_id, owner_profile_id")
    .eq("id", listingId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as {
    id: string;
    type: string;
    title: string | null;
    owner_clerk_user_id: string | null;
    owner_profile_id: string | null;
  };
  return {
    id: row.id,
    type: row.type ?? "project",
    title: row.title?.trim() || "Listing",
    owner_clerk_user_id: row.owner_clerk_user_id ?? null,
    owner_profile_id: row.owner_profile_id ?? null,
  };
}
