import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { ProjectWizard } from "@/app/(app)/add/project/ProjectWizard";
import { getWizardOwnerOptions } from "@/lib/admin/wizardOwnerOptions";
import {
  getWizardCategories,
  getWizardMaterials,
  getWizardProducts,
  getWizardMemberTitles,
} from "@/lib/publish/wizardReferenceData";
import {
  createAdminProjectFromWizard,
  updateAdminProjectFromWizard,
} from "../../_actions/listings";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * /admin/projects/new — the same wizard /add/project renders, in admin context.
 *
 * The reference-data queries are the shared ones from wizardReferenceData, so
 * the option lists an admin sees are the option lists an author sees. The
 * legacy admin form loaded its own taxonomy and member-title queries, which is
 * how the two surfaces drifted: a category present in one and missing in the
 * other reads to whoever notices as data loss.
 */
export default async function AdminNewProjectPage() {
  const [ownerOptions, categories, materials, products, memberTitles] = await Promise.all([
    getWizardOwnerOptions("project"),
    getWizardCategories("project"),
    getWizardMaterials(),
    getWizardProducts(),
    getWizardMemberTitles(),
  ]);

  return (
    <AdminPage
      title="Create Project"
      description="Publishes on behalf of the selected owner profile. Save as draft to stage it without going live."
      actions={
        <Link
          href="/admin/projects"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
        >
          ← Back
        </Link>
      }
    >
      <ProjectWizard
        categories={categories}
        materials={materials}
        products={products}
        memberTitles={memberTitles}
        admin={{
          ownerOptions,
          ownerProfileId: null,
          onCreate: createAdminProjectFromWizard,
          onUpdate: updateAdminProjectFromWizard,
          returnTo: "/admin/projects",
        }}
      />
    </AdminPage>
  );
}
