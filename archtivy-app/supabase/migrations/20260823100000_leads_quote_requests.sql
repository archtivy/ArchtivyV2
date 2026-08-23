-- Quote requests, as an extension of `leads` rather than a second table.
--
-- ── WHY EXTEND AND NOT ADD A TABLE ──────────────────────────────────────────
-- `leads` already is an inbound-request pipeline: a visitor submits, the row
-- lands as 'pending', an admin reviews it at /admin/leads and approval forwards
-- it to the listing owner by email. A quote request is that same flow carrying
-- more fields. A parallel `quote_requests` table would need its own status
-- enum, its own moderation screen and its own forwarding path — three things
-- to keep in step with these for no gain.
--
-- ── ADDITIVE AND REVERSIBLE ─────────────────────────────────────────────────
-- Every column is nullable or defaulted, so existing rows stay valid and no
-- backfill is required. `kind` defaults to 'contact', which is exactly what
-- every existing row is.
--
-- ── NOTE ON LEDGER DRIFT ────────────────────────────────────────────────────
-- The `leads` table itself is NOT in this migrations directory — it was
-- created from docs/leads-table.sql by hand. This migration therefore depends
-- on an object the ledger does not describe. Deliberately not "fixing" that
-- here by recreating the table: writing a CREATE TABLE for a table that
-- already exists in production, from a file that may not match it, is how a
-- ledger repair becomes an outage. Flagged in the PR for a separate,
-- deliberate reconciliation.

-- Guard: fail loudly and early if the base table is missing, rather than
-- partway through with some columns added.
do $$
begin
  if not exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'leads'
  ) then
    raise exception 'public.leads does not exist — apply docs/leads-table.sql first';
  end if;
end $$;

alter table public.leads
  -- Discriminator. 'contact' is the existing general enquiry; 'quote' carries
  -- the specification fields below.
  add column if not exists kind text not null default 'contact',
  -- Quote-specific. All nullable: a contact lead has none of them, and a quote
  -- with only a message is still a real quote worth forwarding.
  add column if not exists quantity text null,
  add column if not exists project_name text null,
  add column if not exists location text null,
  add column if not exists desired_timeline text null,
  -- Idempotency: minted client-side when the form opens, so a double-submit,
  -- a retried request or a refresh-and-resend collapses onto one row.
  add column if not exists idempotency_key text null;

-- Text, not an enum. lead_status is an enum because admins act on it and a
-- typo there changes moderation behaviour; `kind` is a fixed pair that a CHECK
-- constrains just as well, without an ALTER TYPE every time a third shape of
-- request appears.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'leads_kind_check'
  ) then
    alter table public.leads
      add constraint leads_kind_check check (kind in ('contact', 'quote'));
  end if;
end $$;

-- Partial unique index: NULL keys must not collide with each other, and every
-- pre-existing row has a NULL key.
create unique index if not exists idx_leads_idempotency_key
  on public.leads (idempotency_key)
  where idempotency_key is not null;

-- The admin queue filters by kind alongside status.
create index if not exists idx_leads_kind_status
  on public.leads (kind, status);

comment on column public.leads.kind is
  'contact: general enquiry from a listing or profile. quote: product quote request with specification fields.';
comment on column public.leads.quantity is
  'Free text, not numeric — real answers are "40-60 units" or "1 prototype".';
comment on column public.leads.project_name is
  'The requester''s own project this product is being specified for.';
comment on column public.leads.location is
  'Delivery or project location, free text.';
comment on column public.leads.desired_timeline is
  'Free text, e.g. "Q3 2026" or "within 6 weeks".';
comment on column public.leads.idempotency_key is
  'Client-minted UUID, unique when present. Collapses duplicate submissions of the same form onto one row.';
