-- Promotion campaigns: self-serve visibility boost for listings
create table if not exists promotion_campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,              -- Clerk user ID
  profile_id uuid,                    -- Profile that owns the listing
  listing_id uuid not null references listings(id) on delete cascade,
  placement_type text not null check (placement_type in ('map_spotlight', 'homepage_feature')),
  duration_days integer not null check (duration_days > 0),
  price_cents integer not null check (price_cents >= 0),
  status text not null default 'pending' check (status in ('pending', 'active', 'expired', 'cancelled')),
  starts_at timestamptz,
  ends_at timestamptz,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Fast lookup: active campaigns by placement
-- `if not exists` on all three: the file already uses `create table if not
-- exists`, so a partial failure would otherwise leave it un-rerunnable.
create index if not exists idx_promo_active_placement
  on promotion_campaigns (placement_type, status, ends_at)
  where status = 'active';

-- User's own campaigns
create index if not exists idx_promo_user on promotion_campaigns (user_id, created_at desc);

-- Listing lookup
create index if not exists idx_promo_listing on promotion_campaigns (listing_id, status);

-- ── RLS: deny-by-default ────────────────────────────────────────────────────
--
-- REPLACES the original policies, which were:
--   using (user_id = auth.uid()::text)   -- on select and insert
--
-- Those were dead. `user_id` holds a Clerk ID ("user_2abc..."); auth.uid()
-- returns a Supabase Auth UUID. The comparison can never be true, so the
-- policies granted nothing while appearing to protect payment records.
--
-- Rewriting to a Clerk claim (auth.jwt() ->> 'sub') would be correct in form
-- but equally dead here: no Clerk JWT reaches Supabase. Verified across all
-- four Supabase client factories -- supabaseClient.ts (anon, no token),
-- supabaseServer.ts (service role), supabaseGalleryAuth.ts (cookies only) and
-- admin/realtimeListener.ts (anon). This app has no authenticated Supabase
-- client; authorization is enforced in application code via Clerk auth(), with
-- all data access through the service role.
--
-- Deny-by-default is therefore the honest setting. The service role bypasses
-- RLS, so every path in src/lib/promote/campaigns.ts keeps working unchanged,
-- while the anon key -- shipped to every browser -- can neither read nor write
-- payment records.
alter table promotion_campaigns enable row level security;

-- Intentionally no policies. Access is service-role only:
--   getActiveCampaigns / getUserCampaigns / createPendingCampaign /
--   activateCampaign all use getSupabaseServiceClient().
--
-- The original INSERT policy is deliberately not replaced. Campaign rows
-- represent completed Stripe checkouts and are created solely by
-- api/promote/checkout; a user must never insert a payment record directly.
--
-- FORWARD PATH (do not enable yet): if direct client reads are ever wanted,
-- both of these must exist first --
--   1. Clerk configured as a Supabase Third-Party Auth provider
--   2. the client built with accessToken: () => session?.getToken()
-- Only then does auth.jwt() ->> 'sub' resolve to the Clerk user ID:
--
--   create policy "Users can view own campaigns"
--     on promotion_campaigns for select
--     to authenticated
--     using (user_id = auth.jwt() ->> 'sub');
