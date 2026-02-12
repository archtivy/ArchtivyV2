import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { AddProductForm } from "@/app/(app)/add/product/AddProductForm";
import { searchProfilesForOwner } from "@/lib/db/profiles";
import { getProductMaterialOptions } from "@/lib/db/materials";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { MemberTitleRow } from "@/app/(app)/add/project/TeamMembersField";

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
  const [{ data: profileOptions }, materialOptions, memberTitles] = await Promise.all([
    searchProfilesForOwner("", "product"),
    getProductMaterialOptions(),
    getActiveBrandMemberTitles(),
  ]);
  const profiles = profileOptions ?? [];
  const materials = materialOptions ?? [];

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
          materials={materials}
          memberTitles={memberTitles}
        />
      </div>
    </AdminPage>
  );
}
