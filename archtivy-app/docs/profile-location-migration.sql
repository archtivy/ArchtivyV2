-- Profile location columns for Mapbox location selection during onboarding.
-- Run in Supabase SQL Editor.
-- Requires: public.profiles table with clerk_user_id.

-- Add columns if missing (idempotent)
alter table public.profiles add column if not exists location_place_name text;
alter table public.profiles add column if not exists location_city text;
alter table public.profiles add column if not exists location_country text;
alter table public.profiles add column if not exists location_lat double precision;
alter table public.profiles add column if not exists location_lng double precision;
alter table public.profiles add column if not exists location_mapbox_id text;
alter table public.profiles add column if not exists location_visibility text not null default 'public';

-- Index for map queries (projects/profiles near location)
create index if not exists idx_profiles_location_coords
  on public.profiles (location_lat, location_lng)
  where location_lat is not null and location_lng is not null;

comment on column public.profiles.location_place_name is 'Full place name from Mapbox Geocoding (e.g. "San Francisco, California, United States")';
comment on column public.profiles.location_city is 'City from Mapbox context (place. or locality.)';
comment on column public.profiles.location_country is 'Country from Mapbox context (country.)';
comment on column public.profiles.location_lat is 'Latitude from Mapbox feature.center[1]';
comment on column public.profiles.location_lng is 'Longitude from Mapbox feature.center[0]';
comment on column public.profiles.location_mapbox_id is 'Mapbox feature id for reference';
comment on column public.profiles.location_visibility is 'public = show on profile; private = hide';
