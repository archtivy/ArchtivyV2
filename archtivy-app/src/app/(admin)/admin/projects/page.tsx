import Link from "next/link";
import { AdminPage } from "@/components/admin/AdminPage";
import { AdminListingsTable } from "@/components/admin/AdminListingsTable";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

type SearchParams = { [key: string]: string | string[] | undefined };

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export default async function AdminProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = getSupabaseServiceClient();
  const q = toText(searchParams.q);
  const year = toText(searchParams.year);
  const missing = toText(searchParams.missing);
  const noLinks = toText(searchParams.noLinks);

  let query = supabase
    .from("listings")
    .select("id,title,location,year,created_at,cover_image_url")
    .eq("type", "project")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) query = query.ilike("title", `%${q}%`);
  if (year) query = query.eq("year", year);
  if (missing === "1") query = query.or("description.is.null,location.is.null,year.is.null,cover_image_url.is.null");

  const { data: rows, error } = await query;
  if (error) {
    return (
      <AdminPage title="Projects">
        <div className="rounded-xl border border-red-200 bg-white p-4 text-sm text-red-700">
          {error.message}
        </div>
      </AdminPage>
    );
  }

  const ids = (rows ?? []).map((r) => r.id as string).filter(Boolean);
  const [imagesRes, linksRes] = await Promise.all([
    supabase.from("listing_images").select("listing_id").in("listing_id", ids),
    supabase.from("project_product_links").select("project_id").in("project_id", ids),
  ]);

  const imageCount: Record<string, number> = {};
  for (const r of (imagesRes.data ?? []) as Array<{ listing_id: string }>) {
    imageCount[r.listing_id] = (imageCount[r.listing_id] ?? 0) + 1;
  }
  const linkCount: Record<string, number> = {};
  for (const r of (linksRes.data ?? []) as Array<{ project_id: string }>) {
    linkCount[r.project_id] = (linkCount[r.project_id] ?? 0) + 1;
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
    .filter((r) => (noLinks === "1" ? r.linked_count === 0 : true));

  return (
    <AdminPage
      title="Projects"
      actions={
        <Link
          href="/admin/projects/new"
          className="rounded-lg bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          + Create Project
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
            name="year"
            defaultValue={year}
            placeholder="Year"
            className="h-9 w-28 rounded-lg border border-zinc-300 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900/20"
          />
          <label className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700">
            <input type="checkbox" name="missing" value="1" defaultChecked={missing === "1"} />
            Missing info
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700">
            <input type="checkbox" name="noLinks" value="1" defaultChecked={noLinks === "1"} />
            No products linked
          </label>
          <button
            type="submit"
            className="h-9 rounded-lg border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
          >
            Apply
          </button>
        </form>
      </div>

      <AdminListingsTable kind="project" rows={tableRows} />
    </AdminPage>
  );
}

