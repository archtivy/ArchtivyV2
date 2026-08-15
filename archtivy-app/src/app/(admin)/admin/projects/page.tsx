import Link from "next/link";
import { AdminPageShell, Toolbar, SearchField, FilterChip, ErrorPanel } from "@/components/admin/ui/AdminPageShell";
import { AdminListingsTable } from "@/components/admin/AdminListingsTable";
import { ReviewQueue } from "@/components/admin/review/ReviewQueue";
import { getListingsAwaitingReview } from "@/lib/admin/reviewRows";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from "@/components/admin/ui/tokens";

type SearchParams = { [key: string]: string | string[] | undefined };

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export default async function AdminProjectsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = getSupabaseServiceClient();
  const q = toText(searchParams.q);
  const year = toText(searchParams.year);
  const missing = toText(searchParams.missing);
  const noLinks = toText(searchParams.noLinks);
  const hasFilters = !!(q || year || missing === "1" || noLinks === "1");

  let query = supabase
    .from("listings")
    .select("id,title,status,location,year,created_at,cover_image_url")
    .eq("type", "project")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) query = query.ilike("title", `%${q}%`);
  if (year) query = query.eq("year", year);
  if (missing === "1")
    query = query.or("description.is.null,location.is.null,year.is.null,cover_image_url.is.null");

  // The review queue is loaded alongside the list so a pending submission is
  // visible without a second navigation — approval is the time-critical action.
  const [{ data: rows, error }, reviewItems] = await Promise.all([
    query,
    getListingsAwaitingReview("project"),
  ]);

  if (error) {
    return (
      <AdminPageShell title="Projects">
        <ErrorPanel message={error.message} />
      </AdminPageShell>
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
      status: (r.status as string | null) ?? null,
      location: (r.location as string | null) ?? null,
      year: (r.year as string | number | null) ?? null,
      created_at: r.created_at as string,
      cover_image_url: (r.cover_image_url as string | null) ?? null,
      image_count: imageCount[r.id as string] ?? 0,
      linked_count: linkCount[r.id as string] ?? 0,
    }))
    .filter((r) => (noLinks === "1" ? r.linked_count === 0 : true));

  return (
    <AdminPageShell
      title="Projects"
      description="Review submissions, then browse and edit the published catalogue."
      actions={
        <Link href="/admin/projects/new" className={BTN_PRIMARY}>
          Create project
        </Link>
      }
      toolbar={
        <form className="contents">
          <Toolbar>
            <SearchField name="q" defaultValue={q} placeholder="Search project titles…" />
            <input
              name="year"
              defaultValue={year}
              placeholder="Year"
              aria-label="Filter by year"
              className={`${INPUT} w-28`}
            />
            <FilterChip name="missing" label="Missing info" defaultChecked={missing === "1"} />
            <FilterChip
              name="noLinks"
              label="No products linked"
              defaultChecked={noLinks === "1"}
            />
            <button type="submit" className={BTN_SECONDARY}>
              Apply
            </button>
            {hasFilters && (
              <Link href="/admin/projects" className={BTN_SECONDARY}>
                Clear
              </Link>
            )}
          </Toolbar>
        </form>
      }
    >
      <div className="space-y-6">
        {reviewItems.length > 0 && (
          <ReviewQueue items={reviewItems} title="Projects awaiting review" />
        )}
        {/* showDelete stays off, as before — bulk delete was never enabled on
            this page and turning it on is a scope change, not a redesign. */}
        <AdminListingsTable kind="project" rows={tableRows} filtered={hasFilters} />
      </div>
    </AdminPageShell>
  );
}
