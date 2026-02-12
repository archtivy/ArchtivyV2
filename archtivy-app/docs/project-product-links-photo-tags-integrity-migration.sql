-- DB integrity: unique constraint and indexes for project_product_links and photo_product_tags.
-- Safe incremental (IF NOT EXISTS). Run after project-brands-products-photo-tags-migration.sql.

-- 1) project_product_links: guarantee UNIQUE(project_id, product_id)
--    (Table may have been created with this constraint; then an index already exists.
--     We use a named unique index so we can run IF NOT EXISTS idempotently.)
create unique index if not exists idx_project_product_links_project_id_product_id_unique
  on public.project_product_links (project_id, product_id);

-- 2) photo_product_tags: guarantee indexes for lookups by image and by product
create index if not exists idx_photo_product_tags_listing_image
  on public.photo_product_tags (listing_image_id);
create index if not exists idx_photo_product_tags_product
  on public.photo_product_tags (product_id);
