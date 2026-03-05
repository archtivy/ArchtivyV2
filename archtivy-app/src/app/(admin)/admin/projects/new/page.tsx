import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { AddProjectForm } from "@/app/(app)/add/project/AddProjectForm";
import { searchProfilesForOwner, getProfilesByRole } from "@/lib/db/profiles";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { MemberTitleRow } from "@/app/(app)/add/project/TeamMembersField";
import { getTaxonomyTree, getFacetsForDomain } from "@/lib/taxonomy/taxonomyDb";
import type { MaterialNodeForForm, FacetForForm } from "@/components/add/AdvancedFiltersSection";

async function getActiveMemberTitles(): Promise<MemberTitleRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("member_titles")
    .select("label, maps_to_role, sort_order")
    .eq("is_active", true)
    .order("maps_to_role", { ascending: true })
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as MemberTitleRow[];
}

export default async function AdminNewProjectPage() {
  const [profileOptions, memberTitles, materialTaxRes, facetsRes, projectTaxRes] = await Promise.all([
    searchProfilesForOwner("", "project"),
    getActiveMemberTitles(),
    getTaxonomyTree("material"),
    getFacetsForDomain("project"),
    getTaxonomyTree("project"),
  ]);
  const profiles = profileOptions?.data ?? [];
  const materialNodes: MaterialNodeForForm[] = (materialTaxRes.data ?? []).map((n) => ({
    id: n.id,
    parent_id: n.parent_id,
    depth: n.depth,
    label: n.label,
  }));
  const facets: FacetForForm[] = (facetsRes.data ?? []).map((f) => ({
    id: f.id,
    slug: f.slug,
    label: f.label,
    values: f.values.map((v) => ({ id: v.id, slug: v.slug, label: v.label })),
  }));
  const projectTaxonomyNodes = (projectTaxRes.data ?? []).map((n) => ({
    id: n.id,
    parent_id: n.parent_id,
    depth: n.depth,
    label: n.label,
    legacy_project_category: n.legacy_project_category,
  }));

  return (
    <AdminPage
      title="Create Project"
      actions={
        <Link
          href="/admin/projects"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
        >
          ← Back
        </Link>
      }
    >
      <div className="max-w-4xl">
        <p className="mb-6 text-sm text-zinc-600">
          Create a new project listing on behalf of a profile. Select the owner profile, then fill
          in all fields. You will be redirected to the new listing’s edit page after submit.
        </p>
        <AddProjectForm
          formMode="admin"
          ownerProfileOptions={profiles}
          memberTitles={memberTitles}
          materialNodes={materialNodes}
          facets={facets}
          projectTaxonomyNodes={projectTaxonomyNodes}
        />
      </div>
    </AdminPage>
  );
}
