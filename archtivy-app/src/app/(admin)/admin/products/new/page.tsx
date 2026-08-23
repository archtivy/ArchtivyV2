import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { ProductWizard } from "@/app/(app)/add/product/ProductWizard";
import { getWizardOwnerOptions } from "@/lib/admin/wizardOwnerOptions";
import {
  getWizardTaxonomyNodes,
  getWizardFacets,
  getWizardMaterials,
  getWizardMemberTitles,
} from "@/lib/publish/wizardReferenceData";
import {
  createAdminProductFromWizard,
  updateAdminProductFromWizard,
} from "../../_actions/listings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * /admin/products/new — the same wizard /add/product renders, in admin context.
 *
 * memberTitles is passed inside the admin context rather than as a prop: the
 * product wizard has no team step outside admin, so the public route has no
 * reason to load or forward it.
 */
export default async function AdminNewProductPage() {
  const [ownerOptions, categories, materials, memberTitles,
    facets,
  ] = await Promise.all([
    getWizardOwnerOptions("product"),
    getWizardTaxonomyNodes("product"),
    getWizardMaterials(),
    getWizardMemberTitles(),
    getWizardFacets("product"),
  ]);

  return (
    <AdminPage
      title="Create Product"
      description="Publishes on behalf of the selected brand profile. Save as draft to stage it without going live."
      actions={
        <Link
          href="/admin/products"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
        >
          ← Back
        </Link>
      }
    >
      <ProductWizard
        categories={categories}
        facets={facets}
        materials={materials}
        brandName={null}
        admin={{
          ownerOptions,
          ownerProfileId: null,
          memberTitles,
          onCreate: createAdminProductFromWizard,
          onUpdate: updateAdminProductFromWizard,
          returnTo: "/admin/products",
        }}
      />
    </AdminPage>
  );
}
