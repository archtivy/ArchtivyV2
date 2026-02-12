-- Product taxonomy: category and subcategory (filter values only; no indexable category pages).
-- SEO: Category/subcategory act as FILTER VALUES only. Do NOT generate static routes for them.
-- Run in Supabase SQL Editor. Safe incremental (ADD COLUMN IF NOT EXISTS).

alter table public.listings add column if not exists product_category text;
alter table public.listings add column if not exists product_subcategory text;

comment on column public.listings.product_category is 'Product category (dependent on product_type). Filter value only; no standalone page.';
comment on column public.listings.product_subcategory is 'Product subcategory (required). Filter value only. "Other / Not specified" = fallback, low-confidence.';
