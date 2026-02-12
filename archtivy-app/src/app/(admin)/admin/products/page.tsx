import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminListingsTable } from "@/components/admin/AdminListingsTable";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

type SearchParams = { [key: string]: string | string[] | undefined };

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = getSupabaseServiceClient();
  const q = toText(searchParams.q);
  const category = toText(searchParams.category);
  const neverUsed = toText(searchParams.neverUsed);

  let query = supabase
    .from("listings")
    .select("id,title,location,year,created_at,cover_image_url,category,material_or_finish")
    .eq("type", "product")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) query = query.ilike("title", `%${q}%`);
  if (category) query = query.eq("category", category);

  const { data: rows, error } = await query;
  if (error) {
    return (
      <AdminPage title="Products">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
          {error.message}
        </div>
      </AdminPage>
    );
  }

  const ids = (rows ?? []).map((r) => r.id as string).filter(Boolean);
  const [imagesRes, linksRes] = await Promise.all([
    supabase.from("listing_images").select("listing_id").in("listing_id", ids),
    supabase.from("project_product_links").select("product_id").in("product_id", ids),
  ]);

  const imageCount: Record<string, number> = {};
  for (const r of (imagesRes.data ?? []) as Array<{ listing_id: string }>) {
    imageCount[r.listing_id] = (imageCount[r.listing_id] ?? 0) + 1;
  }
  const linkCount: Record<string, number> = {};
  for (const r of (linksRes.data ?? []) as Array<{ product_id: string }>) {
    linkCount[r.product_id] = (linkCount[r.product_id] ?? 0) + 1;
  }

  const tableRows = (rows ?? [])
    .map((r) => ({
      id: r.id as string,
      title: (r.title as string | null) ?? null,
      location: (r.location as string | null) ?? null,
      year: (r.year as string | number | null) ?? null,
      created_at: r.created_at as string,
      cover_image_url: (r.cover_image_url as string | null) ?? null,
      image_count: imageCount[r.id as string] ?? 0,
      linked_count: linkCount[r.id as string] ?? 0,
    }))
    .filter((r) => (neverUsed === "1" ? r.linked_count === 0 : true));

  return (
    <AdminPage
      title="Products"
      actions={
        <Link
          href="/admin/products/new"
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Create Product
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search title…"
            className="h-9 w-64 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
          <input
            name="category"
            defaultValue={category}
            placeholder="Category"
            className="h-9 w-56 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
          <label className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700">
            <input type="checkbox" name="neverUsed" value="1" defaultChecked={neverUsed === "1"} />
            Never used in projects
          </label>
          <button
            type="submit"
            className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Apply
          </button>
        </form>
      </div>

      <AdminListingsTable kind="product" rows={tableRows} />
    </AdminPage>
  );
}

