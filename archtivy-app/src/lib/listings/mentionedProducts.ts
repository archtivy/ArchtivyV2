import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * `listings.mentioned_products` — one shape, read from three.
 *
 * ── THE BUG THIS FIXES ──────────────────────────────────────────────────────
 * This column has been written in two incompatible shapes by two different
 * code paths, and read by a third that understood only one of them:
 *
 *   [{ brand_name_text, product_name_text }]   ← createProject, the admin form
 *   ["<product-uuid>", ...]                    ← updateProjectCanonical
 *
 * The consequences were all silent:
 *
 *   · createProject parsed the field with an object-shaped filter, so the
 *     publish wizard's entire "Products used" step was DISCARDED on create.
 *     Every product an author tagged while first publishing was dropped.
 *   · canonical-models applied the same object filter on read, so the uuid
 *     rows that updateProjectCanonical did write were invisible on the public
 *     project page.
 *   · getListingForEdit mapped the column with String(x), turning the object
 *     rows into the literal string "[object Object]". Opening such a project
 *     in the wizard showed an empty Products step, and saving wrote
 *     ["[object Object]"] over the real brand/product text.
 *
 * ── THE CANONICAL SHAPE ─────────────────────────────────────────────────────
 * The object shape, with an optional `product_id`:
 *
 *   { brand_name_text, product_name_text, product_id?: string | null }
 *
 * Chosen because it is strictly additive. Every historical object row is
 * already valid under it, so no backfill is required and no existing reader
 * breaks. A uuid row normalises INTO it, gaining readable text instead of
 * staying an opaque id.
 *
 * `product_id` is the difference between a guess and a fact. Without it,
 * resolveMentionedProducts had to fuzzy-match the typed product name against
 * every approved product title to find a link. When the author picked from
 * the wizard's picker we know exactly which product they meant, so we record
 * it and skip the guessing.
 *
 * ── LINKS ARE SEPARATE ──────────────────────────────────────────────────────
 * This column is the author's stated list. `project_product_links` is the
 * relational edge that Explore, the admin connection counts and the network
 * graph all read. Nothing wrote that table from either publish path — see
 * syncMentionedProductLinks in the create/update actions for the fix.
 */

export interface MentionedProduct {
  brand_name_text: string;
  product_name_text: string;
  /**
   * Set when the author picked a real product listing rather than typing a
   * name. Null/absent for free-text entries, which stay first-class: an admin
   * naming a product that is not on the platform is a legitimate case.
   */
  product_id?: string | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function text(v: unknown): string {
  return v == null ? "" : String(v).trim();
}

/**
 * Read any shape the column has ever held into the canonical one.
 *
 * Deliberately lossy in exactly one direction: entries that carry neither a
 * product_id nor any text are dropped, since they say nothing. Everything
 * else is preserved — a free-text entry whose product is not on the platform
 * must survive a round-trip through the wizard untouched.
 */
export function normaliseMentionedProducts(value: unknown): MentionedProduct[] {
  if (!Array.isArray(value)) return [];

  const out: MentionedProduct[] = [];
  for (const raw of value) {
    // Shape 2: a bare uuid string, written by updateProjectCanonical.
    if (typeof raw === "string") {
      const s = raw.trim();
      if (!s) continue;
      if (UUID_RE.test(s)) {
        out.push({ brand_name_text: "", product_name_text: "", product_id: s });
      } else {
        // A non-uuid string is a product name someone typed. Note this never
        // includes "[object Object]" — that only ever existed transiently in
        // getListingForEdit's output and was never written back before this
        // module landed, but it is filtered below regardless.
        if (s === "[object Object]") continue;
        out.push({ brand_name_text: "", product_name_text: s, product_id: null });
      }
      continue;
    }

    // Shape 1 (and canonical): an object.
    if (raw && typeof raw === "object") {
      const o = raw as Record<string, unknown>;
      const productId = text(o.product_id);
      const entry: MentionedProduct = {
        brand_name_text: text(o.brand_name_text),
        product_name_text: text(o.product_name_text),
        product_id: productId && UUID_RE.test(productId) ? productId : null,
      };
      if (!entry.product_id && !entry.brand_name_text && !entry.product_name_text) continue;
      out.push(entry);
    }
  }
  return out;
}

/** Parse the `mentioned_products` FormData field, in whichever shape it arrives. */
export function parseMentionedProductsField(
  value: FormDataEntryValue | null
): MentionedProduct[] {
  if (!value || typeof value !== "string" || !value.trim()) return [];
  try {
    return normaliseMentionedProducts(JSON.parse(value) as unknown);
  } catch {
    return [];
  }
}

/** The linked product ids, de-duplicated. Free-text entries contribute nothing. */
export function mentionedProductIds(entries: MentionedProduct[]): string[] {
  return Array.from(
    new Set(entries.map((e) => e.product_id).filter((id): id is string => Boolean(id)))
  );
}

/**
 * Fill in brand/product text for entries that carry a product_id but no text.
 *
 * Runs on write, so the stored row is self-describing: a reader that knows
 * nothing about product_id still sees a usable brand and product name, and
 * the public page renders correctly even if the product is later deleted.
 *
 * Best-effort — a lookup failure leaves the entry as-is rather than failing
 * the submission, since the id is the load-bearing part.
 */
export async function hydrateMentionedProducts(
  supabase: SupabaseClient,
  entries: MentionedProduct[]
): Promise<MentionedProduct[]> {
  const needsText = entries.filter(
    (e) => e.product_id && (!e.product_name_text || !e.brand_name_text)
  );
  if (needsText.length === 0) return entries;

  const ids = Array.from(new Set(needsText.map((e) => e.product_id!)));
  const { data: rows, error } = await supabase
    .from("listings")
    .select("id, title, owner_profile_id")
    .in("id", ids);
  if (error || !rows) return entries;

  const products = rows as { id: string; title: string | null; owner_profile_id: string | null }[];
  const ownerIds = Array.from(
    new Set(products.map((p) => p.owner_profile_id).filter((v): v is string => Boolean(v)))
  );

  const brandByProfile = new Map<string, string>();
  if (ownerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ownerIds);
    for (const p of (profiles ?? []) as { id: string; display_name: string | null }[]) {
      if (p.display_name) brandByProfile.set(p.id, p.display_name);
    }
  }

  const byId = new Map(products.map((p) => [p.id, p]));
  return entries.map((e) => {
    if (!e.product_id) return e;
    const product = byId.get(e.product_id);
    if (!product) return e;
    return {
      product_id: e.product_id,
      product_name_text: e.product_name_text || text(product.title),
      brand_name_text:
        e.brand_name_text ||
        (product.owner_profile_id ? brandByProfile.get(product.owner_profile_id) ?? "" : ""),
    };
  });
}
