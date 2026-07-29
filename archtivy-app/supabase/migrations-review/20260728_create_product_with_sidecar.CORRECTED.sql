-- ============================================================================
-- REVIEW COPY — NOT APPLIED. See supabase/migrations-review/README.md
--
-- Purpose: make the listings + products dual-write atomic.
--
-- Today, createAdminProductFull() inserts into `listings`, then separately into
-- `products` with the same id. Each .from().insert() is its own PostgREST HTTP
-- request and its own implicit transaction, so there is no atomicity — the code
-- compensates with `listings.delete()` on failure. That compensation is
-- incomplete: of the six failure paths after the products insert, only one
-- deletes the products row, which is how 16 orphan rows accumulated.
--
-- A plpgsql function body executes inside a single implicit transaction, so
-- both inserts commit or neither does. This follows the pattern already used in
-- this codebase (get_or_create_unclaimed_profile, increment_listing_views,
-- match_product_images_by_embedding — 10 rpc call sites total).
--
-- NOTE ON NAMING: the file is dated 20260728 to sort last. Rename to the actual
-- apply date before promotion so the ledger stays chronological.
-- ============================================================================

-- Guard: products.id is expected to mirror listings.id. There is currently NO
-- foreign key enforcing that (verified: pg_constraint has zero FKs where
-- products is the child), which is precisely why orphans were able to
-- accumulate. Adding the FK is proposed as a SEPARATE, later migration because
-- it is a one-way gate once ON DELETE CASCADE starts firing — see the Phase A
-- report's rollback plan. This function does not depend on it.

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
  -- The three below exist so the PUBLIC path (createProductCanonical) can share
  -- this function. Their defaults reproduce the admin path exactly, so the admin
  -- call site passes none of them and behaves identically.
  --   admin  : status APPROVED, no clerk user, no colours
  --   public : status PENDING,  clerk user id, colours from the form
  -- They are part of the initial signature on purpose: `create or replace
  -- function` with a changed argument list creates an OVERLOAD rather than
  -- replacing, so widening this later would leave two functions behind.
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
  -- Both inserts share this transaction. Any exception raised here — including
  -- a constraint violation on either table — rolls back the whole function, so
  -- a half-written pair is not representable.

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
  'Atomically creates a listings row (type=product) and its products sidecar sharing the same id. Replaces the non-atomic two-request insert in createAdminProductFull(), which could not guarantee both rows existed and compensated with an incomplete listings.delete(). Returns the new listing id.';

-- Callable by the service role only. The admin action already runs through
-- getSupabaseServiceClient(); anon and authenticated have no reason to create
-- products directly, and granting them would bypass the Clerk-side admin check.
revoke all on function public.create_product_with_sidecar(
  text, text, text, uuid, text, text, text, text, text, integer, jsonb, text, text, text[], text, text, text[]
) from public, anon, authenticated;

grant execute on function public.create_product_with_sidecar(
  text, text, text, uuid, text, text, text, text, text, integer, jsonb, text, text, text[], text, text, text[]
) to service_role;

-- ── SCOPE NOTE ──────────────────────────────────────────────────────────────
-- This covers the CREATE path only. Two related problems are deliberately left
-- for separate, individually reviewable changes:
--
--   1. DELETE. deleteListing() and bulkDeleteListings() remove the listings row
--      but never the products row — the largest ongoing orphan source. The fix
--      is a foreign key with ON DELETE CASCADE, not another function.
--
--   2. The public path. createProductCanonical() in app/actions/listings.ts
--      writes products FIRST, then listings, and compensates in the opposite
--      direction (7 deleteProductRow calls), orphaning listings instead. It
--      needs its own RPC or a rewrite to call this one, and its argument set
--      differs. Adding it here would make this migration untestable in
--      isolation.
