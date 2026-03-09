import {
  createNotification,
  createGroupedNotification,
} from "@/lib/db/notifications";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

/**
 * Notify a profile that someone followed them.
 */
export async function notifyNewFollower(
  followerProfileId: string,
  followedProfileId: string
): Promise<void> {
  // Fetch follower name for the notification body
  const sup = getSupabaseServiceClient();
  const { data: follower } = await sup
    .from("profiles")
    .select("display_name, username")
    .eq("id", followerProfileId)
    .maybeSingle();

  const name =
    (follower as { display_name: string | null; username: string | null } | null)
      ?.display_name?.trim() ||
    (follower as { display_name: string | null; username: string | null } | null)
      ?.username ||
    "Someone";

  const username = (follower as { username: string | null } | null)?.username;
  const ctaUrl = username ? `/u/${username}` : `/u/id/${followerProfileId}`;

  await createNotification({
    recipient_profile_id: followedProfileId,
    actor_profile_id: followerProfileId,
    source: "follow_event",
    event_type: "new_follower",
    entity_type: "profile",
    entity_id: followerProfileId,
    title: "New follower",
    body: `${name} started following you.`,
    cta_label: "View profile",
    cta_url: ctaUrl,
  });
}

/**
 * Notify followers of a designer that they published a new project.
 */
export async function notifyDesignerPublishedProject(
  designerProfileId: string,
  projectId: string,
  projectTitle: string,
  projectSlug: string
): Promise<void> {
  const sup = getSupabaseServiceClient();

  // Get designer name
  const { data: designer } = await sup
    .from("profiles")
    .select("display_name, username")
    .eq("id", designerProfileId)
    .maybeSingle();

  const name =
    (designer as { display_name: string | null } | null)?.display_name?.trim() ||
    "A designer";

  // Get all followers of this designer
  const { data: followers } = await sup
    .from("follows")
    .select("follower_profile_id")
    .eq("target_type", "designer")
    .eq("target_id", designerProfileId);

  if (!followers || followers.length === 0) return;

  const hourKey = new Date().toISOString().slice(0, 13); // YYYY-MM-DDTHH

  for (const f of followers) {
    const recipientId = (f as { follower_profile_id: string }).follower_profile_id;
    await createGroupedNotification({
      recipient_profile_id: recipientId,
      actor_profile_id: designerProfileId,
      source: "follow_event",
      event_type: "designer_published_project",
      entity_type: "project",
      entity_id: projectId,
      title: "New project published",
      body: `${name} published a new project: ${projectTitle}`,
      cta_label: "View project",
      cta_url: `/projects/${projectSlug}`,
      group_key: `designer_published:${designerProfileId}:${hourKey}`,
    });
  }
}

/**
 * Notify followers of a brand that they published a new product.
 */
export async function notifyBrandPublishedProduct(
  brandProfileId: string,
  productId: string,
  productTitle: string,
  productSlug: string
): Promise<void> {
  const sup = getSupabaseServiceClient();

  const { data: brand } = await sup
    .from("profiles")
    .select("display_name, username")
    .eq("id", brandProfileId)
    .maybeSingle();

  const name =
    (brand as { display_name: string | null } | null)?.display_name?.trim() ||
    "A brand";

  const { data: followers } = await sup
    .from("follows")
    .select("follower_profile_id")
    .eq("target_type", "brand")
    .eq("target_id", brandProfileId);

  if (!followers || followers.length === 0) return;

  const hourKey = new Date().toISOString().slice(0, 13);

  for (const f of followers) {
    const recipientId = (f as { follower_profile_id: string }).follower_profile_id;
    await createGroupedNotification({
      recipient_profile_id: recipientId,
      actor_profile_id: brandProfileId,
      source: "follow_event",
      event_type: "brand_published_product",
      entity_type: "product",
      entity_id: productId,
      title: "New product added",
      body: `${name} added a new product: ${productTitle}`,
      cta_label: "View product",
      cta_url: `/products/${productSlug}`,
      group_key: `brand_published:${brandProfileId}:${hourKey}`,
    });
  }
}

/**
 * Notify followers of a category when a new listing is published in it.
 */
export async function notifyFollowedCategoryNewListing(
  categoryNodeId: string,
  listingId: string,
  listingTitle: string,
  listingSlug: string,
  listingType: "project" | "product"
): Promise<void> {
  const sup = getSupabaseServiceClient();

  // Get category label
  const { data: node } = await sup
    .from("taxonomy_nodes")
    .select("label")
    .eq("id", categoryNodeId)
    .maybeSingle();

  const categoryLabel =
    (node as { label: string } | null)?.label || "a followed category";

  const { data: followers } = await sup
    .from("follows")
    .select("follower_profile_id")
    .eq("target_type", "category")
    .eq("target_id", categoryNodeId);

  if (!followers || followers.length === 0) return;

  const hourKey = new Date().toISOString().slice(0, 13);
  const prefix = listingType === "project" ? "projects" : "products";

  for (const f of followers) {
    const recipientId = (f as { follower_profile_id: string }).follower_profile_id;
    await createGroupedNotification({
      recipient_profile_id: recipientId,
      actor_profile_id: null,
      source: "follow_event",
      event_type: "followed_category_new_listing",
      entity_type: listingType,
      entity_id: listingId,
      title: `New ${listingType} in ${categoryLabel}`,
      body: `${listingTitle} was published in ${categoryLabel}.`,
      cta_label: `View ${listingType}`,
      cta_url: `/${prefix}/${listingSlug}`,
      group_key: `category_listing:${categoryNodeId}:${hourKey}`,
    });
  }
}

/**
 * Notify followers of a material when a new listing uses it.
 */
export async function notifyFollowedMaterialNewListing(
  materialNodeId: string,
  listingId: string,
  listingTitle: string,
  listingSlug: string,
  listingType: "project" | "product"
): Promise<void> {
  const sup = getSupabaseServiceClient();

  const { data: node } = await sup
    .from("taxonomy_nodes")
    .select("label")
    .eq("id", materialNodeId)
    .maybeSingle();

  const materialLabel =
    (node as { label: string } | null)?.label || "a followed material";

  const { data: followers } = await sup
    .from("follows")
    .select("follower_profile_id")
    .eq("target_type", "material")
    .eq("target_id", materialNodeId);

  if (!followers || followers.length === 0) return;

  const hourKey = new Date().toISOString().slice(0, 13);
  const prefix = listingType === "project" ? "projects" : "products";

  for (const f of followers) {
    const recipientId = (f as { follower_profile_id: string }).follower_profile_id;
    await createGroupedNotification({
      recipient_profile_id: recipientId,
      actor_profile_id: null,
      source: "follow_event",
      event_type: "followed_material_new_listing",
      entity_type: listingType,
      entity_id: listingId,
      title: `A followed material appears in a new ${listingType}`,
      body: `${listingTitle} features ${materialLabel}.`,
      cta_label: `View ${listingType}`,
      cta_url: `/${prefix}/${listingSlug}`,
      group_key: `material_listing:${materialNodeId}:${hourKey}`,
    });
  }
}
