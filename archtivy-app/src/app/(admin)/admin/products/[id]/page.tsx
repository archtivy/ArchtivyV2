import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { getListingUrl } from "@/lib/canonical";
import { duplicateProductAction } from "../actions";
import { approveListingFormActionVoid, updateProductAction } from "../../_actions/listings";
import { getProductListingBySlugOrId } from "@/lib/db/explore";
import { getListingTeamMembersWithProfiles } from "@/lib/db/listingTeamMembers";
import { getMaterialsByProductIds, getProductMaterialOptions } from "@/lib/db/materials";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getListingImagesWithIds, sanitizeListingImageUrl } from "@/lib/db/listingImages";
import { getPhotoProductTagsByImageIds } from "@/lib/db/photoProductTags";
import { AddProductForm, type ProductFormInitialData } from "@/app/(app)/add/product/AddProductForm";
import { EditorialImageManager } from "@/components/listing/EditorialImageManager";
import type { ImageTaggingItem } from "@/components/listing/ImageProductTaggingBlock";
import type { MemberTitleRow } from "@/app/(app)/add/project/TeamMembersField";

async function getProductColorOptions(productId: string): Promise<string[]> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.from("products").select("color_options").eq("id", productId).maybeSingle();
  const arr = (data as { color_options?: string[] | null } | null)?.color_options;
  return Array.isArray(arr) ? arr : [];
}

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

async function getActiveBrandMemberTitles(): Promise<MemberTitleRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("member_titles")
    .select("label, maps_to_role, sort_order")
    .eq("is_active", true)
    .eq("maps_to_role", "brand")
    .order("sort_order", { ascending: true });
  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[member_titles] brand fetch error:", error.message);
    }
    return [];
  }
  return (data ?? []) as MemberTitleRow[];
}

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AdminProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const [productRow, teamResult, materialsMap, materialOptions, memberTitles, colorOptions, imagesWithIdsResult, productMaterialOptions] =
    await Promise.all([
      getProductListingBySlugOrId(id),
      getListingTeamMembersWithProfiles(id),
      getMaterialsByProductIds([id]),
      getProductMaterialOptions(),
      getActiveBrandMemberTitles(),
      getProductColorOptions(id),
      getListingImagesWithIds(id),
      getProductMaterialOptions(),
    ]);

  if (!productRow || (productRow as { type?: string }).type !== "product") return notFound();

  // Build imageTaggingData for EditorialImageManager (same pattern as projects edit page)
  const imagesWithIds = imagesWithIdsResult.data ?? [];
  const productMaterialsList = productMaterialOptions ?? [];
  let imageTaggingData: ImageTaggingItem[] = [];
  if (imagesWithIds.length > 0) {
    const imageIds = imagesWithIds.map((i) => i.id);
    const tagsResult = await getPhotoProductTagsByImageIds(imageIds);
    const tags = tagsResult.data ?? [];
    type TagRow = {
      id: string; listing_image_id: string; product_id: string | null; x: number; y: number;
      product?: { id: string; slug: string; title: string | null } | null;
      product_type_id?: string | null; product_category_id?: string | null; product_subcategory_id?: string | null;
      category_text?: string | null; color_text?: string | null; material_id?: string | null; feature_text?: string | null;
    };
    const tagsByImageId: Record<string, (TagRow & { product_title?: string; product_slug?: string })[]> = {};
    for (const t of tags) {
      const tag = t as TagRow;
      if (!tagsByImageId[tag.listing_image_id]) tagsByImageId[tag.listing_image_id] = [];
      tagsByImageId[tag.listing_image_id].push({
        id: tag.id,
        listing_image_id: tag.listing_image_id,
        product_id: tag.product_id ?? null,
        x: tag.x,
        y: tag.y,
        product_type_id: tag.product_type_id ?? null,
        product_category_id: tag.product_category_id ?? null,
        product_subcategory_id: tag.product_subcategory_id ?? null,
        category_text: tag.category_text ?? null,
        color_text: tag.color_text ?? null,
        material_id: tag.material_id ?? null,
        feature_text: tag.feature_text ?? null,
        product_title: tag.product?.title ?? undefined,
        product_slug: tag.product?.slug ?? undefined,
      });
    }
    imageTaggingData = imagesWithIds.map((img) => ({
      listingImageId: img.id,
      imageUrl: sanitizeListingImageUrl(img.image_url) ?? "",
      imageAlt: img.alt ?? "Image",
      existingTags: (tagsByImageId[img.id] ?? []).map((t) => ({
        id: t.id,
        listing_image_id: t.listing_image_id,
        product_id: t.product_id ?? "",
        x: t.x,
        y: t.y,
        product_title: t.product_title,
        product_slug: t.product_slug,
        product_type_id: t.product_type_id ?? null,
        product_category_id: t.product_category_id ?? null,
        product_subcategory_id: t.product_subcategory_id ?? null,
        color_text: t.color_text ?? null,
        material_id: t.material_id ?? null,
        feature_text: t.feature_text ?? null,
      })),
    }));
  }

  const listing = productRow as {
    id: string;
    title: string | null;
    description: string | null;
    product_type: string | null;
    product_category: string | null;
    product_subcategory: string | null;
    dimensions: string | null;
    year: string | number | null;
    team_members: unknown;
  };

  const teamWithProfiles = teamResult.data ?? [];
  const materials = materialsMap[id] ?? [];
  const materialsList = materialOptions ?? [];
  const memberTitlesList = memberTitles;

  const initialData: ProductFormInitialData = {
    listingId: id,
    title: toText(listing.title),
    description: toText(listing.description),
    productType: toText(listing.product_type),
    productCategory: toText(listing.product_category),
    productSubcategory: toText(listing.product_subcategory),
    dimensions: toText(listing.dimensions),
    year: listing.year != null ? String(listing.year) : "",
    teamRows: teamWithProfiles.map((m) => ({
      name: (m.display_name ?? "").trim(),
      role: (m.title ?? "").trim(),
    })),
    materialIds: materials.map((m) => m.id),
    colorOptions: colorOptions ?? [],
    existingImageCount: imagesWithIds.length,
  };

  const saved = toText(searchParams.saved) === "1";
  const errorMsg = toText(searchParams.error);
  const showError = Boolean(errorMsg);
  const showSuccess = saved && !showError;

  return (
    <AdminPage
      title={toText(listing.title) || "Product"}
      actions={
        <div className="flex items-center gap-2">
          {(productRow as { status?: string }).status === "PENDING" && (
            <form action={approveListingFormActionVoid}>
              <input type="hidden" name="_listingId" value={id} />
              <button
                type="submit"
                className="rounded-lg bg-[#002abf] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Approve
              </button>
            </form>
          )}
          <Link
            href={getListingUrl({ id, type: "product" })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Preview
          </Link>
          <form action={duplicateProductAction}>
            <input type="hidden" name="_listingId" value={id} />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Duplicate
            </button>
          </form>
        </div>
      }
    >
      {showSuccess && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Changes saved. Updates are reflected on public pages.
        </div>
      )}
      {showError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      <div className="mb-6">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Edit using the same form as user submission. Approve above if pending.
        </p>
      </div>
      <AddProductForm
        materials={materialsList}
        memberTitles={memberTitlesList}
        formMode="admin"
        initialData={initialData}
        updateAction={updateProductAction}
      />
      <EditorialImageManager
        listingId={id}
        images={imageTaggingData.map((img, i) => ({
          listingImageId: img.listingImageId,
          imageUrl: img.imageUrl,
          imageAlt: img.imageAlt,
          sortOrder: i,
          existingTags: img.existingTags.map((t) => ({
            id: t.id,
            listing_image_id: t.listing_image_id,
            product_id: t.product_id?.trim() || null,
            x: t.x,
            y: t.y,
            product_title: t.product_title,
            product_slug: t.product_slug,
            product_type_id: t.product_type_id ?? null,
            product_category_id: t.product_category_id ?? null,
            product_subcategory_id: t.product_subcategory_id ?? null,
            color_text: t.color_text ?? null,
            material_id: t.material_id ?? null,
            feature_text: t.feature_text ?? null,
          })),
        }))}
        materialOptions={productMaterialsList}
      />
    </AdminPage>
  );
}
