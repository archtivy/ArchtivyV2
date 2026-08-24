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
import { getProductTagsByImageIds } from "@/lib/db/productTags";
import { ProductWizard } from "@/app/(app)/add/product/ProductWizard";
import { EditorialImageManager } from "@/components/listing/EditorialImageManager";
import type { ImageTaggingItem } from "@/components/listing/EditorialImageManager";
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
    // product_tags, not the retired photo_product_tags sidecar. Same pins —
    // every legacy row was already mirrored here — but this is the table with
    // the verification workflow, and the one the public page reads.
    const tags = await getProductTagsByImageIds(imagesWithIds.map((i) => i.id));
    const tagsByImageId: Record<string, typeof tags> = {};
    for (const tag of tags) {
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
        product_id: t.product_id,
        // Already percentages. The legacy table stored 0–1 and this mapping
        // passed it straight through, so nothing here may rescale.
        x: t.x_percent,
        y: t.y_percent,
        product_title: t.product_title ?? undefined,
        product_slug: t.product_slug ?? undefined,
        verification_status: t.verification_status,
        tag_source: t.tag_source,
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
