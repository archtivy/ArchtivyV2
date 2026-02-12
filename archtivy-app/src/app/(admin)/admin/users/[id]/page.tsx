import Link from "next/link";
import Image from "next/image";
import { isAllowedAvatarUrl } from "../avatarUrl";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { updateProfile } from "@/app/(admin)/admin/_actions/profiles";
import { updateUserRole, disableUser, deleteUser } from "@/app/(admin)/admin/_actions/users";
import { AdminUserActions } from "./AdminUserActions";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const supabase = getSupabaseServiceClient();
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", params.id).maybeSingle();

  if (error) {
    return (
      <AdminPage title="User">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
          {error.message}
        </div>
      </AdminPage>
    );
  }
  if (!profile) return notFound();

  const clerkId = (profile as { clerk_user_id: string }).clerk_user_id;
  const { data: listings } = await supabase
    .from("listings")
    .select("id, type, title, created_at")
    .eq("owner_clerk_user_id", clerkId)
    .order("created_at", { ascending: false });

  const name = toText(profile.display_name) || toText(profile.username) || "User";
  const isInternal = toText(clerkId).startsWith("archtivy_internal_");
  const disabledAt = (profile as { disabled_at?: string | null }).disabled_at ?? null;
  const isDisabled = Boolean(disabledAt);

  const { count: listingsCount } = await supabase
    .from("listings")
    .select("id", { count: "exact", head: true })
    .eq("owner_clerk_user_id", clerkId);

  async function saveProfile(formData: FormData) {
    "use server";
    const res = await updateProfile({
      id: params.id,
      patch: {
        display_name: formData.get("display_name"),
        username: formData.get("username"),
        location_city: formData.get("location_city"),
        location_country: formData.get("location_country"),
        bio: formData.get("bio"),
        website: formData.get("website"),
        instagram: formData.get("instagram"),
        linkedin: formData.get("linkedin"),
        avatar_url: formData.get("avatar_url"),
        designer_discipline: formData.get("designer_discipline"),
        brand_type: formData.get("brand_type"),
      },
    });
    if (!res.ok) throw new Error(res.error);
  }

  return (
    <AdminPage
      title={name}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {profile.username ? (
            <Link
              href={`/u/${profile.username}`}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              View public
            </Link>
          ) : null}
          <AdminUserActions
            profileId={params.id}
            currentRole={(profile as { role: string }).role}
            isDisabled={isDisabled}
            listingsCount={listingsCount ?? 0}
          />
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <form action={saveProfile} className="space-y-4">
              <div className="flex items-center gap-4 border-b border-zinc-100 pb-4">
                {profile.avatar_url && isAllowedAvatarUrl(profile.avatar_url) ? (
                  <Image src={profile.avatar_url as string} alt="" width={64} height={64} className="rounded-full object-cover" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xl font-medium text-zinc-600">
                    {(name[0] || "?").toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="text-sm font-medium text-zinc-500">Clerk ID</div>
                  <div className="font-mono text-sm text-zinc-700">{clerkId}</div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-zinc-900">Display name</label>
                  <input
                    name="display_name"
                    defaultValue={toText(profile.display_name)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-zinc-900">Username</label>
                  <input
                    name="username"
                    defaultValue={toText(profile.username)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                  <div className="mt-1 text-xs text-zinc-500">Public URL: /u/[username]</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">City</label>
                  <input
                    name="location_city"
                    defaultValue={toText(profile.location_city)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">Country</label>
                  <input
                    name="location_country"
                    defaultValue={toText(profile.location_country)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">Designer discipline</label>
                  <input
                    name="designer_discipline"
                    defaultValue={toText(profile.designer_discipline)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">Brand type</label>
                  <input
                    name="brand_type"
                    defaultValue={toText(profile.brand_type)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-zinc-900">Avatar URL</label>
                  <input
                    name="avatar_url"
                    defaultValue={toText(profile.avatar_url)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-zinc-900">Bio</label>
                <textarea
                  name="bio"
                  defaultValue={toText(profile.bio)}
                  rows={4}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-zinc-900">Website</label>
                  <input
                    name="website"
                    defaultValue={toText(profile.website)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">Instagram</label>
                  <input
                    name="instagram"
                    defaultValue={toText(profile.instagram)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">LinkedIn</label>
                  <input
                    name="linkedin"
                    defaultValue={toText(profile.linkedin)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>
              <button type="submit" className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:opacity-90">
                Save profile
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-900">Identity</div>
            <div className="mt-2 space-y-1 text-sm text-zinc-700">
              <div>
                Role: <span className="font-medium">{(profile as { role: string }).role}</span>
              </div>
              <div>
                Created by: <span className="font-medium">{isInternal ? "Archtivy" : "User"}</span>
              </div>
              <div>
                Status: <span className="font-medium">{profile.username ? "Live" : "Draft"}</span>
              </div>
              {isDisabled && (
                <div>
                  Disabled: <span className="font-medium text-amber-700">Yes</span>
                  {disabledAt && (
                    <span className="ml-1 text-zinc-500">
                      ({new Date(disabledAt).toLocaleDateString()})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-900">Projects & Products</div>
            <div className="mt-2 text-sm text-zinc-600">
              {listings && listings.length > 0 ? (
                <ul className="space-y-1">
                  {(listings as { id: string; type: string; title: string | null; created_at: string }[]).map((l) => (
                    <li key={l.id}>
                      <Link
                        href={l.type === "project" ? `/admin/projects/${l.id}` : `/admin/products/${l.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {l.title || "Untitled"}
                      </Link>
                      <span className="ml-2 text-zinc-500">({l.type})</span>
                      <span className="ml-2 text-zinc-400">{new Date(l.created_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No listings</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
