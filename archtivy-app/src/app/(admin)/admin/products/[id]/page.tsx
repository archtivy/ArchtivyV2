import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPage } from "@/components/admin/AdminPage";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { searchProfilesForOwner } from "@/lib/db/profiles";
import { getListingUrl } from "@/lib/canonical";
import { updateAdminProductAction, duplicateProductAction } from "../actions";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

type SearchParams = { [key: string]: string | string[] | undefined };

export default async function AdminProductEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const supabase = getSupabaseServiceClient();
  const [{ data: listing, error }, { data: profileOptions }] = await Promise.all([
    supabase.from("listings").select("*").eq("id", id).eq("type", "product").maybeSingle(),
    searchProfilesForOwner("", "product"),
  ]);
  const profiles = profileOptions ?? [];

  if (error) {
    return (
      <AdminPage title="Product">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">{error.message}</div>
      </AdminPage>
    );
  }
  if (!listing) return notFound();

  const saved = toText(searchParams.saved) === "1";
  const errorMsg = toText(searchParams.error);
  const showError = Boolean(errorMsg);
  const showSuccess = saved && !showError;
  const currentOwnerProfileId = (listing as { owner_profile_id?: string | null }).owner_profile_id ?? "";

  return (
    <AdminPage
      title={toText(listing.title) || "Product"}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href={getListingUrl({ id, type: "product" })}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Preview
          </Link>
          <form action={duplicateProductAction}>
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
            <form action={updateAdminProductAction} className="space-y-4">
              <input type="hidden" name="_listingId" value={id} />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-zinc-900">Owner profile</label>
                  <select
                    name="owner_profile_id"
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                    defaultValue={currentOwnerProfileId}
                  >
                    <option value="">— None —</option>
                    {profiles.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name || p.username || p.id}
                        {p.username ? ` (@${p.username})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-zinc-900">Title</label>
                  <input
                    name="title"
                    defaultValue={toText(listing.title)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">Brand / Category</label>
                  <input
                    name="category"
                    defaultValue={toText(listing.category)}
                    placeholder="Category"
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">Product type</label>
                  <input
                    name="product_type"
                    defaultValue={toText(listing.product_type)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">Material / Finish</label>
                  <input
                    name="material_or_finish"
                    defaultValue={toText(listing.material_or_finish)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-900">Dimensions</label>
                  <input
                    name="dimensions"
                    defaultValue={toText(listing.dimensions)}
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
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-zinc-900">Feature highlight</label>
                  <input
                    name="feature_highlight"
                    defaultValue={toText(listing.feature_highlight)}
                    className="mt-1 h-10 w-full rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                  />
                </div>
                <div className="md:col-span-2">
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
                Missing category:{" "}
                <span className="font-medium">{listing.category ? "No" : "Yes"}</span>
              </div>
              <div>
                Missing material/finish:{" "}
                <span className="font-medium">{listing.material_or_finish ? "No" : "Yes"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="text-sm font-semibold text-zinc-900">Connections</div>
            <div className="mt-2 text-sm text-zinc-600">
              See projects using this product in{" "}
              <Link href={`/admin/connections?productId=${encodeURIComponent(id)}`} className="font-medium text-zinc-900 hover:underline">
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

