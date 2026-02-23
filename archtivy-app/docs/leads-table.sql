-- Curated Lead System: leads table for contact requests on listing detail pages.
-- Run in Supabase SQL Editor. Safe to run incrementally.

create type public.lead_status as enum ('pending', 'approved', 'rejected');

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null,
  listing_type text null,
  listing_title text not null,
  listing_owner_email text null,
  sender_name text not null,
  sender_email text not null,
  sender_company text null,
  message text not null,
  status public.lead_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  reviewed_by text null,
  ip_hash text null,
  user_agent text null
);

create index if not exists idx_leads_status on public.leads (status);
create index if not exists idx_leads_created_at on public.leads (created_at desc);
create index if not exists idx_leads_listing_id on public.leads (listing_id);

comment on table public.leads is 'Contact requests from visitors to listing owners; admin approves before forwarding via email.';
