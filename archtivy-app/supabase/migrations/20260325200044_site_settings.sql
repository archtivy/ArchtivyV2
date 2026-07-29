-- Site-wide settings (key-value store for admin-controlled feature flags)
create table if not exists site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Seed the feature listing toggle (disabled by default)
insert into site_settings (key, value) values ('feature_listing_enabled', 'false')
on conflict (key) do nothing;

-- ── RLS: deny-by-default ────────────────────────────────────────────────────
-- The original migration omitted RLS entirely.
--
-- Tables in schema `public` are served through PostgREST, and Supabase's
-- default grants give the `anon` role table privileges -- so a public table
-- with RLS disabled is readable *and writable* with the publishable anon key
-- that ships to every browser. This table is a feature-flag store gating a
-- Stripe payment flow (api/promote/checkout reads it before creating a
-- checkout session), so leaving it open would let any visitor toggle a paid
-- feature.
--
-- Reads and writes go through getSupabaseServiceClient() (getSiteSetting /
-- setSiteSetting in src/lib/db/siteSettings.ts), which bypasses RLS, so no
-- policy is needed for the application to work.
alter table site_settings enable row level security;

-- Intentionally no policies. Access is service-role only.
