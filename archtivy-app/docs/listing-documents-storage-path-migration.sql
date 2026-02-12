-- Listing documents: add storage_path and preview_image_path for signed URLs and thumbnails.
-- Run in Supabase SQL Editor. Safe to run incrementally.

-- Add columns (nullable for existing rows)
alter table public.listing_documents add column if not exists storage_path text;
alter table public.listing_documents add column if not exists mime_type text;
alter table public.listing_documents add column if not exists size_bytes bigint;
alter table public.listing_documents add column if not exists preview_image_path text;

comment on column public.listing_documents.storage_path is 'Path in storage bucket (e.g. listingId/uuid.pdf) for signed URL generation';
comment on column public.listing_documents.preview_image_path is 'Optional path to thumbnail (e.g. for PDF page 1)';

-- Index for lookups by path
create index if not exists idx_listing_documents_storage_path on public.listing_documents (storage_path) where storage_path is not null;
