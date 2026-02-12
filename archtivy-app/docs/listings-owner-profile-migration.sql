-- Listings: owner_profile_id for admin-created listings (publish on behalf of a profile)
-- Run in Supabase SQL Editor. Safe to run incrementally.

alter table public.listings add column if not exists owner_profile_id uuid null references public.profiles (id) on delete set null;

create index if not exists idx_listings_owner_profile_id on public.listings (owner_profile_id);

comment on column public.listings.owner_profile_id is 'Profile that owns this listing (admin-assigned); when set, listing appears on that profile page.';
