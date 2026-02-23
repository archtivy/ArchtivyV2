import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminProfileEditForm } from "@/components/admin/AdminProfileEditForm";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { CopyClaimLinkButton } from "./CopyClaimLinkButton";
import { updateAdminProfileAction } from "./actions";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AdminProfileEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id: profileId } = await params;
  const supabase = getSupabaseServiceClient();
  const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", profileId).maybeSingle();

  if (error) {
    return (
      <AdminPage title="Profile">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
          {error.message}
        </div>
      </AdminPage>
    );
  }
  if (!profile) return notFound();

  const name = toText(profile.display_name) || toText(profile.username) || "Profile";
  const isInternal = toText(profile.clerk_user_id).startsWith("archtivy_internal_");
  const saved = toText(searchParams.saved) === "1";
  const errorMsg = toText(searchParams.error);

  return (
    <AdminPage
      title={name}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <CopyClaimLinkButton profileId={profileId} />
          {profile.username ? (
            <Link
              href={`/u/${profile.username}`}
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
            >
              View public
            </Link>
          ) : null}
        </div>
      }
    >
      {saved && (
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Profile saved.
        </div>
      )}
      {errorMsg && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      )}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <AdminProfileEditForm
              profile={profile as Parameters<typeof AdminProfileEditForm>[0]["profile"]}
              formAction={updateAdminProfileAction}
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-900">Identity</div>
            <div className="mt-2 space-y-1 text-sm text-zinc-700">
              <div>
                Role: <span className="font-medium">{toText(profile.role) || "—"}</span>
              </div>
              <div>
                Created by:{" "}
                <span className="font-medium">{isInternal ? "Archtivy" : "User"}</span>
              </div>
              <div>
                Status:{" "}
                <span className="font-medium">{profile.username ? "Live" : "Draft"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-900">Connections</div>
            <div className="mt-2 text-sm text-zinc-600">
              Listings are currently connected via `owner_clerk_user_id`.
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

