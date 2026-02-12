-- Create listing_documents table for product and project document attachments.
-- Idempotent: safe to run multiple times.
-- Run this migration in the Supabase SQL Editor before using the documents sidebar or upload.

create table if not exists public.listing_documents (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  file_name text not null,
  file_url text not null,
  file_type text null,
  sort_order int null,
  storage_path text null,
  mime_type text null,
  size_bytes bigint null,
  preview_image_path text null,
  created_at timestamptz not null default now()
);

create index if not exists idx_listing_documents_listing_id on public.listing_documents (listing_id);
create index if not exists idx_listing_documents_storage_path on public.listing_documents (storage_path) where storage_path is not null;
