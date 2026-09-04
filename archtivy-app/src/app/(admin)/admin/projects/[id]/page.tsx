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
import { ProjectWizard } from "@/app/(app)/add/project/ProjectWizard";
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
    facets,
  ] = await Promise.all([
    getWizardOwnerOptions("project"),
    getWizardTaxonomyNodes("project"),
    getWizardMaterials(),
    getWizardProducts(),
    getWizardMemberTitles(),
    getWizardFacets("project"),
  ]);


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

    </AdminPage>
  );
}
