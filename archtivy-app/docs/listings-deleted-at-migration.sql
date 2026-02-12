-- Soft delete for listings (projects and products).
-- Admin Dashboard delete sets deleted_at = now() instead of hard-deleting.
-- Admin Projects and Products lists filter with: where deleted_at is null.

ALTER TABLE public.listings
ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_listings_deleted_at ON public.listings (deleted_at);
