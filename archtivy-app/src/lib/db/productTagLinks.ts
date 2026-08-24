import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { PUBLIC_STATUSES } from "@/lib/db/productTags";

/**
 * Keeps project_product_links in step with product_tags.
 *
 * ── THE GAP THIS CLOSES ─────────────────────────────────────────────────────
 * project_product_links is the relational edge that Explore, the network graph,
 * connection counts and both detail pages' "used in" rails actually read. The
 * LEGACY tagging path (photo_product_tags.addPhotoProductTag) maintained it. The
 * CANONICAL path (app/actions/productTags.ts) never did — so a pin placed in the
 * self-serve PinEditor drew a hotspot on the photo and created no relationship
 * at all. Two products were sitting in that state in production.
 *
 * ── ONE RULE, NOT AN ADD PATH AND A REMOVE PATH ─────────────────────────────
 * The edge exists if and only if at least one PUBLICLY VISIBLE tag links that
 * project to that product. Everything else falls out of it: creating a pin adds
 * the edge, deleting the last one removes it, confirming an AI suggestion adds
 * it, rejecting it takes it away again.
 *
 * Stating it as an invariant and recomputing, rather than incrementing and
 * decrementing, is what makes it idempotent — a retry, a double-click or a
 * replayed action all converge on the same answer instead of drifting.
 *
 * ── WHY *PUBLIC* TAGS AND NOT ALL TAGS ──────────────────────────────────────
 * An AI-suggested pin lands `unverified` and is hidden on the public page. If it
 * created an edge, the product would be listed as "used in this project" for
 * every visitor while the pin proving it stayed invisible — and an AI suggestion
 * would have quietly authored a public claim. That is exactly the promotion the
 * tagging actions refuse to do anywhere else ("AI CONFIDENCE NEVER PROMOTES").
 *
 * ── MANUAL OUTRANKS PHOTO_TAG ───────────────────────────────────────────────
 * A `manual` row means the author explicitly listed the product on the Products
 * step. It is never overwritten and never deleted here, in either direction —
 * removing the last pin must not silently un-list a product the author put there
 * by hand. This mirrors the precedence the legacy path already documented.
 */

const PPL = "project_product_links";

/**
 * Recompute the link between one project and one product.
 *
 * Safe to call after any product_tags mutation, including ones that changed
 * nothing. Failures are logged, never thrown: a tag that saved correctly must
 * not be reported as failed because a derived edge could not be written.
 *
 * ── WHY REMOVAL HAS TO BE ASKED FOR ─────────────────────────────────────────
 * product_tags is not the only writer of source='photo_tag'. The AI workstation
 * (app/actions/smartProductTagging.ts) upserts these rows directly, and 9 such
 * links exist in production with no product_tags row behind them at all.
 *
 * A rule of "delete the edge whenever no public tag exists" would let an
 * unrelated pin edit on one of those pairs quietly destroy a relationship this
 * module never created and knows nothing about. So removal is opt-in, and
 * callers pass it only when they have just taken a PUBLIC tag away from this
 * exact pair — a deletion or a rejection. Then the edge being reconsidered is
 * demonstrably one that tagging was responsible for.
 *
 * The asymmetry is deliberate: adding a link is additive and safe to infer,
 * removing one destroys information and has to be earned.
 */
export async function reconcilePhotoTagLink(
  listingId: string,
  productId: string,
  options: { allowRemoval?: boolean } = {}
): Promise<void> {
  const sup = getSupabaseServiceClient();

  // project_product_links is a PROJECT-to-product edge. product_tags allows a
  // product's own gallery to carry tags too, and writing that listing id into
  // project_id would fabricate a project that does not exist.
  const { data: parent } = await sup
    .from("listings")
    .select("type")
    .eq("id", listingId)
    .maybeSingle();
  if ((parent as { type?: string } | null)?.type !== "project") return;

  const { count, error: countError } = await sup
    .from("product_tags")
    .select("*", { count: "exact", head: true })
    .eq("listing_id", listingId)
    .eq("tagged_listing_id", productId)
    .in("verification_status", PUBLIC_STATUSES);

  if (countError) {
    console.error("[productTagLinks] tag count failed:", countError.code, countError.message);
    return;
  }

  const { data: existing } = await sup
    .from(PPL)
    .select("source")
    .eq("project_id", listingId)
    .eq("product_id", productId)
    .maybeSingle();
  const source = (existing as { source?: string } | null)?.source ?? null;

  // The author said so by hand. Nothing derived from pins may touch it.
  if (source === "manual") return;

  if ((count ?? 0) > 0) {
    if (source === "photo_tag") return;
    const { error } = await sup
      .from(PPL)
      .upsert(
        { project_id: listingId, product_id: productId, source: "photo_tag" },
        { onConflict: "project_id,product_id" }
      );
    if (error) {
      console.error("[productTagLinks] link upsert failed:", error.code, error.message);
    }
    return;
  }

  // No public tag left. Only act if the caller just removed one — otherwise
  // this edge may be an AI-workstation link that was never ours to withdraw.
  if (source === "photo_tag" && options.allowRemoval === true) {
    const { error } = await sup
      .from(PPL)
      .delete()
      .eq("project_id", listingId)
      .eq("product_id", productId)
      .eq("source", "photo_tag");
    if (error) {
      console.error("[productTagLinks] link delete failed:", error.code, error.message);
    }
  }
}
