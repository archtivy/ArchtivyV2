-- Minimal: add status column and index to public.listings only.
-- Run this in Supabase SQL Editor if the full migration failed or CREATE INDEX
-- failed with "column status does not exist". Run both statements in order.

-- 1) Add column (existing rows get default 'APPROVED')
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'APPROVED';

-- 2) Index for admin filters and public queries (only after step 1)
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings (status) WHERE deleted_at IS NULL;

-- Optional: enforce allowed values (run after step 1)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'listings_status_check' AND conrelid = 'public.listings'::regclass
  ) THEN
    ALTER TABLE public.listings ADD CONSTRAINT listings_status_check CHECK (status IN ('PENDING', 'APPROVED'));
  END IF;
END $$;
