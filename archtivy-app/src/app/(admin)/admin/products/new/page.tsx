import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { AddProductForm } from "@/app/(app)/add/product/AddProductForm";
import { searchProfilesForOwner } from "@/lib/db/profiles";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { MemberTitleRow } from "@/app/(app)/add/project/TeamMembersField";
import { getTaxonomyTree, getFacetsForDomain } from "@/lib/taxonomy/taxonomyDb";
import type { MaterialNodeForForm, FacetForForm } from "@/components/add/AdvancedFiltersSection";

async function getActiveBrandMemberTitles(): Promise<MemberTitleRow[]> {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from("member_titles")
    .select("label, maps_to_role, sort_order")
    .eq("is_active", true)
    .eq("maps_to_role", "brand")
    .order("sort_order", { ascending: true });
  if (error) return [];
  return (data ?? []) as MemberTitleRow[];
}

export default async function AdminNewProductPage() {
  const [{ data: profileOptions }, memberTitles, materialTaxRes, facetsRes] = await Promise.all([
    searchProfilesForOwner("", "product"),
    getActiveBrandMemberTitles(),
    getTaxonomyTree("material"),
    getFacetsForDomain("product"),
  ]);
  const profiles = profileOptions ?? [];
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

  return (
    <AdminPage
      title="Create Product"
      actions={
        <Link
          href="/admin/products"
          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
        >
          ← Back
        </Link>
      }
    >
      <div className="max-w-4xl">
        <p className="mb-6 text-sm text-zinc-600">
          Create a new product listing on behalf of a profile. Select the owner profile, then fill
          in all fields. You will be redirected to the new listing’s edit page after submit.
        </p>
        <AddProductForm
          formMode="admin"
          ownerProfileOptions={profiles}
          memberTitles={memberTitles}
          materialNodes={materialNodes}
          facets={facets}
        />
      </div>
    </AdminPage>
  );
}
