# Matches Engine – DB Truth & Corrected Schema Plan

## 1) `listing_images` – exact schema and existence

**Source:** `docs/supabase.sql` (MVP schema). Table is created by that migration.

| Column       | Type                     | Constraints                          |
|-------------|--------------------------|--------------------------------------|
| `id`        | uuid                     | PRIMARY KEY, default gen_random_uuid() |
| `listing_id`| uuid                     | NOT NULL, REFERENCES listings(id) ON DELETE CASCADE |
| `image_url` | text                     | NOT NULL                             |
| `alt`       | text                     | nullable                             |
| `sort_order`| integer                  | NOT NULL DEFAULT 0                   |
| `created_at`| timestamptz              | NOT NULL DEFAULT now()               |

**Index:** `idx_listing_images_listing_id` on `(listing_id)`.

**Usage in app:** Project creation and project detail use this table (`listingImages.ts`, explore, getProjectCanonicalBySlugOrId). Project gallery = `listing_images` where `listing_id` = the project’s listing id (listing with `type = 'project'`).

---

## 2) `product_images` – existence and where product gallery lives

**Source:** `docs/gallery-migrations.sql`. Table is created by that migration.

| Column       | Type                     | Constraints                          |
|-------------|--------------------------|--------------------------------------|
| `id`        | uuid                     | PRIMARY KEY, default gen_random_uuid() |
| `product_id`| uuid                     | NOT NULL, REFERENCES products(id) ON DELETE CASCADE |
| `src`       | text                     | NOT NULL                             |
| `alt`       | text                     | NOT NULL                             |
| `sort_order`| integer                  | DEFAULT 0                            |
| `created_at`| timestamptz              | DEFAULT now()                        |

**Index:** `idx_product_images_product_id` on `(product_id)`.

**Usage in app:** Product gallery is stored only in `product_images`. Used by `gallery.ts` (getProductImages, getProductImagesByProductIds, addProductImages), `listings.ts` (addProductImages on product create), explore (getProductsCanonical), and product detail (getProductCanonicalBySlug). So **product gallery images live in `product_images`**.

---

## 3) How project vs product listings are distinguished

- **Projects:** Rows in **`listings`** with **`listings.type = 'project'`**. The `listings` table has `type listing_type NOT NULL` with enum `('project', 'product')` (`docs/supabase.sql`). Project images are in **`listing_images`** with `listing_id` = that listing’s id.
- **Products (for matches/explore):** Rows in **`products`** (from `docs/gallery-migrations.sql`). Product images are in **`product_images`** with `product_id` = that product’s id.

So:

- **Project** = listing with `type = 'project'`; images in **`listing_images`**.
- **Product** = row in **`products`**; images in **`product_images`**.
- There is no single “listings.type on the image table”; type is on the parent **`listings`** for the listing path. The product path does not use `listings`; it uses **`products`** + **`product_images`**.

---

## 4) Corrected migration plan for `image_ai` and references

### Reference rules

- **Project images:** `image_ai.image_id` = **`listing_images.id`**. Project entity id = **`listing_images.listing_id`** (same as the project listing id).
- **Product images:** `image_ai.image_id`` = **`product_images.id`**. Product entity id = **`product_images.product_id`**.

So `image_ai` references two different image tables depending on `source`; there is no single FK. Comments and triggers should state this explicitly.

### Add `listing_id` + `listing_type` on `image_ai`

- **`listing_id` (uuid, nullable):** For `source = 'project'`, set to **`listing_images.listing_id`** (the project’s listing id). For `source = 'product'`, leave **NULL** (product is identified via `product_images.product_id`).
- **`listing_type` (text, nullable):** For `source = 'project'` set to **`'project'`**; for `source = 'product'` set to **`'product'`** (for consistency and indexing). Allows “all image_ai for this project” without joining through `listing_images`.

### Corrected `image_ai` schema

```sql
create table if not exists public.image_ai (
  image_id uuid not null,
  source text not null check (source in ('project', 'product')),
  listing_id uuid null,                    -- for projects: listing_images.listing_id; for products: null
  listing_type text null check (listing_type in ('project', 'product')),
  embedding vector(1536),
  attrs jsonb not null default '{}',
  confidence int not null default 0 check (confidence >= 0 and confidence <= 100),
  updated_at timestamptz not null default now(),
  primary key (image_id, source)
);

comment on table public.image_ai is 'AI data per image: project images = listing_images.id (listing_id=listing_images.listing_id); product images = product_images.id (listing_id null)';
comment on column public.image_ai.image_id is 'listing_images.id when source=project; product_images.id when source=product';
comment on column public.image_ai.listing_id is 'Project listing id when source=project (listing_images.listing_id); null when source=product';
comment on column public.image_ai.listing_type is 'project or product; set when source=project for efficient project lookups';
comment on column public.image_ai.embedding is 'Normalized embedding vector (e.g. OpenAI 1536-dim)';
comment on column public.image_ai.attrs is 'Structured attributes: category, material, color, context';
comment on column public.image_ai.confidence is '0-100 confidence for attrs';

create index if not exists idx_image_ai_updated_at on public.image_ai (updated_at);
create index if not exists idx_image_ai_listing on public.image_ai (listing_id, listing_type) where listing_id is not null;
```

### `matches` table (unchanged semantics, clarify comments)

- **`project_id`** = **`listings.id`** where **`listings.type = 'project'`** (the project listing).
- **`product_id`** = **`products.id`**.

No schema change to `matches`; only comments in the migration should state the above.

### Pipeline / engine behavior

- When writing **project** image_ai: set `listing_id` = `listing_images.listing_id`, `listing_type` = `'project'`.
- When writing **product** image_ai: set `listing_id` = null, `listing_type` = `'product'`.
- “All image_ai for project P”: `WHERE source = 'project' AND listing_id = P` (P = project listing id).
- “All image_ai for product Q”: `WHERE source = 'product' AND image_id IN (SELECT id FROM product_images WHERE product_id = Q)`.

---

## Summary

| Question | Answer |
|----------|--------|
| **listing_images schema** | `id` (uuid PK), `listing_id` (uuid FK), `image_url` (text), `alt` (text), `sort_order` (int), `created_at` (timestamptz). Exists per `docs/supabase.sql`. |
| **product_images** | Exists per `docs/gallery-migrations.sql`. Product gallery is stored in **product_images** only. |
| **Project vs product** | Projects = **listings** with **listings.type = 'project'**, images in **listing_images**. Products = **products** table, images in **product_images**. |
| **image_ai references** | `image_id` = **listing_images.id** when `source='project'`, **product_images.id** when `source='product'`. Add **listing_id** (nullable) and **listing_type** (nullable) to image_ai; fill for projects; index `(listing_id, listing_type)` for project lookups. |
