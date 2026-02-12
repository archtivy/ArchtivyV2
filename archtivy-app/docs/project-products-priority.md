# Project products: display priority

How we decide which products to show on a project page and how links are stored.

## Priority order

1. **Manual** — Products selected in the “Brands used” / “Products used” UI. Stored in `project_product_links` with `source = 'manual'`.
2. **Photo tag** — Products tagged on gallery photos. Stored in `project_product_links` with `source = 'photo_tag'` when there is no existing manual link for that product.
3. **Suggested** — AI matches from the matches pipeline. Not stored in `project_product_links`; only shown when there are no manual or photo_tag links.

## Rules

- **Used products section**: We show manual + photo_tag links (deduped by product id). If that list is empty, we show **Suggested** products (from the matches API), clearly labeled “Suggested” and “Suggested by AI (not confirmed).”
- **Linking**: When a photo tag is created, we upsert `project_product_links` with `source = 'photo_tag'` only if there is no existing row, or the existing row is not `source = 'manual'`. So **manual always wins**: we never overwrite a manual link with photo_tag.
- Matches scoring and the `/api/matches/project` endpoint are **not** changed; we only read matches for fallback display.
