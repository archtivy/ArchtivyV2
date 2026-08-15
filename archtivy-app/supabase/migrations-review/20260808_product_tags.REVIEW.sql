-- ============================================================================
-- Product Pinpoint Tagging — schema
-- Review copy. NOT APPLIED.
--
-- Reconciled against the real schema (Reconciliation doc + Round 2 findings):
--   media(id)     -> DOES NOT EXIST. Pins live on listing_images(id).
--   products(id)  -> is a SIDECAR. The tagged product is listings(id) type='product'.
--   users(id)     -> DOES NOT EXIST. The actor is profiles(id).
--   media_embeddings -> dropped; image_ai already has embeddings + HNSW + RPCs.
--
-- ── THE PLATFORM'S FIRST ENUM ───────────────────────────────────────────────
-- Confirmed in Round 2: this schema contains zero Postgres enum types; every
-- status is loose text, and the vocabularies disagree (listings.status is
-- UPPERCASE, everything else lowercase; listings.project_status stores both
-- 'Completed' and 'completed'). Per the locked decision, verification_status is
-- a real enum with lowercase values, matching the majority convention.
--
-- Deliberately NOT reusing any existing vocabulary: matches.tier
-- (possible/likely/strong/verified) is AI match CONFIDENCE, not moderation
-- state. Conflating them would be the "one name, two concepts" failure.
-- ============================================================================

begin;

-- ── Enum ────────────────────────────────────────────────────────────────────
-- `create type if not exists` does not exist in Postgres; the guard is manual.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'verification_status') then
    create type public.verification_status as enum (
      'unverified',     -- recorded, no one has looked
      'pending_review', -- queued for a moderator
      'verified',       -- a moderator confirmed it
      'official',       -- confirmed by the brand/owner themselves
      'rejected'        -- reviewed and refused
    );
  end if;
end $$;

-- ── product_tags ────────────────────────────────────────────────────────────
create table if not exists public.product_tags (
  id                  uuid primary key default gen_random_uuid(),

  -- WHERE the pin sits: a specific photo.
  listing_image_id    uuid not null references public.listing_images(id) on delete cascade,
  -- The listing that photo belongs to. Denormalised so the moderation queue and
  -- the owner surface can filter by project without joining through images.
  -- Kept honest by the trigger below.
  listing_id          uuid not null references public.listings(id) on delete cascade,

  -- WHAT is pinned: a product listing.
  tagged_listing_id   uuid not null references public.listings(id) on delete cascade,

  -- Position as PERCENTAGES, never pixels — the same pin must land correctly on
  -- every rendered size of the image.
  x_percent           numeric(5,2) not null check (x_percent >= 0 and x_percent <= 100),
  y_percent           numeric(5,2) not null check (y_percent >= 0 and y_percent <= 100),

  tag_source          text not null default 'ai' check (tag_source in ('owner','ai')),
  verification_status public.verification_status not null default 'unverified',

  -- Stored for review context and ranking. NEVER used to auto-approve: an AI
  -- suggestion becomes official only through a human transition
  -- (Database Bible — AI suggestions must be reviewable before becoming
  -- official). Nothing in this schema promotes a row based on this number.
  ai_confidence       numeric(4,3) check (ai_confidence is null or (ai_confidence >= 0 and ai_confidence <= 1)),

  created_by          uuid references public.profiles(id) on delete set null,
  reviewed_by         uuid references public.profiles(id) on delete set null,
  reviewed_at         timestamptz,
  review_note         text,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),

  -- One pin per product per image.
  constraint product_tags_one_per_product_per_image
    unique (listing_image_id, tagged_listing_id)
);

create index if not exists product_tags_image_idx on public.product_tags (listing_image_id);
create index if not exists product_tags_listing_idx on public.product_tags (listing_id);
create index if not exists product_tags_tagged_idx on public.product_tags (tagged_listing_id);
create index if not exists product_tags_queue_idx
  on public.product_tags (verification_status, created_at desc);

-- ── Integrity that a FK alone cannot express ────────────────────────────────
-- `listings` holds both projects and products, so the FK on tagged_listing_id
-- cannot say "must be a product". A CHECK cannot either (subqueries are not
-- allowed in CHECK), so this is a trigger — the only correct tool here.
-- It also keeps listing_id consistent with the image's real owner rather than
-- trusting the caller.
create or replace function public.product_tags_validate()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_image_listing uuid;
  v_tagged_type   text;
begin
  select li.listing_id into v_image_listing
    from public.listing_images li where li.id = new.listing_image_id;

  if v_image_listing is null then
    raise exception 'listing_image % has no listing', new.listing_image_id;
  end if;

  -- Derived, not trusted: a caller cannot pin an image onto the wrong project.
  new.listing_id := v_image_listing;

  select l.type into v_tagged_type
    from public.listings l where l.id = new.tagged_listing_id;

  if v_tagged_type is distinct from 'product' then
    raise exception 'tagged_listing_id % is not a product (type=%)',
      new.tagged_listing_id, coalesce(v_tagged_type, 'missing');
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists product_tags_validate on public.product_tags;
create trigger product_tags_validate
  before insert or update on public.product_tags
  for each row execute function public.product_tags_validate();

-- ── Audit trail ─────────────────────────────────────────────────────────────
-- Separate from audit_logs (which is admin-action scoped) because this records
-- the lifecycle of a single tag, including owner actions, and must survive the
-- tag's deletion — hence no FK cascade back to product_tags.
create table if not exists public.product_tag_audit_log (
  id              uuid primary key default gen_random_uuid(),
  product_tag_id  uuid not null,
  action          text not null check (action in ('created','moved','status_changed','deleted')),
  from_status     public.verification_status,
  to_status       public.verification_status,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_kind      text not null default 'human' check (actor_kind in ('human','ai')),
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists product_tag_audit_tag_idx
  on public.product_tag_audit_log (product_tag_id, created_at desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Only CONFIRMED pins are public. An unverified AI guess must never render to a
-- visitor as though the owner had stated it.
alter table public.product_tags enable row level security;
alter table public.product_tag_audit_log enable row level security;

drop policy if exists "Public can read confirmed product tags" on public.product_tags;
create policy "Public can read confirmed product tags"
  on public.product_tags for select
  using (verification_status in ('verified','official'));

commit;

-- ── Verification ────────────────────────────────────────────────────────────
--   select unnest(enum_range(null::public.verification_status));
--        -- unverified, pending_review, verified, official, rejected
--   select count(*) from public.product_tags;            -- 0
--   -- trigger check: tagging a PROJECT should raise.
--   -- insert into product_tags (listing_image_id, listing_id, tagged_listing_id,
--   --   x_percent, y_percent)
--   -- select li.id, li.listing_id, l.id, 50, 50
--   --   from listing_images li, listings l where l.type='project' limit 1;
--   --        -- expect: ERROR ... is not a product (type=project)
