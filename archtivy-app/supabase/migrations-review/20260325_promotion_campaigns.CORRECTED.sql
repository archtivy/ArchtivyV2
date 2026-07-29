-- ============================================================================
-- REVIEW COPY — NOT APPLIED. See supabase/migrations-review/README.md
--
-- Corrects: supabase/migrations/20260325_promotion_campaigns.sql
-- Verdict:  APPLY WITH CORRECTION
--
-- Schema/type compatibility with src/lib/promote/campaigns.ts — 14/14 exact.
-- The PromotionCampaign interface, the PlacementType union, and the status
-- union all match the column list and CHECK constraints exactly. No schema
-- change was needed.
--
-- CHANGES FROM ORIGINAL:
--   1. RLS policies replaced (lines 31-41 of the original). Detail below.
--   2. `create index` -> `create index if not exists` on all three indexes,
--      so a partially-applied migration can be re-run. The original mixed an
--      idempotent `create table if not exists` with non-idempotent indexes.
-- ============================================================================

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
-- Serves getActiveCampaigns(): placement_type + status + starts_at/ends_at window.
create index if not exists idx_promo_active_placement
  on promotion_campaigns (placement_type, status, ends_at)
  where status = 'active';

-- User's own campaigns — serves getUserCampaigns()
create index if not exists idx_promo_user on promotion_campaigns (user_id, created_at desc);

-- Listing lookup
create index if not exists idx_promo_listing on promotion_campaigns (listing_id, status);

-- ── CORRECTION: RLS ─────────────────────────────────────────────────────────
--
-- The original migration had:
--
--   create policy "Users can view own campaigns"
--     on promotion_campaigns for select
--     using (user_id = auth.uid()::text);
--
--   create policy "Users can insert own campaigns"
--     on promotion_campaigns for insert
--     with check (user_id = auth.uid()::text);
--
-- Both are dead. `user_id` holds a Clerk ID ("user_2abc..."), while auth.uid()
-- returns a Supabase Auth UUID. The comparison can never be true, so the
-- policies would grant nothing while appearing to protect the table.
--
-- Rewriting the comparison to a Clerk claim (auth.jwt() ->> 'sub') would be
-- correct in form but equally dead in this codebase today: no Clerk JWT ever
-- reaches Supabase. Verified across all four Supabase client factories --
-- supabaseClient.ts (anon, no token), supabaseServer.ts (service role),
-- supabaseGalleryAuth.ts (cookie-based, no accessToken), and
-- admin/realtimeListener.ts (anon). There is no authenticated Supabase client
-- in this application; authorization is enforced in application code via Clerk
-- auth() with all data access through the service role.
--
-- So: deny-by-default. The service role bypasses RLS, so every existing code
-- path in campaigns.ts keeps working unchanged, while the anon key -- which is
-- shipped to every browser -- can neither read nor write payment records.
alter table promotion_campaigns enable row level security;

-- Intentionally no policies. Access is service-role only:
--   getActiveCampaigns / getUserCampaigns / createPendingCampaign /
--   activateCampaign all use getSupabaseServiceClient().
--
-- Note the original's INSERT policy is dropped and not replaced even in the
-- forward path below. Campaign rows represent completed Stripe checkouts and
-- are created solely by api/promote/checkout; a user should never be able to
-- insert a payment record directly.

-- ── FORWARD PATH (do NOT apply now) ─────────────────────────────────────────
-- If direct client-side reads are wanted later, both of these must exist first:
--   1. Clerk configured as a Supabase Third-Party Auth provider
--   2. The Supabase client constructed with
--        accessToken: () => session?.getToken()
-- Only then does auth.jwt() ->> 'sub' resolve to the Clerk user ID and match
-- user_id. Until both are true this policy matches nothing -- which is exactly
-- the failure mode being corrected here, so it stays commented out.
--
--   create policy "Users can view own campaigns"
--     on promotion_campaigns for select
--     to authenticated
--     using (user_id = auth.jwt() ->> 'sub');
