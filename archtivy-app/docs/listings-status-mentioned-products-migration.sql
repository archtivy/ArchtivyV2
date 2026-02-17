-- Listings: status (PENDING/APPROVED) and mentioned_products for projects.
-- Run in Supabase SQL Editor. Run statements IN ORDER (column must exist before index).
-- Requires: public.listings.
-- If CREATE INDEX fails with "column status does not exist", run docs/listings-status-only-migration.sql first.

-- 1) status: PENDING until admin approves; only APPROVED shown in public explore/detail (unless owner or admin).
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'APPROVED';

ALTER TABLE public.listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE public.listings ADD CONSTRAINT listings_status_check CHECK (status IN ('PENDING', 'APPROVED'));

COMMENT ON COLUMN public.listings.status IS 'PENDING: not public until admin approves; APPROVED: visible in explore and public detail. Default APPROVED for existing rows.';

-- Index for admin listing filters and public queries (run only after column exists)
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings (status) WHERE deleted_at IS NULL;

-- 2) mentioned_products: project-only, user-provided text pairs (brand_name_text, product_name_text). No URLs.
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS mentioned_products jsonb DEFAULT '[]';

COMMENT ON COLUMN public.listings.mentioned_products IS 'Project only. Array of { brand_name_text, product_name_text } from submitter. Shown as "Mentioned by submitter"; linked if match existing product.';
