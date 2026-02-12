import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { AddProjectForm } from "@/app/(app)/add/project/AddProjectForm";
import { searchProfilesForOwner, getProfilesByRole } from "@/lib/db/profiles";
import { getProjectMaterialOptions } from "@/lib/db/materials";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { MemberTitleRow } from "@/app/(app)/add/project/TeamMembersField";

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
  const [{ data: profileOptions }, brandsResult, materialOptions, memberTitles] = await Promise.all([
    searchProfilesForOwner("", "project"),
    getProfilesByRole("brand"),
    getProjectMaterialOptions(),
    getActiveMemberTitles(),
  ]);
  const profiles = profileOptions ?? [];
  const brands = brandsResult.data ?? [];
  const materials = materialOptions ?? [];

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
          brands={brands}
          materials={materials}
          memberTitles={memberTitles}
        />
      </div>
    </AdminPage>
  );
}
