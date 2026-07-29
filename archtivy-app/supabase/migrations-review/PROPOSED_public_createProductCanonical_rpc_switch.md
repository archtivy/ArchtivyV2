# Public-path RPC switch — **APPLIED** 2026-07-28

> Status: implemented in `src/app/actions/listings.ts`. Retained as the record of
> what changed and why. See "Decisions taken" at the end for how the three open
> questions were resolved.

**File:** `src/app/actions/listings.ts`
**Function:** `createProductCanonical()` (public path, used by `AddProductForm.tsx:171`)
**Replaces:** lines 530–582

This is the path new listings will actually go through. It is **more** broken
than the admin path, in a different way.

---

## What it does today

```ts
530  const imageFiles = getImageFiles(formData);
531  const row = await createProductRow({ title, subtitle: subtitle || null });   // ← products INSERT (generates id + slug)
532  if (!row) return { error: "Failed to create product." };
533  const { id: productId, slug } = row;
     …
545  const supabaseForProduct = getSupabaseServiceClient();
546  await supabaseForProduct.from("products").update({                          // ← products UPDATE (colours)
547    color_options: colorOptions,
550    color: colorOptions.length > 0 ? colorOptions[0] : null,
552  }).eq("id", productId);
     …
578  const listingErr = await upsertListingForProduct(productId, listingPayload); // ← listings INSERT (finally)
579  if (listingErr.error) {
580    await deleteProductRow(productId);
581    return { error: `Failed to create listing: ${listingErr.error}` };
582  }
```

Three sequential writes. The `products` row exists — **with colours set** — for
the whole span from line 531 to line 578. Any crash, timeout, or unhandled
throw in that window leaves an orphan `products` row and no listing.

**This is almost certainly how the 5 real-data orphans were created.** All five
(`serie-27`, `serie-27-2`, `serie-42`, `serie-422`, `molteni-coffee-table`)
have `color_options` populated and no listing row — the exact signature of
reaching line 546 but not completing line 578.

## What it becomes

```ts
  const imageFiles = getImageFiles(formData);

  const colorOptionsRaw = formData.get("color_options");
  let colorOptions: string[] = [];
  if (colorOptionsRaw && typeof colorOptionsRaw === "string" && colorOptionsRaw.trim()) {
    try {
      const arr = JSON.parse(colorOptionsRaw) as unknown;
      if (Array.isArray(arr)) colorOptions = arr.map((x) => String(x).trim()).filter(Boolean);
    } catch {
      // ignore — malformed colour payload is not worth failing the submission
    }
  }

  // Taxonomy-derived legacy fields must be resolved BEFORE the insert now,
  // because there is no longer an update step to fill them in afterwards.
  let resolvedProductType2: string | null = productType;
  let resolvedProductCategory2: string | null = productCategory;
  let resolvedProductSubcategory2: string | null = productSubcategory;
  if (taxonomyNodeId && !productType?.trim()) {
    const nodeRes = await getTaxonomyNodeById(taxonomyNodeId);
    if (nodeRes.data) {
      resolvedProductType2 = nodeRes.data.legacy_product_type || null;
      resolvedProductCategory2 = nodeRes.data.legacy_product_category || productCategory;
      resolvedProductSubcategory2 = nodeRes.data.legacy_product_subcategory || productSubcategory;
    }
  }

  const supabaseForProduct = getSupabaseServiceClient();
  const slug = await ensureUniqueListingSlug(slugFromTitle(title)); // see NOTE 2

  // Atomic: listings + products commit together, or neither is written.
  const { data: newProductId, error: rpcError } = await supabaseForProduct.rpc(
    "create_product_with_sidecar",
    {
      p_title: title,
      p_description: description ?? null,
      p_slug: slug,
      p_owner_profile_id: profile.id ?? null,
      p_product_type: resolvedProductType2 ?? null,
      p_product_category: resolvedProductCategory2 ?? null,
      p_product_subcategory: resolvedProductSubcategory2 ?? null,
      p_status: "PENDING",                 // public submissions await review
      p_owner_clerk_user_id: userId,
      p_color_options: colorOptions,
    }
  );

  if (rpcError) return { error: `Failed to create product: ${rpcError.message}` };
  if (!newProductId) return { error: "Failed to create product." };
  const productId = newProductId as string;
```

Everything downstream (`setListingTaxonomyNode`, image upload, documents,
notifications, revalidation) is unchanged and still keyed on `productId`.

## Compensating deletes — keep, mostly

The seven later `deleteProductRow()` calls are **already paired** with
`dbDeleteListing()` (lines 604/605, 611/612, 617/618, 623/624, 644/645,
657/658), so unlike the admin path they do not orphan. Once
`products_id_listings_fkey` exists with `ON DELETE CASCADE`, the
`deleteProductRow()` half becomes redundant — `dbDeleteListing()` alone
cascades. They can be removed in a follow-up, but leaving them is harmless
(deleting an already-cascaded row is a no-op).

The one at **line 580 disappears entirely** — it compensated for the listing
insert failing after the products insert succeeded, which the RPC makes
impossible.

---

## NOTE 1 — `status` differs, and it matters

Admin creates `APPROVED`; this path creates **`PENDING`**. The RPC now takes
`p_status`, defaulting to `'APPROVED'` so the admin call is unchanged. This
path must pass `"PENDING"` explicitly. Getting this wrong would silently
auto-publish every public submission without review — the highest-risk detail
in this change.

## NOTE 2 — a pre-existing slug bug this change surfaces

`createProductRow()` calls `ensureUniqueSlug("product", …)` in `gallery.ts:243`,
which checks uniqueness against the **`products`** table only. The admin path
uses a different `ensureUniqueSlug` (`_actions/listings.ts:39`) that checks
**`listings`**. Two different uniqueness domains for the same public URL space.

A slug unique in `products` can therefore already collide with an existing
`listings` slug — and `/products/[...segments]` resolves against `listings`.
This is a live bug today, not something the RPC introduces, but the RPC makes
the caller responsible for the slug so it has to be decided now.

**Recommendation:** use the `listings`-scoped `ensureUniqueSlug` for both paths,
since `listings` is what the public routes and the sitemap read. That means
either exporting the admin one or moving it to a shared module. Flagging rather
than assuming — it changes slug assignment for future public submissions.

## NOTE 3 — draft mode

This path supports `isDraft` (`formData.get("draft") === "1"`), which relaxes
description validation. It does **not** currently change the status — drafts are
still written `PENDING`. The proposal preserves that exactly. If drafts were
ever meant to have their own status, that is a separate decision.

## Not covered

`createProjectCanonical()` in the same file is dead code (zero callers, writes
only to `projects`) and is proposed for deletion in the `projects` retirement,
not here.


---

# Decisions taken

**NOTE 1 — status.** Resolved as specified: `p_status: "PENDING"` is passed
explicitly at the call site, never left to the function default. A comment at
that line states why, so a future edit that removes it has to do so knowingly.

**NOTE 2 — the slug bug.** Fixed on both sides.

*Database:* migration `20260728193000_product_sidecar_slug_guard.sql` replaces
the function (same signature, so a genuine replacement, not an overload) and
adds two guards — empty slug rejected with `invalid_parameter_value`, and a slug
already present in `listings` rejected with `unique_violation` and a message
naming the slug. Verified against production: reusing a live slug returns
`create_product_with_sidecar: slug "product" is already used by an existing listing`.

*Application:* `ensureUniqueListingSlug()` added to `lib/db/listings.ts` and used
by the public path. It checks `listings` — the table that resolves
`/products/[...segments]` and feeds `sitemap.ts` — instead of the `products`
sidecar that `gallery.ts:ensureUniqueSlug` was checking.

One thing deliberately *not* changed: the slugification algorithm. The three
private `slugFromTitle` copies are not identical — `gallery.ts` collapses
whitespace then strips other non-alphanumerics (`"Serie 47.3"` -> `serie-473`),
while `_actions/listings.ts` and `createProject.ts` convert every
non-alphanumeric run to a hyphen (`serie-47-3`). Existing public slugs such as
`serie-473` were produced by the gallery variant, so it was exported and reused
verbatim rather than swapped for the admin one, which would have silently
changed slug shapes for every future public submission. Unifying the three
copies remains open, and is a behaviour change that needs its own decision.

Note the check-then-insert is still racy in principle: two concurrent
submissions can both pass `ensureUniqueListingSlug`. The partial unique index
`idx_listings_slug_unique` and the in-function guard are the real enforcement —
the helper only avoids hitting them in the common case.

**NOTE 3 — draft mode.** Kept exactly as proposed. `isDraft` still only relaxes
description validation; drafts continue to be written `PENDING`.

# Cleanup performed

`createProductRow` became unused once the three-step sequence was replaced, and
its import was removed. It remains exported from `gallery.ts` alongside the
other now-unreferenced project helpers — removing those belongs to the `projects`
retirement, not here.

The six later `deleteProductRow()` calls were left in place. They are already
paired with `dbDeleteListing()`, and `products_id_listings_fkey` now cascades, so
they are redundant rather than harmful. The one at the old line 580 is gone: it
compensated for a failure mode the RPC makes impossible.
