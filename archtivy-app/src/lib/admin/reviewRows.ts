import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getListingUrl } from "@/lib/canonical";
import type { ReviewItem } from "@/components/admin/review/ReviewQueue";

/**
 * Loads listings awaiting review, for the shared ReviewQueue.
 *
 * Lives in lib rather than in a page so the Dashboard can call the same
 * function when its redesign lands — the consistency requirement in the brief
 * applies to the data shape as much as to the component.
 *
 * Warnings are derived from real null/empty columns only. Nothing here invents
 * a quality signal: if a field is populated, no warning is emitted, and there
 * is no scoring or guessing.
 */

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

interface ListingRow {
  id: string;
  type: string;
  title: string | null;
  status: string;
  location: string | null;
  year: string | number | null;
  category: string | null;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
  owner_profile_id: string | null;
}

export async function getListingsAwaitingReview(
  kind: "project" | "product" | "all" = "all",
  limit = 50
): Promise<ReviewItem[]> {
  const sup = getSupabaseServiceClient();

  let query = sup
    .from("listings")
    .select(
      "id, type, title, status, location, year, category, description, cover_image_url, created_at, owner_profile_id"
    )
    .eq("status", "PENDING")
    .is("deleted_at", null)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (kind !== "all") query = query.eq("type", kind);

  const { data, error } = await query;
  if (error) {
    console.error("[reviewRows] query failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as ListingRow[];
  if (rows.length === 0) return [];

  const ids = rows.map((r) => r.id);
  const ownerIds = Array.from(
    new Set(rows.map((r) => r.owner_profile_id).filter((v): v is string => !!v))
  );

  const [imagesRes, ownersRes] = await Promise.all([
    sup.from("listing_images").select("listing_id").in("listing_id", ids),
    ownerIds.length > 0
      ? sup.from("profiles").select("id, display_name, username").in("id", ownerIds)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  const imageCount: Record<string, number> = {};
  for (const r of (imagesRes.data ?? []) as { listing_id: string }[]) {
    imageCount[r.listing_id] = (imageCount[r.listing_id] ?? 0) + 1;
  }

  const ownerName: Record<string, string> = {};
  for (const p of (ownersRes.data ?? []) as {
    id: string;
    display_name: string | null;
    username: string | null;
  }[]) {
    ownerName[p.id] = toText(p.display_name) || toText(p.username) || "";
  }

  return rows.map((r) => {
    const kindOf: "project" | "product" = r.type === "product" ? "product" : "project";
    const images = imageCount[r.id] ?? 0;

    const warnings: string[] = [];
    if (!toText(r.cover_image_url)) warnings.push("No cover image");
    if (images === 0) warnings.push("No gallery images");
    if (!toText(r.description)) warnings.push("No description");
    if (kindOf === "project" && !toText(r.location)) warnings.push("No location");

    const meta = [
      toText(r.location),
      toText(r.year),
      toText(r.category),
    ].filter(Boolean);

    return {
      id: r.id,
      kind: kindOf,
      title: toText(r.title) || "Untitled",
      status: r.status,
      coverImageUrl: r.cover_image_url,
      meta,
      ownerName: r.owner_profile_id ? ownerName[r.owner_profile_id] || null : null,
      imageCount: images,
      createdAt: r.created_at,
      href: kindOf === "project" ? `/admin/projects/${r.id}` : `/admin/products/${r.id}`,
      previewHref: getListingUrl({ id: r.id, type: kindOf }),
      warnings,
    } satisfies ReviewItem;
  });
}
