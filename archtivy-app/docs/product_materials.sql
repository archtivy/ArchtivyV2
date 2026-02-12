-- Product materials taxonomy + links to products
-- Run in Supabase SQL Editor.

-- 1) Base table
create table if not exists public.product_materials (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

-- 2) Join table (products stored in public.products)
create table if not exists public.product_material_links (
  product_id uuid not null references public.products(id) on delete cascade,
  material_id uuid not null references public.product_materials(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, material_id)
);

create index if not exists idx_product_material_links_product_id on public.product_material_links(product_id);
create index if not exists idx_product_material_links_material_id on public.product_material_links(material_id);

-- 3) RLS
alter table public.product_materials enable row level security;
alter table public.product_material_links enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_materials' and policyname = 'product_materials_select_all'
  ) then
    create policy product_materials_select_all
      on public.product_materials
      for select
      to authenticated, anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_material_links' and policyname = 'product_material_links_select_all'
  ) then
    create policy product_material_links_select_all
      on public.product_material_links
      for select
      to authenticated, anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_material_links' and policyname = 'product_material_links_insert_auth'
  ) then
    create policy product_material_links_insert_auth
      on public.product_material_links
      for insert
      to authenticated
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'product_material_links' and policyname = 'product_material_links_delete_auth'
  ) then
    create policy product_material_links_delete_auth
      on public.product_material_links
      for delete
      to authenticated
      using (true);
  end if;
end $$;

-- 4) Seed data (deterministic slugs, upsert on slug)
insert into public.product_materials (display_name, slug)
values
  ('Solid Wood', 'solid-wood'),
  ('Plywood', 'plywood'),
  ('MDF', 'mdf'),
  ('Veneer', 'veneer'),
  ('Steel', 'steel'),
  ('Aluminum', 'aluminum'),
  ('Stainless Steel', 'stainless-steel'),
  ('Brass', 'brass'),
  ('Copper', 'copper'),
  ('Glass', 'glass'),
  ('Stone', 'stone'),
  ('Marble', 'marble'),
  ('Granite', 'granite'),
  ('Ceramic', 'ceramic'),
  ('Porcelain', 'porcelain'),
  ('Plastic', 'plastic'),
  ('Acrylic', 'acrylic'),
  ('Polycarbonate', 'polycarbonate'),
  ('PVC', 'pvc'),
  ('HPL Laminate', 'hpl-laminate'),
  ('Fabric', 'fabric'),
  ('Leather', 'leather'),
  ('Felt', 'felt'),
  ('Cork', 'cork'),
  ('Bamboo', 'bamboo'),
  ('Rattan', 'rattan'),
  ('Resin / Epoxy', 'resin-epoxy')
on conflict (slug) do update
set display_name = excluded.display_name;
