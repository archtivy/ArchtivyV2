-- Optional one-time helper: backfill storage_path for legacy public-bucket URLs.
-- Safe: only updates rows where storage_path is NULL and file_url matches the legacy public URL pattern.
--
-- NOTE: This does NOT attempt to guess paths for private buckets; new uploads should always write storage_path.

UPDATE public.listing_documents
SET storage_path = regexp_replace(file_url, '^.*/object/public/documents/', '')
WHERE storage_path IS NULL
  AND file_url LIKE '%/object/public/documents/%';

-- Verify:
-- SELECT id, listing_id, file_name, storage_path FROM public.listing_documents WHERE storage_path IS NULL LIMIT 50;
