import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { PlacementType } from "./config";

export interface PromotionCampaign {
  id: string;
  user_id: string;
  profile_id: string | null;
  listing_id: string;
  placement_type: PlacementType;
  duration_days: number;
  price_cents: number;
  status: "pending" | "active" | "expired" | "cancelled";
  starts_at: string | null;
  ends_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get all active campaigns for a placement type.
 * Only returns campaigns that are currently within their active window.
 */
export async function getActiveCampaigns(
  placement: PlacementType
): Promise<PromotionCampaign[]> {
  const sup = getSupabaseServiceClient();
  const now = new Date().toISOString();
  const { data, error } = await sup
    .from("promotion_campaigns")
    .select("*")
    .eq("placement_type", placement)
    .eq("status", "active")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[campaigns] getActiveCampaigns error:", error.message);
    return [];
  }
  return (data ?? []) as PromotionCampaign[];
}

/**
 * Get listing IDs that have an active homepage feature campaign.
 */
export async function getHomepagePromotedListingIds(): Promise<string[]> {
  const campaigns = await getActiveCampaigns("homepage_feature");
  return campaigns.map((c) => c.listing_id);
}

/**
 * Get listing IDs that have an active map spotlight campaign.
 */
export async function getMapSpotlightListingIds(): Promise<Set<string>> {
  const campaigns = await getActiveCampaigns("map_spotlight");
  return new Set(campaigns.map((c) => c.listing_id));
}

/**
 * Get campaigns for a specific user (for the promote dashboard).
 */
export async function getUserCampaigns(
  userId: string
): Promise<PromotionCampaign[]> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("promotion_campaigns")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[campaigns] getUserCampaigns error:", error.message);
    return [];
  }
  return (data ?? []) as PromotionCampaign[];
}

/**
 * Create a pending campaign and return its ID.
 */
export async function createPendingCampaign(params: {
  userId: string;
  profileId: string | null;
  listingId: string;
  placementType: PlacementType;
  durationDays: number;
  priceCents: number;
  stripeCheckoutSessionId: string;
}): Promise<string | null> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("promotion_campaigns")
    .insert({
      user_id: params.userId,
      profile_id: params.profileId,
      listing_id: params.listingId,
      placement_type: params.placementType,
      duration_days: params.durationDays,
      price_cents: params.priceCents,
      status: "pending",
      stripe_checkout_session_id: params.stripeCheckoutSessionId,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[campaigns] createPendingCampaign error:", error.message);
    return null;
  }
  return data?.id ?? null;
}

/**
 * Activate a campaign after successful payment.
 */
export async function activateCampaign(
  stripeCheckoutSessionId: string,
  paymentIntentId: string | null
): Promise<boolean> {
  const sup = getSupabaseServiceClient();
  const now = new Date();

  // Find the pending campaign
  const { data: campaign, error: findErr } = await sup
    .from("promotion_campaigns")
    .select("id, duration_days")
    .eq("stripe_checkout_session_id", stripeCheckoutSessionId)
    .eq("status", "pending")
    .maybeSingle();

  if (findErr || !campaign) {
    console.error("[campaigns] activateCampaign: campaign not found for session", stripeCheckoutSessionId, findErr?.message);
    return false;
  }

  const endsAt = new Date(now.getTime() + campaign.duration_days * 24 * 60 * 60 * 1000);

  const { error: updateErr } = await sup
    .from("promotion_campaigns")
    .update({
      status: "active",
      starts_at: now.toISOString(),
      ends_at: endsAt.toISOString(),
      stripe_payment_intent_id: paymentIntentId,
      updated_at: now.toISOString(),
    })
    .eq("id", campaign.id);

  if (updateErr) {
    console.error("[campaigns] activateCampaign: update error", updateErr.message);
    return false;
  }

  return true;
}
