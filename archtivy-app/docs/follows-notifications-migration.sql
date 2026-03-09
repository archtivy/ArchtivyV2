-- ============================================================
-- FOLLOWS + NOTIFICATIONS  —  Migration
-- Run against Supabase SQL Editor (public schema)
-- ============================================================

-- ── FOLLOWS ─────────────────────────────────────────────────
-- Users follow designers, brands, categories, or materials.
create table if not exists public.follows (
  id              uuid        primary key default gen_random_uuid(),
  follower_profile_id uuid    not null references public.profiles(id) on delete cascade,
  target_type     text        not null check (target_type in ('designer','brand','category','material')),
  target_id       text        not null,
  created_at      timestamptz not null default now(),
  unique(follower_profile_id, target_type, target_id)
);

create index if not exists idx_follows_follower on public.follows(follower_profile_id);
create index if not exists idx_follows_target   on public.follows(target_type, target_id);

-- ── NOTIFICATIONS ("Network Updates") ───────────────────────
create table if not exists public.notifications (
  id                    uuid        primary key default gen_random_uuid(),
  recipient_profile_id  uuid        not null references public.profiles(id) on delete cascade,
  actor_profile_id      uuid        references public.profiles(id) on delete set null,
  source                text        not null check (source in ('system','follow_event','admin')),
  event_type            text        not null check (event_type in (
    'new_follower',
    'mentioned_in_project',
    'mentioned_in_product',
    'designer_published_project',
    'brand_published_product',
    'followed_category_new_listing',
    'followed_material_new_listing',
    'admin_update'
  )),
  entity_type           text,
  entity_id             text,
  title                 text,
  body                  text,
  cta_label             text,
  cta_url               text,
  is_read               boolean     not null default false,
  priority              text        not null default 'normal' check (priority in ('low','normal','high')),
  group_key             text,
  created_at            timestamptz not null default now()
);

create index if not exists idx_notifications_recipient
  on public.notifications(recipient_profile_id, created_at desc);

create index if not exists idx_notifications_unread
  on public.notifications(recipient_profile_id) where is_read = false;

create index if not exists idx_notifications_group_key
  on public.notifications(group_key) where group_key is not null;
