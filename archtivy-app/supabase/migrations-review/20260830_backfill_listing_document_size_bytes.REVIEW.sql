-- ============================================================================
-- PROPOSED — NOT APPLIED. Review before running.
--
-- Backfill listing_documents.size_bytes from Supabase storage metadata.
--
-- WHY
--   size_bytes is NULL on all 61 rows, so /me/files cannot show a file size
--   and the product page's download list cannot either. The real sizes already
--   exist — storage.objects.metadata->>'size' is populated for all 62 objects
--   in the listing-documents bucket — they were simply never copied onto the
--   row at upload time.
--
-- SAFETY
--   * UPDATE only. No schema change, no drop, no delete. The column already
--     exists (bigint, nullable).
--   * Touches only rows where size_bytes IS NULL, so re-running it is a no-op
--     and it can never overwrite a value that is already set.
--   * Joins on storage_path, which is unique per document and populated on all
--     61 rows. Verified before writing: 61 of 61 documents match exactly one
--     object in the bucket, so nothing is left behind and nothing is guessed.
--   * A document whose object is missing simply stays NULL rather than getting
--     a zero, which would read as an empty file.
--
-- MEASURED BEFORE (2026-08-30)
--   listing_documents            61 rows, size_bytes NULL on 61
--   storage.objects (bucket)     62 objects, size present on 62
--   join on storage_path         61 of 61 matched
--   size range                   584 bytes .. 3,553,525 bytes (~3.4 MB)
--
-- EXPECTED AFTER
--   61 rows updated, 0 rows left NULL.
--
-- NOTE ON DRIFT
--   This fixes today's rows. New uploads still need the writer to set the
--   value, which lib/db/listingDocumentsWrite.ts now does — otherwise the
--   column silently goes stale again and this file gets written a second time.
-- ============================================================================

begin;

-- Pre-flight: what will change. Expect 61 / 61.
select
  count(*)                                              as rows_missing_size,
  count(*) filter (where o.id is not null)              as will_be_filled
from public.listing_documents d
left join storage.objects o
  on o.bucket_id = 'listing-documents'
 and o.name = d.storage_path
where d.size_bytes is null;

update public.listing_documents d
   set size_bytes = (o.metadata->>'size')::bigint
  from storage.objects o
 where o.bucket_id = 'listing-documents'
   and o.name = d.storage_path
   and d.size_bytes is null
   and o.metadata ? 'size'
   and (o.metadata->>'size') ~ '^[0-9]+$';

-- Post-check: expect still_null = 0, and a sane range.
select
  count(*)                          as total,
  count(size_bytes)                 as with_size,
  count(*) - count(size_bytes)      as still_null,
  min(size_bytes)                   as min_bytes,
  max(size_bytes)                   as max_bytes
from public.listing_documents;

-- Inspect the two SELECTs above, then COMMIT. ROLLBACK to abandon.
commit;
