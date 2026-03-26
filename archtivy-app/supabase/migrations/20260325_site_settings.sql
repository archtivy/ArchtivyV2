-- Site-wide settings (key-value store for admin-controlled feature flags)
create table if not exists site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

-- Seed the feature listing toggle (disabled by default)
insert into site_settings (key, value) values ('feature_listing_enabled', 'false')
on conflict (key) do nothing;
