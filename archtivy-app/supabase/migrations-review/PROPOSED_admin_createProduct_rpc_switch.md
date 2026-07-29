# Proposed code change — NOT APPLIED

**File:** `src/app/(admin)/admin/_actions/listings.ts`
**Function:** `createAdminProductFull()`
**Replaces:** lines 391–437 (47 lines → 26 lines)

Depends on `20260728_create_product_with_sidecar` being applied first. If the
code ships before the function exists, every admin product creation fails with
`PGRST202 Could not find the function`. Order is: migration → code.

---

## Remove

```ts
  const { data: listing, error: insertError } = await supabase
    .from("listings")
    .insert({
      type: "product",
      listing_type: "product",
      status: "APPROVED",
      title,
      description: description || null,
      slug,
      product_type: resolvedProductType || null,
      product_category: resolvedProductCategory || null,
      product_subcategory: resolvedProductSubcategory || null,
      material_or_finish: material_or_finish || null,
      dimensions: dimensions || null,
      year: year || null,
      team_members,
      location: null,
      category: null,
      area_sqft: null,
      brands_used: [],
      owner_clerk_user_id: null,
      owner_profile_id: ownerProfileId,
      cover_image_url: null,
      product_stage: product_stage || null,
      product_collaboration_status: product_collaboration_status || null,
      product_looking_for: product_looking_for.length > 0 ? product_looking_for : [],
    })
    .select("id")
    .maybeSingle();

  if (insertError) return { error: insertError.message };
  if (!listing?.id) return { error: "Failed to create product." };
  const listingId = listing.id as string;
  const { data: check } = await supabase.from("listings").select("type").eq("id", listingId).maybeSingle();
  if (!check?.type) return { error: "Listing created but type is missing (data integrity)." };

  const { error: productRowError } = await supabase.from("products").insert({
    id: listingId,
    slug,
    title,
    subtitle: description?.trim() || null,
    color_options: [],
  });
  if (productRowError) {
    await supabase.from("listings").delete().eq("id", listingId);
    return { error: `Failed to create product record: ${productRowError.message}` };
  }
```

## Replace with

```ts
  // Atomic: listings + products commit together inside one transaction, or
  // neither is written. Replaces two sequential PostgREST requests that could
  // leave a listing without its sidecar, and whose compensating delete only
  // covered one of six failure paths.
  // A non-numeric year previously reached Postgres and raised a DB error.
  // It is now coerced to null so a malformed form field cannot fail the whole
  // submission — but warn, so the coercion is visible in server logs rather
  // than silently swallowed.
  let parsedYear: number | null = null;
  if (year) {
    if (/^\d+$/.test(year)) {
      parsedYear = Number(year);
    } else {
      console.warn(
        `[admin createProduct] non-numeric year ${JSON.stringify(year)} for slug "${slug}" — storing null`
      );
    }
  }

  const { data: newListingId, error: rpcError } = await supabase.rpc(
    "create_product_with_sidecar",
    {
      p_title: title,
      p_description: description || null,
      p_slug: slug,
      p_owner_profile_id: ownerProfileId,
      p_product_type: resolvedProductType || null,
      p_product_category: resolvedProductCategory || null,
      p_product_subcategory: resolvedProductSubcategory || null,
      p_material_or_finish: material_or_finish || null,
      p_dimensions: dimensions || null,
      p_year: parsedYear,
      p_team_members: team_members,
      p_product_stage: product_stage || null,
      p_product_collaboration_status: product_collaboration_status || null,
      p_product_looking_for: product_looking_for.length > 0 ? product_looking_for : [],
    }
  );

  if (rpcError) return { error: rpcError.message };
  if (!newListingId) return { error: "Failed to create product." };
  const listingId = newListingId as string;
```

---

## What is deliberately dropped, and why

**The read-back check** (old lines 424–425):
```ts
const { data: check } = await supabase.from("listings").select("type")...
if (!check?.type) return { error: "Listing created but type is missing (data integrity)." };
```
This was a defensive re-read guarding against the listing landing without a
`type`. The RPC hard-codes `'product'` in the INSERT, so the value cannot be
absent. Keeping it would cost an extra round trip to assert something the
function guarantees.

**The products compensating delete** (old lines 434–437): unreachable by
construction. If the sidecar insert fails inside the function, the listings
insert rolls back with it — there is nothing left to compensate for.

## What is deliberately kept

The five later compensating deletes (team members, image upload, listing_images
insert, document upload, document save) stay as they are. They currently orphan
the sidecar; once `products_id_listings_fkey` exists with `ON DELETE CASCADE`,
the same `listings.delete()` calls clean up the products row automatically. The
FK fixes them without touching the code.

## Behavioural difference worth noting

`year` arrives from `formData` as a string and was previously passed straight
into an integer column, letting Postgres coerce it. A non-numeric value would
have raised a database error. The proposal parses it in TypeScript and sends
`null` for anything non-numeric, so a malformed year now silently becomes empty
instead of failing the request. That is the safer behaviour for a form field,
but it is a change, not a no-op — so the coercion emits a `console.warn` naming
the offending value and the slug, making it visible in server logs instead of
fully silent.

## Not covered

`createProductCanonical()` in `src/app/actions/listings.ts` — the public
(non-admin) path used by `AddProductForm.tsx:171`. It writes `products` FIRST,
then `listings`, and compensates in the opposite direction with seven
`deleteProductRow()` calls, orphaning listings rather than products. It needs
its own change and is out of scope here.
