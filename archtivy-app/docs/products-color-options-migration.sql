-- Product color options for filtering and tag suggestion scoring.
-- Run in Supabase SQL Editor. Requires: public.products.

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS color_options text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.products.color_options IS 'Array of color names (e.g. Black, White) for filtering and tag suggestion overlap.';

CREATE INDEX IF NOT EXISTS products_color_options_gin
  ON public.products USING GIN (color_options);
