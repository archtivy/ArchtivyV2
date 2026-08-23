import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { getListingUrl } from "@/lib/canonical";
import { duplicateProductAction } from "../actions";
import {
  approveListingFormActionVoid,
  createAdminProductFromWizard,
  updateAdminProductFromWizard,
} from "../../_actions/listings";
import { getListingForEdit } from "@/lib/db/listingEdit";
import { getProductMaterialOptions } from "@/lib/db/materials";
import { getListingImagesWithIds, sanitizeListingImageUrl } from "@/lib/db/listingImages";
import { getPhotoProductTagsByImageIds } from "@/lib/db/photoProductTags";
import { ProductWizard } from "@/app/(app)/add/product/ProductWizard";
import { EditorialImageManager } from "@/components/listing/EditorialImageManager";
import type { ImageTaggingItem } from "@/components/listing/ImageProductTaggingBlock";
import { getWizardOwnerOptions } from "@/lib/admin/wizardOwnerOptions";
import {
  getWizardTaxonomyNodes,
  getWizardFacets,
  getWizardMaterials,
  getWizardMemberTitles,
} from "@/lib/publish/wizardReferenceData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

type SearchParams = { [key: string]: string | string[] | undefined };

/**
 * /admin/products/[id] — the publish wizard, prefilled, plus the admin-only
 * surroundings. Mirrors the project edit route; see the note there for why
 * photo tagging sits below the wizard rather than inside it.
 */
export default async function AdminProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;

  const listing = await getListingForEdit(id);
  if (!listing || listing.type !== "product") return notFound();

  const [
    ownerOptions,
    categories,
    materials,
    memberTitles,
    imagesWithIdsResult,
    productMaterialOptions,
    facets,
  ] = await Promise.all([
    getWizardOwnerOptions("product"),
    getWizardTaxonomyNodes("product"),
    getWizardMaterials(),
    getWizardMemberTitles(),
    getListingImagesWithIds(id),
    getProductMaterialOptions(),
    getWizardFacets("product"),
  ]);

  const imagesWithIds = imagesWithIdsResult.data ?? [];
  let imageTaggingData: ImageTaggingItem[] = [];
  if (imagesWithIds.length > 0) {
    const tagsResult = await getPhotoProductTagsByImageIds(imagesWithIds.map((i) => i.id));
    type TagRow = {
      id: string; listing_image_id: string; product_id: string | null; x: number; y: number;
      product?: { id: string; slug: string; title: string | null } | null;
      product_type_id?: string | null; product_category_id?: string | null; product_subcategory_id?: string | null;
      color_text?: string | null; material_id?: string | null; feature_text?: string | null;
    };
    const tagsByImageId: Record<string, TagRow[]> = {};
    for (const t of tagsResult.data ?? []) {
      const tag = t as TagRow;
      (tagsByImageId[tag.listing_image_id] ??= []).push(tag);
    }
    imageTaggingData = imagesWithIds.map((img) => ({
      listingImageId: img.id,
      imageUrl: sanitizeListingImageUrl(img.image_url) ?? "",
      imageAlt: img.alt ?? "Image",
      imageTitle: img.title ?? "",
      imageCaption: img.caption ?? "",
      existingTags: (tagsByImageId[img.id] ?? []).map((t) => ({
        id: t.id,
        listing_image_id: t.listing_image_id,
        product_id: t.product_id ?? "",
        x: t.x,
        y: t.y,
        product_title: t.product?.title ?? undefined,
        product_slug: t.product?.slug ?? undefined,
        product_type_id: t.product_type_id ?? null,
        product_category_id: t.product_category_id ?? null,
        product_subcategory_id: t.product_subcategory_id ?? null,
        color_text: t.color_text ?? null,
        material_id: t.material_id ?? null,
        feature_text: t.feature_text ?? null,
      })),
    }));
  }

  const errorMsg = toText(searchParams.error);
  const showError = Boolean(errorMsg);
  const showSuccess = toText(searchParams.saved) === "1" && !showError;

  return (
    <AdminPage
      title={listing.title || "Product"}
      actions={
        <div className="flex items-center gap-2">
          {listing.status === "PENDING" && (
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

      <ProductWizard
        categories={categories}
        facets={facets}
        materials={materials}
        brandName={null}
        initial={listing}
        admin={{
          ownerOptions,
          ownerProfileId: listing.ownerProfileId,
          memberTitles,
          onCreate: createAdminProductFromWizard,
          onUpdate: updateAdminProductFromWizard,
          returnTo: `/admin/products/${id}`,
        }}
      />

      <div className="mt-12 border-t border-zinc-200 pt-8">
        <EditorialImageManager
          listingId={id}
          images={imageTaggingData.map((img, i) => ({
            listingImageId: img.listingImageId,
            imageUrl: img.imageUrl,
            imageAlt: img.imageAlt,
            imageTitle: img.imageTitle,
            imageCaption: img.imageCaption,
            sortOrder: i,
            existingTags: img.existingTags.map((t) => ({
              ...t,
              product_id: t.product_id?.trim() || null,
            })),
          }))}
          materialOptions={productMaterialOptions ?? []}
        />
      </div>
    </AdminPage>
  );
}
