# Matches Engine – Where Jobs Are Triggered

## Pipeline (image_ai)

When a **new image** is created, run the AI pipeline so the image gets an embedding and attributes in `image_ai`.

### Option 1: Call from Server Action after upload

- **Project images (listings):** After inserting into `listing_images` (e.g. in `createProject` or when adding gallery images to a project listing), call:
  - `processImage({ imageId: row.id, source: "project", imageUrl: row.image_url })` for each new row, **or**
  - `processProjectImages(projectId)` to process all images for that project.
- **Product images:** After inserting into `product_images` (e.g. in the flow that uses `addProductImages` in `src/lib/db/gallery.ts`), call:
  - `processImage({ imageId: row.id, source: "product", imageUrl: row.src })` for each new row, **or**
  - `processProductImages(productId)` to process all images for that product.

### Option 2: Background job / cron

- Enqueue or run periodically: “process all `listing_images` (for listings with type=project) and `product_images` that don’t have a row in `image_ai` yet.” Then call `processImage` for each missing (image_id, source).

### Option 3: Supabase Edge Function + DB webhook

- Use a Supabase Database webhook on `listing_images` and `product_images` (on INSERT) to invoke an Edge Function that calls your Next.js API or an internal endpoint that runs `processImage`.

**Recommended for now:** Call `processProjectImages(projectId)` and `processProductImages(productId)` from the same server action or API route that creates/updates the project or product gallery (Option 1). No UI change required if you add the call after the DB insert.

---

## Matching engine (matches table)

When **image_ai** data is updated (new or updated embeddings/attrs), recompute matches so the `matches` table stays up to date.

### Option 1: After pipeline for one entity

- After `processProjectImages(projectId)` or `processProductImages(productId)`, call:
  - `computeAndUpsertMatchesForProject(projectId)` so that project’s matches are recomputed.

### Option 2: Full backfill / cron

- Run `computeAndUpsertAllMatches()` on a schedule (e.g. cron) or as a one-off backfill script.

**Recommended for now:** After processing images for a project, call `computeAndUpsertMatchesForProject(projectId)`. After processing images for a product, call `computeAndUpsertMatchesForProject(projectId)` for every project that might match (or run a full `computeAndUpsertAllMatches()` nightly).

---

## Summary

| Event                    | Action |
|-------------------------|--------|
| New project gallery     | `processProjectImages(projectId)` then `computeAndUpsertMatchesForProject(projectId)` |
| New product gallery     | `processProductImages(productId)` then for each project (or run full) `computeAndUpsertMatchesForProject(projectId)` |
| Backfill / nightly      | `processImage` for all images missing from `image_ai`, then `computeAndUpsertAllMatches()` |
