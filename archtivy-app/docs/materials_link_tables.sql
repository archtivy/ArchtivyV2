-- Materials link tables only. Run in Supabase SQL Editor.
-- Requires: public.listings, public.project_materials, public.products, public.product_materials.
-- Projects are in public.listings (type = 'project'); products in public.products.

-- 1) project_material_links
create table if not exists public.project_material_links (
  project_id uuid not null references public.listings(id) on delete cascade,
  material_id uuid not null references public.project_materials(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, material_id)
);
create index if not exists idx_project_material_links_project_id on public.project_material_links(project_id);
create index if not exists idx_project_material_links_material_id on public.project_material_links(material_id);

-- 2) product_material_links
create table if not exists public.product_material_links (
  product_id uuid not null references public.products(id) on delete cascade,
  material_id uuid not null references public.product_materials(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (product_id, material_id)
);
create index if not exists idx_product_material_links_product_id on public.product_material_links(product_id);
create index if not exists idx_product_material_links_material_id on public.product_material_links(material_id);

-- 3) RLS: allow SELECT for anon + authenticated
alter table public.project_material_links enable row level security;
alter table public.product_material_links enable row level security;

drop policy if exists project_material_links_select_all on public.project_material_links;
create policy project_material_links_select_all
  on public.project_material_links for select to authenticated, anon using (true);

drop policy if exists product_material_links_select_all on public.product_material_links;
create policy product_material_links_select_all
  on public.product_material_links for select to authenticated, anon using (true);

-- Allow authenticated to insert/delete (for add project/product)
drop policy if exists project_material_links_insert_auth on public.project_material_links;
create policy project_material_links_insert_auth on public.project_material_links for insert to authenticated with check (true);
drop policy if exists project_material_links_delete_auth on public.project_material_links;
create policy project_material_links_delete_auth on public.project_material_links for delete to authenticated using (true);

drop policy if exists product_material_links_insert_auth on public.product_material_links;
create policy product_material_links_insert_auth on public.product_material_links for insert to authenticated with check (true);
drop policy if exists product_material_links_delete_auth on public.product_material_links;
create policy product_material_links_delete_auth on public.product_material_links for delete to authenticated using (true);
