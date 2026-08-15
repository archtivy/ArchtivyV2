"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getProfileByClerkId } from "@/lib/db/profiles";
import type { VerificationStatus } from "@/lib/db/productTags";

/**
 * Product pin mutations. Server Actions, matching how every other entity in
 * this app is mutated.
 *
 * OWNERSHIP IS RE-CHECKED SERVER-SIDE ON EVERY CALL. The page already gates
 * access, but a Server Action is a public endpoint — the check here is the one
 * that counts, and it is done by reading the image's listing and comparing
 * owner_profile_id, never by trusting an id from the form.
 *
 * ── AI CONFIDENCE NEVER PROMOTES ────────────────────────────────────────────
 * There is no code path in this file where ai_confidence causes a status
 * change. An AI-sourced pin lands as `unverified` and can only reach `verified`
 * or `official` through confirmPin(), which requires a signed-in owner or
 * admin. That is the Database Bible's AI-suggestions-are-reviewable rule
 * enforced at the write path, not just in the UI.
 */

const pinSchema = z.object({
  listingImageId: z.string().uuid(),
  taggedListingId: z.string().uuid(),
  xPercent: z.number().min(0).max(100),
  yPercent: z.number().min(0).max(100),
});

export type PinResult = { ok: true; id: string } | { ok: false; error: string };

async function currentProfile() {
  const { userId } = await auth();
  if (!userId) return null;
  const result = await getProfileByClerkId(userId);
  return (result?.data ?? null) as { id: string; is_admin?: boolean } | null;
}

/** Returns the owning listing id when the caller may edit this image. */
async function assertCanEditImage(
  listingImageId: string,
  profileId: string,
  isAdmin: boolean
): Promise<{ ok: true; listingId: string; slug: string | null; type: string } | { ok: false; error: string }> {
  const sup = getSupabaseServiceClient();

  const { data: image, error } = await sup
    .from("listing_images")
    .select("id, listing_id")
    .eq("id", listingImageId)
    .maybeSingle();

  if (error || !image) return { ok: false, error: "Image not found." };

  const { data: listing } = await sup
    .from("listings")
    .select("id, slug, type, owner_profile_id, deleted_at")
    .eq("id", (image as { listing_id: string }).listing_id)
    .maybeSingle();

  if (!listing) return { ok: false, error: "Listing not found." };
  const l = listing as {
    id: string;
    slug: string | null;
    type: string;
    owner_profile_id: string | null;
    deleted_at: string | null;
  };
  if (l.deleted_at) return { ok: false, error: "Listing not found." };
  if (!isAdmin && l.owner_profile_id !== profileId) {
    return { ok: false, error: "You do not own this listing." };
  }
  return { ok: true, listingId: l.id, slug: l.slug, type: l.type };
}

async function writeAuditRow(params: {
  productTagId: string;
  action: "created" | "moved" | "status_changed" | "deleted";
  fromStatus?: VerificationStatus | null;
  toStatus?: VerificationStatus | null;
  actorProfileId: string | null;
  metadata?: Record<string, unknown>;
}) {
  const sup = getSupabaseServiceClient();
  const { error } = await sup.from("product_tag_audit_log").insert({
    product_tag_id: params.productTagId,
    action: params.action,
    from_status: params.fromStatus ?? null,
    to_status: params.toStatus ?? null,
    actor_profile_id: params.actorProfileId,
    actor_kind: "human",
    metadata: params.metadata ?? {},
  });
  // Checked and logged, never silent — the exact failure mode that hid the
  // missing audit_logs table for as long as it did.
  if (error) {
    console.error(
      `[productTags] audit write failed for ${params.action} on ${params.productTagId}: ` +
        `${error.code ?? "?"} ${error.message}`
    );
  }
}

function bust(type: string, slug: string | null, listingId: string) {
  revalidatePath(`/me/listings/${listingId}`);
  if (slug) revalidatePath(`/${type === "product" ? "products" : "projects"}/${slug}`);
}

/** Owner places a pin. Lands as `official` — the owner stating their own build. */
export async function createPin(input: unknown): Promise<PinResult> {
  const profile = await currentProfile();
  if (!profile) return { ok: false, error: "Sign in first." };

  const parsed = pinSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid pin." };
  }
  const v = parsed.data;

  const access = await assertCanEditImage(v.listingImageId, profile.id, profile.is_admin === true);
  if (!access.ok) return { ok: false, error: access.error };

  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("product_tags")
    .insert({
      listing_image_id: v.listingImageId,
      // The trigger overwrites this from the image's real owner; sent so the
      // NOT NULL constraint is satisfied on insert.
      listing_id: access.listingId,
      tagged_listing_id: v.taggedListingId,
      x_percent: v.xPercent,
      y_percent: v.yPercent,
      tag_source: "owner",
      // An owner tagging their own project is a first-party statement, not a
      // guess — so it is `official` on creation. AI-sourced pins are inserted
      // by the suggestion job as `unverified` and must be confirmed.
      verification_status: "official",
      created_by: profile.id,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return { ok: false, error: "That product is already pinned on this image." };
    return { ok: false, error: error.message };
  }

  const id = (data as { id: string }).id;
  await writeAuditRow({
    productTagId: id,
    action: "created",
    toStatus: "official",
    actorProfileId: profile.id,
    metadata: { x: v.xPercent, y: v.yPercent, source: "owner" },
  });
  bust(access.type, access.slug, access.listingId);
  return { ok: true, id };
}

/** Drag to reposition. Does not change verification state. */
export async function movePin(
  pinId: string,
  xPercent: number,
  yPercent: number
): Promise<PinResult> {
  const profile = await currentProfile();
  if (!profile) return { ok: false, error: "Sign in first." };
  if (xPercent < 0 || xPercent > 100 || yPercent < 0 || yPercent > 100) {
    return { ok: false, error: "Position out of range." };
  }

  const sup = getSupabaseServiceClient();
  const { data: pin } = await sup
    .from("product_tags")
    .select("id, listing_image_id")
    .eq("id", pinId)
    .maybeSingle();
  if (!pin) return { ok: false, error: "Pin not found." };

  const access = await assertCanEditImage(
    (pin as { listing_image_id: string }).listing_image_id,
    profile.id,
    profile.is_admin === true
  );
  if (!access.ok) return { ok: false, error: access.error };

  const { error } = await sup
    .from("product_tags")
    .update({ x_percent: xPercent, y_percent: yPercent })
    .eq("id", pinId);
  if (error) return { ok: false, error: error.message };

  await writeAuditRow({
    productTagId: pinId,
    action: "moved",
    actorProfileId: profile.id,
    metadata: { x: xPercent, y: yPercent },
  });
  bust(access.type, access.slug, access.listingId);
  return { ok: true, id: pinId };
}

/**
 * Confirm or reject an AI-suggested pin. The ONLY path from `unverified` to a
 * public status — nothing automatic ever reaches here.
 */
export async function reviewPin(
  pinId: string,
  decision: "confirm" | "reject"
): Promise<PinResult> {
  const profile = await currentProfile();
  if (!profile) return { ok: false, error: "Sign in first." };

  const sup = getSupabaseServiceClient();
  const { data: pin } = await sup
    .from("product_tags")
    .select("id, listing_image_id, verification_status")
    .eq("id", pinId)
    .maybeSingle();
  if (!pin) return { ok: false, error: "Pin not found." };

  const row = pin as { listing_image_id: string; verification_status: VerificationStatus };
  const access = await assertCanEditImage(row.listing_image_id, profile.id, profile.is_admin === true);
  if (!access.ok) return { ok: false, error: access.error };

  const toStatus: VerificationStatus = decision === "confirm" ? "official" : "rejected";

  const { error } = await sup
    .from("product_tags")
    .update({
      verification_status: toStatus,
      reviewed_by: profile.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", pinId);
  if (error) return { ok: false, error: error.message };

  await writeAuditRow({
    productTagId: pinId,
    action: "status_changed",
    fromStatus: row.verification_status,
    toStatus,
    actorProfileId: profile.id,
  });
  bust(access.type, access.slug, access.listingId);
  return { ok: true, id: pinId };
}

export async function deletePin(pinId: string): Promise<PinResult> {
  const profile = await currentProfile();
  if (!profile) return { ok: false, error: "Sign in first." };

  const sup = getSupabaseServiceClient();
  const { data: pin } = await sup
    .from("product_tags")
    .select("id, listing_image_id, verification_status")
    .eq("id", pinId)
    .maybeSingle();
  if (!pin) return { ok: false, error: "Pin not found." };

  const row = pin as { listing_image_id: string; verification_status: VerificationStatus };
  const access = await assertCanEditImage(row.listing_image_id, profile.id, profile.is_admin === true);
  if (!access.ok) return { ok: false, error: access.error };

  // Audit BEFORE deleting: product_tag_audit_log deliberately has no FK back to
  // product_tags so the history outlives the row, but the row must still exist
  // when we read its status.
  await writeAuditRow({
    productTagId: pinId,
    action: "deleted",
    fromStatus: row.verification_status,
    actorProfileId: profile.id,
  });

  const { error } = await sup.from("product_tags").delete().eq("id", pinId);
  if (error) return { ok: false, error: error.message };

  bust(access.type, access.slug, access.listingId);
  return { ok: true, id: pinId };
}
