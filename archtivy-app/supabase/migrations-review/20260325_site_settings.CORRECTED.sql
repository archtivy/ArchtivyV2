-- ============================================================================
-- REVIEW COPY — NOT APPLIED. See supabase/migrations-review/README.md
--
-- Corrects: supabase/migrations/20260325_site_settings.sql
-- Verdict:  APPLY (schema is fully compatible; one security correction added)
--
-- Compatibility with src/lib/db/siteSettings.ts — 3/3 exact:
--   getSiteSetting()  selects "value" where key = $1        -> key, value
--   setSiteSetting()  upsert {key, value, updated_at}
--                     onConflict "key"                      -> requires key unique (it is the PK)
--   seed value 'feature_listing_enabled'                    -> matches SETTINGS_KEYS.FEATURE_LISTING_ENABLED
--
-- CHANGE FROM ORIGINAL: added the RLS block at the bottom. Nothing else differs.
-- ============================================================================

-- Site-wide settings (key-value store for admin-controlled feature flags)
create table if not exists site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Seed the feature listing toggle (disabled by default)
insert into site_settings (key, value) values ('feature_listing_enabled', 'false')
on conflict (key) do nothing;

-- ── CORRECTION: enable RLS ──────────────────────────────────────────────────
-- The original migration omitted this entirely.
--
-- Tables in schema `public` are served through PostgREST. Supabase's default
-- grants give the `anon` role table privileges, so a public table with RLS
-- disabled is readable *and writable* with the publishable anon key — which is
-- shipped to every browser. This table is a feature-flag store that gates a
-- Stripe payment flow (api/promote/checkout reads it before creating a
-- checkout session), so leaving it unprotected would let any visitor toggle
-- a paid feature on or off.
--
-- Deny-by-default is correct here: every read and write goes through
-- getSupabaseServiceClient() (service role), which bypasses RLS. No policy is
-- needed for the application to keep working, and adding none means anon and
-- authenticated both get zero rows.
alter table site_settings enable row level security;

-- Intentionally no policies. Access is service-role only.
-- Optional additional hardening (not required — RLS with no policies already
-- blocks these roles; include only if you want defence in depth):
--   revoke all on table site_settings from anon, authenticated;
