import Link from "next/link";
import { AdminPageShell, Toolbar, SearchField, FilterChip, ErrorPanel } from "@/components/admin/ui/AdminPageShell";
import { AdminListingsTable } from "@/components/admin/AdminListingsTable";
import { ReviewQueue } from "@/components/admin/review/ReviewQueue";
import { getListingsAwaitingReview } from "@/lib/admin/reviewRows";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { BTN_PRIMARY, BTN_SECONDARY, INPUT } from "@/components/admin/ui/tokens";

type SearchParams = { [key: string]: string | string[] | undefined };

const toText = (v: unknown) => (v == null ? "" : String(v).trim());

export default async function AdminProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = getSupabaseServiceClient();
  const q = toText(searchParams.q);
  const category = toText(searchParams.category);
  const neverUsed = toText(searchParams.neverUsed);
  const hasFilters = !!(q || category || neverUsed === "1");

  let query = supabase
    .from("listings")
    .select("id,title,status,location,year,created_at,cover_image_url,category,material_or_finish")
    .eq("type", "product")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  if (q) query = query.ilike("title", `%${q}%`);
  if (category) query = query.eq("category", category);

  // Products are the flow that actually produces PENDING rows — the product
  // wizard submits for review rather than publishing directly — so the queue
  // matters more here than anywhere else.
  const [{ data: rows, error }, reviewItems] = await Promise.all([
    query,
    getListingsAwaitingReview("product"),
  ]);

  if (error) {
    return (
      <AdminPageShell title="Products">
        <ErrorPanel message={error.message} />
      </AdminPageShell>
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
      status: (r.status as string | null) ?? null,
      location: (r.location as string | null) ?? null,
      year: (r.year as string | number | null) ?? null,
      created_at: r.created_at as string,
      cover_image_url: (r.cover_image_url as string | null) ?? null,
      image_count: imageCount[r.id as string] ?? 0,
      linked_count: linkCount[r.id as string] ?? 0,
    }))
    .filter((r) => (neverUsed === "1" ? r.linked_count === 0 : true));

  return (
    <AdminPageShell
      title="Products"
      description="Review submissions, then browse and edit the published catalogue."
      actions={
        <Link href="/admin/products/new" className={BTN_PRIMARY}>
          Create product
        </Link>
      }
      toolbar={
        <form className="contents">
          <Toolbar>
            <SearchField name="q" defaultValue={q} placeholder="Search product titles…" />
            <input
              name="category"
              defaultValue={category}
              placeholder="Category"
              aria-label="Filter by category"
              className={`${INPUT} w-52`}
            />
            <FilterChip
              name="neverUsed"
              label="Never used in projects"
              defaultChecked={neverUsed === "1"}
            />
            <button type="submit" className={BTN_SECONDARY}>
              Apply
            </button>
            {hasFilters && (
              <Link href="/admin/products" className={BTN_SECONDARY}>
                Clear
              </Link>
            )}
          </Toolbar>
        </form>
      }
    >
      <div className="space-y-6">
        {reviewItems.length > 0 && (
          <ReviewQueue items={reviewItems} title="Products awaiting review" />
        )}
        <AdminListingsTable kind="product" rows={tableRows} filtered={hasFilters} />
      </div>
    </AdminPageShell>
  );
}
