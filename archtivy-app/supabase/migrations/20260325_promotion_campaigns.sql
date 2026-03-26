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
create index idx_promo_active_placement
  on promotion_campaigns (placement_type, status, ends_at)
  where status = 'active';

-- User's own campaigns
create index idx_promo_user on promotion_campaigns (user_id, created_at desc);

-- Listing lookup
create index idx_promo_listing on promotion_campaigns (listing_id, status);

-- RLS: users see only their own campaigns
alter table promotion_campaigns enable row level security;

create policy "Users can view own campaigns"
  on promotion_campaigns for select
  using (user_id = auth.uid()::text);

create policy "Users can insert own campaigns"
  on promotion_campaigns for insert
  with check (user_id = auth.uid()::text);

-- Service role bypasses RLS for webhook/server operations
