import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { getListingUrl } from "@/lib/canonical";
import { duplicateProjectAction } from "../actions";
import {
  approveListingFormActionVoid,
  createAdminProjectFromWizard,
  updateAdminProjectFromWizard,
} from "../../_actions/listings";
import { getListingForEdit } from "@/lib/db/listingEdit";
import { getProductMaterialOptions } from "@/lib/db/materials";
import { getListingImagesWithIds, sanitizeListingImageUrl } from "@/lib/db/listingImages";
import { getPhotoProductTagsByImageIds } from "@/lib/db/photoProductTags";
import { ProjectWizard } from "@/app/(app)/add/project/ProjectWizard";
import { EditorialImageManager } from "@/components/listing/EditorialImageManager";
import type { ImageTaggingItem } from "@/components/listing/ImageProductTaggingBlock";
import { getWizardOwnerOptions } from "@/lib/admin/wizardOwnerOptions";
import {
  getWizardTaxonomyNodes,
  getWizardFacets,
  getWizardMaterials,
  getWizardProducts,
  getWizardMemberTitles,
} from "@/lib/publish/wizardReferenceData";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

type SearchParams = { [key: string]: string | string[] | undefined };

/**
 * /admin/projects/[id] — the publish wizard, prefilled, plus the admin-only
 * surroundings that are not the wizard's job.
 *
 * ── WHAT THE WIZARD OWNS vs WHAT THIS PAGE OWNS ─────────────────────────────
 * The wizard owns the listing's authored content, including the gallery: its
 * Images step posts the full ordered set and updateProjectAction replaces it,
 * matching rows by image_url so kept images keep their ids.
 *
 * This page owns what only an admin can do and what has no place in an author
 * flow: approving a pending listing, duplicating it, previewing the public
 * page, and EditorialImageManager's per-image product tagging. Tagging stays
 * below the wizard rather than inside it because a tag is a coordinate on a
 * specific stored image — it needs the listing_images row id, which only
 * exists after the image is saved.
 *
 * That ordering is why replaceGallery had to stop deleting and re-inserting
 * rows: it would have destroyed every tag placed here on each save.
 */
export default async function AdminProjectEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;

  const listing = await getListingForEdit(id);
  if (!listing || listing.type !== "project") return notFound();

  const [
    ownerOptions,
    categories,
    materials,
    products,
    memberTitles,
    imagesWithIdsResult,
    productMaterialOptions,
    facets,
  ] = await Promise.all([
    getWizardOwnerOptions("project"),
    getWizardTaxonomyNodes("project"),
    getWizardMaterials(),
    getWizardProducts(),
    getWizardMemberTitles(),
    getListingImagesWithIds(id),
    getProductMaterialOptions(),
    getWizardFacets("project"),
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
      title={listing.title || "Project"}
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
            href={getListingUrl({ id, type: "project" })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Preview
          </Link>
          <form action={duplicateProjectAction}>
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

      <ProjectWizard
        categories={categories}
        facets={facets}
        materials={materials}
        products={products}
        memberTitles={memberTitles}
        initial={listing}
        admin={{
          ownerOptions,
          ownerProfileId: listing.ownerProfileId,
          // Entries naming a product that is not on the platform carry no id,
          // so the picker cannot represent them. Passed through and resubmitted
          // verbatim, or an admin save would delete them.
          mentionedFreeText: listing.mentionedProductsFreeText,
          onCreate: createAdminProjectFromWizard,
          onUpdate: updateAdminProjectFromWizard,
          returnTo: `/admin/projects/${id}`,
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
