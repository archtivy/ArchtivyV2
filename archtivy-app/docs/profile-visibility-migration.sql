-- Profile soft-hide and primary: is_hidden, is_primary, claimed_at (optional)
-- Run in Supabase SQL Editor. Safe to run incrementally.

alter table public.profiles add column if not exists is_hidden boolean not null default false;
alter table public.profiles add column if not exists is_primary boolean not null default false;
alter table public.profiles add column if not exists claimed_at timestamptz null;

create index if not exists idx_profiles_is_hidden on public.profiles (is_hidden);
create index if not exists idx_profiles_is_primary on public.profiles (is_primary);

comment on column public.profiles.is_hidden is 'When true, profile is hidden from public listings and direct URL; used for auto-created personal profile after user claims an Archtivy profile.';
comment on column public.profiles.is_primary is 'When true, this is the user''s default/primary profile (one per owner_user_id).';
