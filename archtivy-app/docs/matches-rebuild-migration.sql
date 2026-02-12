-- Matches rebuild: allow tier values strong/likely/possible and add matches_runs table.
-- Run in Supabase SQL Editor after matches-engine-migration.sql.

-- Allow new tier values (keep verified, possible for backward compatibility)
alter table public.matches drop constraint if exists matches_tier_check;
alter table public.matches add constraint matches_tier_check
  check (tier in ('verified', 'possible', 'strong', 'likely'));

-- If the constraint name differs (e.g. matches_tier_check already dropped), run only:
-- alter table public.matches add constraint matches_tier_check
--   check (tier in ('verified', 'possible', 'strong', 'likely'));

-- Log each rebuild run for observability
create table if not exists public.matches_runs (
  run_id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('started', 'completed', 'failed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  projects_count int,
  products_count int,
  matches_upserted int,
  matches_deleted_stale int,
  error_message text
);

comment on table public.matches_runs is 'Log of match rebuild runs (Rebuild Matches Now and auto-trigger)';
create index if not exists idx_matches_runs_started_at on public.matches_runs (started_at desc);
