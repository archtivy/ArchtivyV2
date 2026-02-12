# Archtivy Matches Engine

Production-level project ↔ product matching using image embeddings and attributes. Data and pipeline only; UI (lightbox/detail) connects later.

## Step A — DB schema

Run in Supabase SQL Editor:

1. Enable **pgvector**: Database → Extensions → enable `vector`.
2. Run **`docs/matches-engine-migration.sql`**.

Creates:

- **`image_ai`**: `(image_id, source)` → embedding vector(1536), attrs jsonb, confidence.  
  - `source`: `'project'` (image_id = `listing_images.id`) or `'product'` (image_id = `product_images.id`).
- **`matches`**: `(project_id, product_id)` → score, tier (`verified` | `possible`), reasons, evidence_image_ids.  
  - `project_id` = `listings.id` where `type = 'project'`; `product_id` = `products.id`.

## Step B — AI pipeline

When a new listing image (project) or product image is created:

1. **`processImage({ imageId, source, imageUrl })`** – generates embedding + attributes and upserts **`image_ai`**.
2. Or **`processProjectImages(projectId)`** / **`processProductImages(productId)`** – process all images for that entity.

Current behaviour:

- **Embedding:** Stub (returns zero vector). Plug in an image-embedding API (e.g. vision model or dedicated embedding endpoint) in `src/lib/ai/embedding.ts`.
- **Attributes:** Optional OpenAI vision in `src/lib/ai/attributes.ts` (category, material, color, context). Set `OPENAI_API_KEY` to use it.

Trigger points: see **`docs/matches-engine-triggers.md`**.

## Step C — Matching engine

- Compares project images vs product images (embedding similarity + attribute overlap).
- Aggregates scores with a small frequency bonus.
- **Tier:**  
  - **verified:** score ≥ 80 or (score ≥ 70 and frequency ≥ 2).  
  - **possible:** 60 ≤ score &lt; verified threshold.
- Upserts **`matches`** with reasons and `evidence_image_ids`.

Functions:

- **`computeAndUpsertMatchesForProject(projectId, productIds?)`** – recompute matches for one project (optionally vs given products).
- **`computeAndUpsertAllMatches()`** – backfill / cron: all projects vs all products.

## Step D — Query functions

- **`getProjectMatches({ projectId, tier?, limit?, offset? })`** – products matched to a project.
- **`getProductMatchedProjects({ productId, tier?, limit?, offset? })`** – projects matched to a product.
- **`getImageMatches({ imageId, tier?, limit? })`** – matches where this image is in `evidence_image_ids`.

## Step E — Test script

1. Apply **`docs/matches-engine-migration.sql`** and enable pgvector.
2. Start app: `npm run dev`.
3. Run:

   ```bash
   npm run matches:test
   ```

   or:

   ```bash
   node scripts/validate-matches.mjs
   ```

   Or with explicit IDs:

   ```bash
   node scripts/validate-matches.mjs <projectId> <productId1> <productId2>
   ```

   Or call the API directly:

   ```bash
   curl -s -X POST http://localhost:3000/api/admin/matches-test \
     -H "Content-Type: application/json" -d '{}' | jq
   ```

The test runs pipeline + matching for one project and a few products, then returns `getProjectMatches` and `getProductMatchedProjects` results.

## Files

| Path | Purpose |
|------|--------|
| `docs/matches-engine-migration.sql` | DB: `image_ai`, `matches`, indexes, RLS |
| `docs/matches-engine-triggers.md` | Where to trigger pipeline and matching jobs |
| `docs/matches-engine-readme.md` | This file |
| `src/lib/matches/types.ts` | Shared types |
| `src/lib/matches/pipeline.ts` | `processImage`, `processProjectImages`, `processProductImages` |
| `src/lib/matches/engine.ts` | `computeCandidatesForProject`, `computeAndUpsertMatchesForProject`, `computeAndUpsertAllMatches` |
| `src/lib/matches/queries.ts` | `getProjectMatches`, `getProductMatchedProjects`, `getImageMatches` |
| `src/lib/ai/embedding.ts` | Image embedding (stub; plug in real API) |
| `src/lib/ai/attributes.ts` | Image attributes (optional OpenAI vision) |
| `src/lib/db/imageAi.ts` | `image_ai` table access |
| `src/lib/db/matches.ts` | Helpers: `getProjectImageRefs`, `getProductImageRefs`, `getAllProjectIds`, `getAllProductIds` |
| `src/app/api/admin/matches-test/route.ts` | POST endpoint for validation |
| `scripts/validate-matches.mjs` | Script that calls matches-test API |
