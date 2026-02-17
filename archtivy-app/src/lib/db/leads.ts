import { getSupabaseServiceClient } from "@/lib/supabaseServer";

export type LeadStatus = "pending" | "approved" | "rejected";

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
  // NOTE: new column exists in DB; we don't have to add it here to fix the bug.
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
}

export async function insertLead(input: InsertLeadInput): Promise<{ id: string } | { error: string }> {
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
    })
    .select("id")
    .single();

  if (error) return { error: error.message };
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
