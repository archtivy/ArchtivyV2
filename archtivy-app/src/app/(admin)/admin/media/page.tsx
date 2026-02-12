import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { updateImageAlt } from "@/app/(admin)/admin/_actions/media";

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export default async function AdminMediaPage() {
  const supabase = getSupabaseServiceClient();
  const { data: images, error } = await supabase
    .from("listing_images")
    .select("id,listing_id,image_url,alt,sort_order,created_at")
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    return (
      <AdminPage title="Media">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
          {error.message}
        </div>
      </AdminPage>
    );
  }

  const listingIds = Array.from(new Set((images ?? []).map((i: any) => i.listing_id).filter(Boolean)));
  const { data: listings } = await supabase.from("listings").select("id, type, title").in("id", listingIds);
  const listingMap = new Map((listings ?? []).map((l: any) => [l.id, l]));

  async function updateAltAction(formData: FormData) {
    "use server";
    const imageId = toText(formData.get("image_id"));
    const alt = toText(formData.get("alt"));
    const res = await updateImageAlt({ imageId, alt: alt || null });
    if (!res.ok) throw new Error(res.error);
  }

  return (
    <AdminPage title="Media">
      <div className="rounded-xl border border-zinc-200 bg-white">
        <div className="w-full overflow-x-auto">
          <table className="w-full min-w-[1080px] border-collapse">
            <thead>
              <tr className="border-b border-zinc-200 bg-white">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Preview
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Used in
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Resolution
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Alt text
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">
                  Warnings
                </th>
              </tr>
            </thead>
            <tbody>
              {(images ?? []).map((img: any) => {
                const listing = listingMap.get(img.listing_id);
                const listingTitle = listing ? toText(listing.title) || "—" : "—";
                const listingType = listing ? (listing.type === "project" ? "Project" : "Product") : "Listing";
                const missingAlt = !toText(img.alt);
                return (
                  <tr key={img.id} className="border-b border-zinc-100 hover:bg-zinc-50">
                    <td className="px-4 py-3">
                      <div className="h-14 w-20 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={img.image_url} alt="" className="h-full w-full object-cover" />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-zinc-900">
                        <Link
                          href={
                            listing?.type === "project"
                              ? `/admin/projects/${img.listing_id}`
                              : `/admin/products/${img.listing_id}`
                          }
                          className="hover:underline"
                        >
                          {listingTitle}
                        </Link>
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {listingType} • {img.listing_id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">—</td>
                    <td className="px-4 py-3">
                      <form action={updateAltAction} className="flex items-center gap-2">
                        <input type="hidden" name="image_id" value={img.id} />
                        <input
                          name="alt"
                          defaultValue={toText(img.alt)}
                          placeholder="Add alt text…"
                          className="h-9 w-96 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
                        />
                        <button className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100">
                          Save
                        </button>
                      </form>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">
                      <div className="space-y-1">
                        {missingAlt ? (
                          <div className="inline-flex rounded-md bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">
                            Missing alt text
                          </div>
                        ) : (
                          <div className="text-xs text-zinc-500">—</div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(images ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-zinc-500">
                    No media found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </AdminPage>
  );
}

