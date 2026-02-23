-- Board sharing: public/private and shareable link
-- Run after saved-folders-tables.sql.
-- After running, reload PostgREST schema cache: Supabase Dashboard -> Settings -> API -> Reload schema cache.

alter table public.folders add column if not exists is_public boolean default false;
alter table public.folders add column if not exists share_slug text unique;

create unique index if not exists idx_folders_share_slug on public.folders (share_slug) where share_slug is not null;
