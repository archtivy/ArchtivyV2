import { requireAdmin } from "@/lib/admin/guard";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { excerptFrom } from "@/lib/markdown/render";
import { AdminPageShell } from "@/components/admin/ui/AdminPageShell";
import { ReviewQueueClient, type QueueRow } from "./ReviewQueueClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Magazine review queue.
 *
 * BUILT NEW, NOT EXTENDED. The technical spec assumed an existing Admin
 * Verification Queue to plug into; there isn't one. Approval today exists only
 * as a per-item button on /admin/projects/[id] and /admin/products/[id] when
 * status === "PENDING", and no user-facing create path ever sets PENDING —
 * createProject and createListing insert APPROVED directly. So there was no
 * queue to reuse, and articles are the first content type with a real review
 * gate. See DATA_INTEGRITY_LOG.md for that inconsistency.
 *
 * Kept deliberately small and generic in shape: if projects and products are
 * ever gated too, this page is the thing to widen rather than a second queue.
 */
export default async function AdminMagazinePage() {
  await requireAdmin();

  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from("articles")
    .select(
      "id, title, dek, body_md, status, slug, read_time_minutes, is_featured, updated_at, " +
        "profiles:author_profile_id(display_name, username), " +
        "taxonomy_nodes:topic_node_id(label)"
    )
    .in("status", ["pending_review", "published"])
    .is("deleted_at", null)
    .order("status", { ascending: true })
    .order("updated_at", { ascending: false });

  // The table may not exist yet — the migration is prepared but unapplied.
  const missingTable = error?.code === "42P01";
  if (error && !missingTable) {
    console.error("[admin/magazine] query failed:", error.message);
  }

  const one = <T,>(v: T | T[] | null | undefined): T | null =>
    Array.isArray(v) ? v[0] ?? null : v ?? null;

  const rows: QueueRow[] = ((data ?? []) as unknown as {
    id: string;
    title: string;
    dek: string | null;
    body_md: string;
    status: string;
    slug: string | null;
    read_time_minutes: number;
    is_featured: boolean;
    updated_at: string;
    profiles: { display_name: string | null; username: string | null } | { display_name: string | null; username: string | null }[] | null;
    taxonomy_nodes: { label: string } | { label: string }[] | null;
  }[]).map((r) => {
    const author = one(r.profiles);
    return {
      id: r.id,
      title: r.title,
      dek: r.dek,
      status: r.status,
      slug: r.slug,
      authorName: author?.display_name?.trim() || author?.username || "Unknown",
      topic: one(r.taxonomy_nodes)?.label ?? null,
      readTimeMinutes: r.read_time_minutes,
      isFeatured: r.is_featured,
      updatedAt: r.updated_at,
      bodyExcerpt: excerptFrom(r.body_md, 320),
    };
  });

  const pendingCount = rows.filter((r) => r.status === "pending_review").length;

  return (
    <AdminPageShell
      title="Magazine"
      description={
        pendingCount > 0
          ? `${pendingCount} article${pendingCount === 1 ? "" : "s"} waiting for review.`
          : "Review submitted articles and choose which appear as Featured Stories."
      }
    >
      {missingTable ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 px-5 py-4 font-body text-[14px] text-amber-800">
          The <code>articles</code> table does not exist yet. Apply{" "}
          <code>supabase/migrations/20260808101000_magazine_articles.sql</code> to
          enable the Magazine.
        </div>
      ) : (
        <ReviewQueueClient rows={rows} />
      )}
    </AdminPageShell>
  );
}
