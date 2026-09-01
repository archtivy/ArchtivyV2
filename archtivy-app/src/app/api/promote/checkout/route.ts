import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getStripe } from "@/lib/stripe/server";
import { getProfileByClerkId } from "@/lib/db/profiles";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getPrice, PLACEMENT_LABELS, type PlacementType, type DurationDays } from "@/lib/promote/config";
import { createPendingCampaign } from "@/lib/promote/campaigns";
import { getBaseUrl } from "@/lib/canonical";
import { isFeatureListingEnabled } from "@/lib/db/siteSettings";

const VALID_PLACEMENTS: PlacementType[] = ["map_spotlight", "homepage_feature"];
const VALID_DURATIONS: DurationDays[] = [7, 14, 30];

/**
 * POST /api/promote/checkout
 * Body: { listingId, placement, duration }
 * Creates a Stripe Checkout session and a pending campaign row.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Feature gate
  const enabled = await isFeatureListingEnabled();
  if (!enabled) {
    return NextResponse.json({ error: "This feature is not available yet" }, { status: 403 });
  }

  const body = await request.json();
  const { listingId, placement, duration } = body as {
    listingId?: string;
    placement?: string;
    duration?: number;
  };

  // Validate inputs
  if (!listingId || !placement || !duration) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!VALID_PLACEMENTS.includes(placement as PlacementType)) {
    return NextResponse.json({ error: "Invalid placement type" }, { status: 400 });
  }
  if (!VALID_DURATIONS.includes(duration as DurationDays)) {
    return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
  }

  const placementType = placement as PlacementType;
  const durationDays = duration as DurationDays;
  const priceCents = getPrice(placementType, durationDays);
  if (priceCents <= 0) {
    return NextResponse.json({ error: "Invalid price" }, { status: 400 });
  }

  // Verify the listing belongs to the user
  const sup = getSupabaseServiceClient();
  const profileRes = await getProfileByClerkId(userId);
  const profileId = profileRes.data?.id ?? null;

  const { data: listing, error: listingErr } = await sup
    .from("listings")
    .select("id, title, type, owner_clerk_user_id, owner_profile_id")
    .eq("id", listingId)
    .maybeSingle();

  if (listingErr || !listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const isOwner =
    listing.owner_clerk_user_id === userId ||
    (profileId && listing.owner_profile_id === profileId);
  if (!isOwner) {
    return NextResponse.json({ error: "You do not own this listing" }, { status: 403 });
  }

  const baseUrl = getBaseUrl();
  const label = PLACEMENT_LABELS[placementType];

  // Create Stripe Checkout session
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 500 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: priceCents,
          product_data: {
            name: `${label.title} — ${durationDays} days`,
            description: `${label.description} Listing: ${listing.title}`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      listing_id: listingId,
      user_id: userId,
      profile_id: profileId ?? "",
      placement_type: placementType,
      duration_days: String(durationDays),
    },
    success_url: `${baseUrl}/me/tools?success=true`,
    cancel_url: `${baseUrl}/me/tools?cancelled=true`,
  });

  // Create pending campaign row
  await createPendingCampaign({
    userId,
    profileId,
    listingId,
    placementType,
    durationDays,
    priceCents,
    stripeCheckoutSessionId: session.id,
  });

  return NextResponse.json({ url: session.url });
}
