-- RPC: increment listings.views_count by 1 for a given listing id.
-- Run in Supabase SQL editor. Requires listings.views_count column (integer, default 0).

CREATE OR REPLACE FUNCTION increment_listing_views(p_listing_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE listings
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = p_listing_id;
END;
$$;

COMMENT ON FUNCTION increment_listing_views(uuid) IS 'Increments views_count for a listing; used by /api/track-view.';

-- Optional: when adding/removing a listing from a folder (folder_items), update listings.saves_count.
-- Call increment_listing_saves(listing_id, delta) with delta = 1 on add, -1 on remove.
-- CREATE OR REPLACE FUNCTION increment_listing_saves(p_listing_id uuid, p_delta int)
-- RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
-- BEGIN
--   UPDATE listings SET saves_count = GREATEST(0, COALESCE(saves_count, 0) + p_delta) WHERE id = p_listing_id;
-- END; $$;
