-- Project materials taxonomy + links to listings (type=project)
-- Run in Supabase SQL Editor.

-- 1) Base table
create table if not exists public.project_materials (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- 2) Join table (projects are stored in public.listings with type = 'project')
create table if not exists public.project_material_links (
  project_id uuid not null references public.listings(id) on delete cascade,
  material_id uuid not null references public.project_materials(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, material_id)
);

create index if not exists idx_project_material_links_project_id on public.project_material_links(project_id);
create index if not exists idx_project_material_links_material_id on public.project_material_links(material_id);

-- 3) RLS
alter table public.project_materials enable row level security;
alter table public.project_material_links enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_materials' and policyname = 'project_materials_select_all'
  ) then
    create policy project_materials_select_all
      on public.project_materials
      for select
      to authenticated, anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_material_links' and policyname = 'project_material_links_select_all'
  ) then
    create policy project_material_links_select_all
      on public.project_material_links
      for select
      to authenticated, anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_material_links' and policyname = 'project_material_links_insert_auth'
  ) then
    create policy project_material_links_insert_auth
      on public.project_material_links
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'project_material_links' and policyname = 'project_material_links_delete_auth'
  ) then
    create policy project_material_links_delete_auth
      on public.project_material_links
      for delete
      to authenticated
      using (true);
  end if;
end $$;

-- 4) Seed data (deterministic slugs, upsert on slug)
insert into public.project_materials (display_name, slug)
values
  ('Concrete', 'concrete'),
  ('Steel', 'steel'),
  ('Glass', 'glass'),
  ('Brick', 'brick'),
  ('Stone', 'stone'),
  ('Wood', 'wood'),
  ('Plastic', 'plastic'),
  ('Textiles', 'textiles'),
  ('Plaster', 'plaster'),
  ('Stucco', 'stucco'),
  ('Paint', 'paint'),
  ('Ceramic Tile', 'ceramic-tile'),
  ('Porcelain Tile', 'porcelain-tile'),
  ('Terracotta', 'terracotta'),
  ('Terrazzo', 'terrazzo'),
  ('Gypsum Board (Drywall)', 'gypsum-board-drywall'),
  ('Insulation', 'insulation')
on conflict (slug) do update
set display_name = excluded.display_name;
