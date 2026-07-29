-- Add a slug-collision guard to create_product_with_sidecar.
--
-- Forward-only: 20260728190000 is already applied and recorded in the ledger, so
-- it must not be edited. Same argument list, so `create or replace` genuinely
-- replaces the function rather than creating an overload.
--
-- WHY: slug uniqueness was being checked against two different tables.
--   admin path  — ensureUniqueSlug() in _actions/listings.ts:39 checks `listings`
--   public path — ensureUniqueSlug() in lib/db/gallery.ts:243 checks `products`
-- `/products/[...segments]` resolves against `listings`, and so does sitemap.ts,
-- so `listings` is the table that actually owns the public URL space. A slug
-- unique in `products` could already collide with a live listing.
--
-- Both tables do carry unique indexes on slug (idx_listings_slug_unique — partial,
-- WHERE slug IS NOT NULL AND slug <> '' — and products_slug_key), so a collision
-- was never silent corruption; it surfaced as a raw 23505. This guard checks the
-- URL-owning table explicitly and fails with a message that names the slug,
-- instead of leaving the caller to decode a constraint name. The unique indexes
-- remain the real enforcement, including against races between the check and the
-- insert.

create or replace function public.create_product_with_sidecar(
  p_title                        text,
  p_description                  text,
  p_slug                         text,
  p_owner_profile_id             uuid,
  p_product_type                 text default null,
  p_product_category             text default null,
  p_product_subcategory          text default null,
  p_material_or_finish           text default null,
  p_dimensions                   text default null,
  p_year                         integer default null,
  p_team_members                 jsonb default '[]'::jsonb,
  p_product_stage                text default null,
  p_product_collaboration_status text default null,
  p_product_looking_for          text[] default '{}'::text[],
  p_status                       text default 'APPROVED',
  p_owner_clerk_user_id          text default null,
  p_color_options                text[] default '{}'::text[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing_id uuid;
begin
  if p_slug is null or btrim(p_slug) = '' then
    raise exception 'create_product_with_sidecar: slug is required'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Guard against a slug already claimed in the URL-owning table.
  if exists (select 1 from public.listings where slug = p_slug) then
    raise exception 'create_product_with_sidecar: slug "%" is already used by an existing listing', p_slug
      using errcode = 'unique_violation';
  end if;

  -- Both inserts share this transaction. Any exception raised here — including
  -- the guards above or a constraint violation on either table — rolls back the
  -- whole function, so a half-written pair is not representable.

  insert into public.listings (
    type, listing_type, status, title, description, slug,
    product_type, product_category, product_subcategory,
    material_or_finish, dimensions, year, team_members,
    location, category, area_sqft, brands_used,
    owner_clerk_user_id, owner_profile_id, cover_image_url,
    product_stage, product_collaboration_status, product_looking_for
  ) values (
    'product', 'product', coalesce(nullif(btrim(p_status), ''), 'APPROVED'), p_title, nullif(btrim(p_description), ''), p_slug,
    nullif(btrim(p_product_type), ''), nullif(btrim(p_product_category), ''), nullif(btrim(p_product_subcategory), ''),
    nullif(btrim(p_material_or_finish), ''), nullif(btrim(p_dimensions), ''), p_year, coalesce(p_team_members, '[]'::jsonb),
    null, null, null, '[]'::jsonb,
    nullif(btrim(p_owner_clerk_user_id), ''), p_owner_profile_id, null,
    nullif(btrim(p_product_stage), ''), nullif(btrim(p_product_collaboration_status), ''), coalesce(p_product_looking_for, '{}'::text[])
  )
  returning id into v_listing_id;

  insert into public.products (id, slug, title, subtitle, status, color_options, color)
  values (
    v_listing_id, p_slug, p_title, nullif(btrim(p_description), ''),
    coalesce(nullif(btrim(p_status), ''), 'APPROVED'),
    coalesce(p_color_options, '{}'::text[]),
    -- mirrors the public path's existing rule: first colour becomes the scalar
    case when coalesce(array_length(p_color_options, 1), 0) > 0 then p_color_options[1] else null end
  );

  return v_listing_id;
end;
$$;

comment on function public.create_product_with_sidecar is
  'Atomically creates a listings row (type=product) and its products sidecar sharing the same id. Rejects a slug already present in listings, the table that owns the public URL space. Returns the new listing id.';

revoke all on function public.create_product_with_sidecar(
  text, text, text, uuid, text, text, text, text, text, integer, jsonb, text, text, text[], text, text, text[]
) from public, anon, authenticated;

grant execute on function public.create_product_with_sidecar(
  text, text, text, uuid, text, text, text, text, text, integer, jsonb, text, text, text[], text, text, text[]
) to service_role;
