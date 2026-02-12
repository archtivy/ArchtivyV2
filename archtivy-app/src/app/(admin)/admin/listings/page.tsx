import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminListingsTable } from "@/components/admin/AdminListingsTable";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

type SearchParams = { [key: string]: string | string[] | undefined };

const toText = (v: unknown) => (v == null ? "" : String(v).trim());
const PAGE_SIZE = 20;

export default async function AdminListingsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = getSupabaseServiceClient();
  const tab = toText(searchParams.tab) === "products" ? "products" : "projects";
  const page = Math.max(1, parseInt(toText(searchParams.page), 10) || 1);
  const q = toText(searchParams.q);
  const year = toText(searchParams.year);
  const location = toText(searchParams.location);
  const noLinks = toText(searchParams.noLinks);
  const category = toText(searchParams.category);

  const offset = (page - 1) * PAGE_SIZE;

  let query = supabase
    .from("listings")
    .select("id,title,location,year,created_at,cover_image_url,category", { count: "exact" })
    .eq("type", tab === "projects" ? "project" : "product")
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (q) query = query.ilike("title", `%${q}%`);
  if (year) query = query.eq("year", year);
  if (location) query = query.ilike("location", `%${location}%`);
  if (tab === "products" && category) query = query.eq("category", category);

  const { data: rows, error, count } = await query;
  if (error) {
    return (
      <AdminPage title="Listings">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
          {error.message}
        </div>
      </AdminPage>
    );
  }

  const ids = (rows ?? []).map((r) => r.id as string).filter(Boolean);
  const linkCol = tab === "projects" ? "project_id" : "product_id";
  const [imagesRes, linksRes] = await Promise.all([
    supabase.from("listing_images").select("listing_id").in("listing_id", ids),
    ids.length > 0 ? supabase.from("project_product_links").select(linkCol).in(linkCol, ids) : { data: [] as { [k: string]: string }[] },
  ]);

  const imageCount: Record<string, number> = {};
  for (const r of (imagesRes.data ?? []) as Array<{ listing_id: string }>) {
    imageCount[r.listing_id] = (imageCount[r.listing_id] ?? 0) + 1;
  }
  const linkCount: Record<string, number> = {};
  for (const r of (linksRes.data ?? []) as Array<{ project_id?: string; product_id?: string }>) {
    const id = (r.project_id ?? r.product_id) as string;
    if (id) linkCount[id] = (linkCount[id] ?? 0) + 1;
  }

  let tableRows = (rows ?? []).map((r) => ({
    id: r.id as string,
    title: (r.title as string | null) ?? null,
    location: (r.location as string | null) ?? null,
    year: (r.year as string | number | null) ?? null,
    created_at: (r.created_at as string) ?? "",
    cover_image_url: (r.cover_image_url as string | null) ?? null,
    image_count: imageCount[r.id as string] ?? 0,
    linked_count: linkCount[r.id as string] ?? 0,
  }));
  if (noLinks === "1") tableRows = tableRows.filter((r) => r.linked_count === 0);

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <AdminPage
      title="Listings"
      actions={
        <Link
          href={tab === "projects" ? "/admin/projects/new" : "/admin/products/new"}
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Create {tab === "projects" ? "Project" : "Product"}
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-zinc-200 pb-4">
        <div className="flex rounded-lg border border-zinc-200 bg-white p-0.5">
          <Link
            href="/admin/listings?tab=projects"
            className={`rounded-md px-3 py-2 text-sm font-medium ${tab === "projects" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
          >
            Projects
          </Link>
          <Link
            href="/admin/listings?tab=products"
            className={`rounded-md px-3 py-2 text-sm font-medium ${tab === "products" ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"}`}
          >
            Products
          </Link>
        </div>
        <form className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="tab" value={tab} />
          <input
            name="q"
            defaultValue={q}
            placeholder="Search title or slug…"
            className="h-9 w-64 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
          <input
            name="year"
            defaultValue={year}
            placeholder="Year"
            className="h-9 w-24 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
          <input
            name="location"
            defaultValue={location}
            placeholder="Location"
            className="h-9 w-40 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
          {tab === "products" && (
            <input
              name="category"
              defaultValue={category}
              placeholder="Category"
              className="h-9 w-36 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
            />
          )}
          <label className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700">
            <input type="checkbox" name="noLinks" value="1" defaultChecked={noLinks === "1"} />
            No links
          </label>
          <button
            type="submit"
            className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Apply
          </button>
        </form>
      </div>

      <AdminListingsTable kind={tab === "projects" ? "project" : "product"} rows={tableRows} showDelete />

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm text-zinc-600">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/listings?tab=${tab}&page=${page - 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${year ? `&year=${encodeURIComponent(year)}` : ""}${location ? `&location=${encodeURIComponent(location)}` : ""}${noLinks === "1" ? "&noLinks=1" : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-medium hover:bg-zinc-50"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/listings?tab=${tab}&page=${page + 1}${q ? `&q=${encodeURIComponent(q)}` : ""}${year ? `&year=${encodeURIComponent(year)}` : ""}${location ? `&location=${encodeURIComponent(location)}` : ""}${noLinks === "1" ? "&noLinks=1" : ""}${category ? `&category=${encodeURIComponent(category)}` : ""}`}
                className="rounded-lg border border-zinc-300 bg-white px-3 py-2 font-medium hover:bg-zinc-50"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </AdminPage>
  );
}
