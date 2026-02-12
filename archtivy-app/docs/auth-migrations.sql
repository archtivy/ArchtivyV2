-- Archtivy Auth: Profiles + Listings ownership
-- Run in Supabase SQL Editor after initial schema. Safe to run incrementally.

-- 1) Drop old profiles if you had the legacy schema (user_id, profile_role enum)
-- Uncomment only if migrating from docs/supabase.sql that had profiles with user_id:
-- drop table if exists public.profiles cascade;
-- drop type if exists profile_role;

-- 2) Create profiles table (Clerk-backed)
-- id = uuid primary key (internal). clerk_user_id = Clerk user id (text).
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  clerk_user_id text not null unique,
  role text not null check (role in ('designer', 'brand', 'reader')),
  display_name text,
  username text unique,
  location_city text,
  location_country text,
  bio text,
  website text,
  instagram text,
  linkedin text,
  avatar_url text,
  designer_title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_clerk_user_id on public.profiles (clerk_user_id);
create index if not exists idx_profiles_username on public.profiles (username);

comment on column public.profiles.clerk_user_id is 'Clerk user id (e.g. user_xxx)';
comment on column public.profiles.designer_title is 'Predefined discipline for designers (Architect, Interior Designer, etc.)';

-- 2b) Role-specific fields: brand_type, reader_type
alter table public.profiles add column if not exists brand_type text;
alter table public.profiles add column if not exists reader_type text;
comment on column public.profiles.brand_type is 'Predefined type for brands (Architecture Firm, Developer, etc.)';
comment on column public.profiles.reader_type is 'Predefined type for readers (Student, Academic, Professional, etc.)';

-- 3) Add owner to listings (nullable for existing rows)
alter table public.listings
  add column if not exists owner_clerk_user_id text;

create index if not exists idx_listings_owner on public.listings (owner_clerk_user_id);

comment on column public.listings.owner_clerk_user_id is 'Clerk user id of the listing owner';

-- 4) RLS (enable when ready; policies to add in a later step)
-- alter table public.profiles enable row level security;
-- alter table public.listings enable row level security;
