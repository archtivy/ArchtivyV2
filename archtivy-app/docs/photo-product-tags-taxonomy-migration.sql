-- Tag Editor taxonomy fields: type/category/subcategory (ids from product taxonomy).
-- Run after photo-product-tags-admin-metadata-migration.sql.
-- After running, reload PostgREST schema cache.

alter table public.photo_product_tags
  add column if not exists product_type_id text,
  add column if not exists product_category_id text,
  add column if not exists product_subcategory_id text;

comment on column public.photo_product_tags.product_type_id is 'Admin: product type id (taxonomy slug).';
comment on column public.photo_product_tags.product_category_id is 'Admin: product category id (taxonomy slug).';
comment on column public.photo_product_tags.product_subcategory_id is 'Admin: product subcategory id (taxonomy slug).';
