-- Admin-only Smart Product Tagging metadata on photo_product_tags.
-- Run after project-brands-products-photo-tags-migration.sql.
-- After running, reload PostgREST schema cache: Supabase Dashboard -> API -> Reload schema cache.

-- Allow tag to exist before a product is chosen (admin places hotspot, then selects from suggestions).
alter table public.photo_product_tags
  alter column product_id drop not null;

-- Admin-only metadata: category, color, material, feature text, who created.
alter table public.photo_product_tags
  add column if not exists category_text text,
  add column if not exists color_text text,
  add column if not exists material_id uuid references public.materials (id) on delete set null,
  add column if not exists feature_text text,
  add column if not exists created_by_clerk_id text;

comment on column public.photo_product_tags.category_text is 'Admin: product category (required for tag editor).';
comment on column public.photo_product_tags.color_text is 'Admin: color (required for tag editor).';
comment on column public.photo_product_tags.material_id is 'Admin: material FK (required for tag editor).';
comment on column public.photo_product_tags.feature_text is 'Admin: optional distinct feature short text.';
comment on column public.photo_product_tags.created_by_clerk_id is 'Admin: Clerk user id who created the tag.';

create index if not exists idx_photo_product_tags_material_id
  on public.photo_product_tags (material_id);
