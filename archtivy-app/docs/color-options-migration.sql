-- Product listing: color options for filtering and tag suggestions.
-- Run in Supabase SQL Editor. Requires: public.listings.

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS color_options text[] DEFAULT '{}';

COMMENT ON COLUMN public.listings.color_options IS 'Product only. Array of color names (e.g. Black, White) for filtering and tag suggestion scoring.';

CREATE INDEX IF NOT EXISTS idx_listings_color_options
  ON public.listings USING GIN (color_options)
  WHERE type = 'product' AND deleted_at IS NULL;
