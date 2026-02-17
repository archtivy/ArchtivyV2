-- Profile visibility toggles for discipline/brand type on public profile.
-- Run in Supabase SQL Editor.

alter table public.profiles add column if not exists show_designer_discipline boolean not null default true;
alter table public.profiles add column if not exists show_brand_type boolean not null default true;

comment on column public.profiles.show_designer_discipline is 'When true, show designer_discipline on public profile.';
comment on column public.profiles.show_brand_type is 'When true, show brand_type on public profile.';
