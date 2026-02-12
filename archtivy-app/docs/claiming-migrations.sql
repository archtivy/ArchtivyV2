-- Level-3 Profile claiming: profiles new cols + profile_claim_requests + admin_users + RLS
-- Run in Supabase SQL Editor. Safe to run incrementally (ADD COLUMN IF NOT EXISTS).
-- User refs use text (Clerk user id) for compatibility with Clerk auth.

-- 1) profiles: add claiming columns
alter table public.profiles add column if not exists created_by text not null default 'archtivy' check (created_by in ('archtivy','user'));
alter table public.profiles add column if not exists owner_user_id text null;
alter table public.profiles add column if not exists claim_status text not null default 'unclaimed' check (claim_status in ('unclaimed','pending','claimed'));

create index if not exists idx_profiles_owner_user_id on public.profiles (owner_user_id);
create index if not exists idx_profiles_claim_status on public.profiles (claim_status);
create index if not exists idx_profiles_created_by on public.profiles (created_by);

comment on column public.profiles.created_by is 'Who created: archtivy (admin) or user';
comment on column public.profiles.owner_user_id is 'Clerk user id of claimed owner; set on admin approval';
comment on column public.profiles.claim_status is 'unclaimed | pending (request submitted) | claimed';

-- 2) admin_users: who can approve/reject claims (optional; add your Clerk user ids)
create table if not exists public.admin_users (
  user_id text primary key
);
comment on table public.admin_users is 'Clerk user ids allowed to access /admin and approve claims';

-- 3) profile_claim_requests
create table if not exists public.profile_claim_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  requester_user_id text not null,
  requester_name text not null,
  requester_email text not null,
  requester_website text null,
  proof_note text null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text null,
  reviewed_by_admin_id text null,
  reviewed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists idx_pcr_profile_id on public.profile_claim_requests (profile_id);
create index if not exists idx_pcr_requester_user_id on public.profile_claim_requests (requester_user_id);
create index if not exists idx_pcr_status on public.profile_claim_requests (status);
create index if not exists idx_pcr_created_at on public.profile_claim_requests (created_at desc);

-- One pending request per (profile_id, requester_user_id)
create unique index if not exists idx_pcr_pending_unique
  on public.profile_claim_requests (profile_id, requester_user_id)
  where (status = 'pending');

comment on table public.profile_claim_requests is 'Claim requests; admin approves or rejects';

-- 4) Trigger: profiles.updated_at on update
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 5) RLS
alter table public.profiles enable row level security;
alter table public.profile_claim_requests enable row level security;

-- profiles: public read; authenticated update own claimed profile only; admin full (via service role)
drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles for select using (true);

drop policy if exists profiles_update_owner on public.profiles;
create policy profiles_update_owner on public.profiles for update
  using (owner_user_id = current_setting('app.clerk_user_id', true) and claim_status = 'claimed');

-- profile_claim_requests: user insert own; user select own; admin select/update (service role bypasses RLS)
drop policy if exists pcr_insert_own on public.profile_claim_requests;
create policy pcr_insert_own on public.profile_claim_requests for insert
  with check (requester_user_id = current_setting('app.clerk_user_id', true));

drop policy if exists pcr_select_own on public.profile_claim_requests;
create policy pcr_select_own on public.profile_claim_requests for select
  using (requester_user_id = current_setting('app.clerk_user_id', true));

-- Admin full access: use service role in server for admin routes (no policy needed for admin SELECT/UPDATE all).
-- If using RLS with Supabase Auth, add policy: admin_users table check. Here we rely on service role for admin.
