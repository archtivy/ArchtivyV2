import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { searchProfilesForOwner } from "@/lib/db/profiles";
import { getListingUrl } from "@/lib/canonical";
import { updateAdminProjectAction, duplicateProjectAction } from "../actions";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AdminProjectEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const supabase = getSupabaseServiceClient();
  const [{ data: listing, error }, { data: profileOptions }] = await Promise.all([
    supabase
      .from("listings")
      .select("*")
      .eq("id", id)
      .eq("type", "project")
      .maybeSingle(),
    searchProfilesForOwner("", "project"),
  ]);
  const profiles = profileOptions ?? [];
  if (error) {
    return (
      <AdminPage title="Project">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">{error.message}</div>
      </AdminPage>
    );
  }
  if (!listing) return notFound();

  const saved = toText(searchParams.saved) === "1";
  const errorMsg = toText(searchParams.error);
  const showError = Boolean(errorMsg);
  const showSuccess = saved && !showError;

  return (
    <AdminPage
      title={toText(listing.title) || "Project"}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={getListingUrl({ id, type: "project" })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Preview
          </Link>
          <form action={duplicateProjectAction}>
            <input type="hidden" name="_listingId" value={id} />
            <button type="submit" className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:opacity-90">
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
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <form action={updateAdminProjectAction} className="space-y-4">
              <input type="hidden" name="_listingId" value={id} />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-zinc-900">Title</label>
                  <input
                    name="title"
                    defaultValue={toText(listing.title)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">Location</label>
                  <input
                    name="location"
                    defaultValue={toText(listing.location)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">Year</label>
                  <input
                    name="year"
                    defaultValue={toText(listing.year)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">Category</label>
                  <input
                    name="category"
                    defaultValue={toText(listing.category)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">Cover image URL</label>
                  <input
                    name="cover_image_url"
                    defaultValue={toText(listing.cover_image_url)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-zinc-900">Description</label>
                <textarea
                  name="description"
                  defaultValue={toText(listing.description)}
                  rows={8}
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                />
              </div>

              <button
                type="submit"
                className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:opacity-90"
              >
                Save
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-900">Quality snapshot</div>
            <div className="mt-2 space-y-1 text-sm text-zinc-700">
              <div>
                Missing description:{" "}
                <span className="font-medium">{listing.description ? "No" : "Yes"}</span>
              </div>
              <div>
                Missing image:{" "}
                <span className="font-medium">{listing.cover_image_url ? "No" : "Yes"}</span>
              </div>
              <div>
                Missing year: <span className="font-medium">{listing.year ? "No" : "Yes"}</span>
              </div>
              <div>
                Missing location:{" "}
                <span className="font-medium">{listing.location ? "No" : "Yes"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-900">Connections</div>
            <div className="mt-2 text-sm text-zinc-600">
              Link products for this project in{" "}
              <Link href={`/admin/connections?projectId=${encodeURIComponent(id)}`} className="font-medium text-zinc-900 hover:underline">
                Connections
              </Link>
              .
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}

