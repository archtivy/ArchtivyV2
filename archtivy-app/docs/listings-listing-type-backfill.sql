-- One-time backfill: set listing_type where it is NULL.
-- Run in Supabase SQL Editor after confirming public.listings has listing_type column.
-- Product listings: shared PK with public.products (listings.id = products.id).
-- Remaining NULL rows are treated as projects.

-- 1) Product listings: match by shared id with public.products
UPDATE public.listings
SET listing_type = 'product'
WHERE listing_type IS NULL
  AND id IN (SELECT id FROM public.products);

-- 2) Project listings: any remaining NULL (e.g. legacy or project-only listings)
UPDATE public.listings
SET listing_type = 'project'
WHERE listing_type IS NULL;

-- Optional: verify no NULLs remain
-- SELECT id, slug, listing_type FROM public.listings WHERE listing_type IS NULL;
