-- ============================================================================
-- audit_logs — the table lib/db/audit.ts has been writing to since it was
-- written, which has never existed.
--
-- URGENT, INDEPENDENT OF FEATURE WORK. createAuditLog() is called from 16
-- admin sites (approve, delete, bulk delete, create, update, role change,
-- disable, delete user) and discards the insert result, so every one of those
-- actions has silently logged nothing. Verified: an insert returns
-- PGRST205 "Could not find the table 'public.audit_logs' in the schema cache".
--
-- ── COLUMN NOTE: admin_user_id is a CLERK id, not a profiles UUID ───────────
-- Every existing call site passes `admin.adminUserId`, which comes from Clerk's
-- auth() and looks like `user_39T1pwMgzN2MgQz8sEHK5ZZfqcs`. It is therefore
-- text, not a uuid FK — typing it as uuid would make all 16 sites fail on
-- insert instead of failing on a missing table, which is not an improvement.
--
-- `admin_profile_id` is added alongside it as a nullable, real FK to
-- profiles(id): createAuditLog resolves it best-effort from the Clerk id. That
-- gives referential integrity where a profile exists, without inventing one
-- where it does not. This is the Q1 decision (actor = profiles.id) applied
-- honestly to a caller that only has a Clerk id in hand.
-- ============================================================================

begin;

create table if not exists public.audit_logs (
  id               uuid primary key default gen_random_uuid(),

  -- Who. Clerk id is what the callers have; the profile FK is resolved when possible.
  admin_user_id    text not null,
  admin_profile_id uuid references public.profiles(id) on delete set null,

  -- What. Kept as text rather than an enum: the AuditAction union in
  -- lib/db/audit.ts already constrains it at the type level, and an audit log
  -- must never reject a write because a new action name was added before the
  -- migration ran. Losing the record is worse than storing an unknown verb.
  action           text not null,
  entity_type      text not null,
  entity_id        uuid,

  metadata         jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now()
);

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_entity_idx on public.audit_logs (entity_type, entity_id);
create index if not exists audit_logs_admin_idx on public.audit_logs (admin_user_id, created_at desc);
create index if not exists audit_logs_action_idx on public.audit_logs (action, created_at desc);

-- RLS on with NO public policy: an audit log is admin-only by definition. The
-- service-role client bypasses RLS, which is how the app writes and reads it;
-- the anon key can never see a row.
alter table public.audit_logs enable row level security;

commit;

-- ── Verification ────────────────────────────────────────────────────────────
--   select count(*) from public.audit_logs;   -- 0 immediately after apply
--   -- then approve a listing in /admin and re-run: expect 1 row with
--   -- action='listing.approve' and a resolved admin_profile_id.
