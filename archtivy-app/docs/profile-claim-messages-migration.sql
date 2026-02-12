-- Profile claim messages: optional message when claiming a profile by id.
-- Run in Supabase SQL Editor. Safe to run once.

create table if not exists public.profile_claim_messages (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  clerk_user_id text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_profile_claim_messages_profile_id on public.profile_claim_messages (profile_id);
create index if not exists idx_profile_claim_messages_created_at on public.profile_claim_messages (created_at desc);

comment on table public.profile_claim_messages is 'Optional message submitted when claiming an unclaimed profile via /u/id/[profileId]/claim';
