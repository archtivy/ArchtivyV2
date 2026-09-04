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
import { ProductWizard } from "@/app/(app)/add/product/ProductWizard";
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
    facets,
  ] = await Promise.all([
    getWizardOwnerOptions("product"),
    getWizardTaxonomyNodes("product"),
    getWizardMaterials(),
    getWizardMemberTitles(),
    getWizardFacets("product"),
  ]);


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

    </AdminPage>
  );
}
