-- Optional: Delete rows from legacy listings tables only.
-- Run only after migrating content to projects/products. Do NOT touch projects/products tables.

-- Uncomment and run in order if you want to clear legacy data:

-- 1) Dependent tables (references listings.id or listing_id)
-- delete from public.listing_images;
-- delete from public.listing_documents;
-- delete from public.project_product_links;

-- 2) Legacy listings table
-- delete from public.listings;
