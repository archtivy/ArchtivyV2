-- Remove the three project_product_links rows whose listings are both deleted.
--
-- ── WHAT THESE ARE ──────────────────────────────────────────────────────────
-- Seed rows from the platform's first day. All three are source='manual',
-- created 2026-02-03, and BOTH ends were soft-deleted a week later on
-- 2026-02-10 — the products as well as the projects. Two of them point at a
-- product whose slug is literally "product".
--
--   project 50439a12-4982-44a9-9565-5717b522f6fe  beverly-hills-house
--     -> product 4f4df292-8636-48c5-8bbb-d8cecd9cfbcc  side-table
--
--   project a3b40185-0074-41e0-b68a-dcf310fa21f7  hiils-house
--     -> product 01e4fd0c-16e5-4faf-9d22-66301b6b23bc  product
--
--   project 7f665d68-0a44-4f63-9d5d-66bc65c8d4bf  santa-monica-house
--     -> product 01e4fd0c-16e5-4faf-9d22-66301b6b23bc  product
--
-- Note the third and second share a product id, so the rows are identified by
-- the (project_id, product_id) pair, not by product alone.
--
-- ── WHY REMOVE THEM NOW, HAVING DELIBERATELY KEPT THEM BEFORE ───────────────
-- These were reviewed on 2026-08-25 and left in place: every read joins through
-- live listings, so they are invisible, and a migration for three rows was
-- judged not worth it. That call is now reversed on request. Nothing about the
-- data changed — only the decision.
--
-- The one real effect they had is a counting one: `select count(*) from
-- project_product_links` reports 22 while the usable figure is 19. Anyone
-- quoting the raw count overstates the graph by three edges.
--
-- ── WHY THIS IS NOT "DELETE WHERE THE LISTING IS DELETED" ───────────────────
-- A blanket predicate would also delete any future row whose listing is
-- soft-deleted — and soft deletion is reversible. Restoring a project would
-- then silently come back with its product links missing, and nothing would
-- record that they had ever existed. These three ids are named explicitly
-- because they are the three that were reviewed; a rule would act on rows
-- nobody has looked at.
--
-- ── SCOPE ───────────────────────────────────────────────────────────────────
-- Deletes 3 rows. Leaves 19, of which 16 have both ends live and APPROVED (the
-- remaining 3 involve a DRAFT project, which is correct and not this
-- migration's business). Touches no live listing and no other table.
--
-- Idempotent: the delete is guarded on the same pair list, so a re-run matches
-- nothing and the assertions still hold.

do $$
declare
  v_target bigint;
  v_total bigint;
begin
  select count(*) into v_target
  from public.project_product_links
  where (project_id, product_id) in (
    ('50439a12-4982-44a9-9565-5717b522f6fe', '4f4df292-8636-48c5-8bbb-d8cecd9cfbcc'),
    ('a3b40185-0074-41e0-b68a-dcf310fa21f7', '01e4fd0c-16e5-4faf-9d22-66301b6b23bc'),
    ('7f665d68-0a44-4f63-9d5d-66bc65c8d4bf', '01e4fd0c-16e5-4faf-9d22-66301b6b23bc')
  );

  select count(*) into v_total from public.project_product_links;
  raise notice 'before: % of 3 target rows present; % links in total', v_target, v_total;

  if v_target = 0 then
    raise notice 'nothing to do — already applied';
  elsif v_target <> 3 then
    -- 3 was measured on 2026-08-27. Anything else means the data moved and this
    -- should be re-reviewed rather than run against a state it was not written for.
    raise exception 'expected 3 target rows, found % — stopping rather than guessing', v_target;
  end if;

  -- Refuse to run if any target has come back to life. Soft deletion is
  -- reversible, and a restored listing's links are not debris.
  if exists (
    select 1
    from public.project_product_links ppl
    join public.listings l
      on l.id in (ppl.project_id, ppl.product_id)
    where (ppl.project_id, ppl.product_id) in (
        ('50439a12-4982-44a9-9565-5717b522f6fe', '4f4df292-8636-48c5-8bbb-d8cecd9cfbcc'),
        ('a3b40185-0074-41e0-b68a-dcf310fa21f7', '01e4fd0c-16e5-4faf-9d22-66301b6b23bc'),
        ('7f665d68-0a44-4f63-9d5d-66bc65c8d4bf', '01e4fd0c-16e5-4faf-9d22-66301b6b23bc')
      )
      and l.deleted_at is null
  ) then
    raise exception 'a target row now points at a LIVE listing — refusing to delete';
  end if;
end $$;

delete from public.project_product_links
where (project_id, product_id) in (
  ('50439a12-4982-44a9-9565-5717b522f6fe', '4f4df292-8636-48c5-8bbb-d8cecd9cfbcc'),
  ('a3b40185-0074-41e0-b68a-dcf310fa21f7', '01e4fd0c-16e5-4faf-9d22-66301b6b23bc'),
  ('7f665d68-0a44-4f63-9d5d-66bc65c8d4bf', '01e4fd0c-16e5-4faf-9d22-66301b6b23bc')
);

do $$
declare
  v_remaining bigint;
  v_total bigint;
  v_dangling bigint;
begin
  select count(*) into v_remaining
  from public.project_product_links
  where (project_id, product_id) in (
    ('50439a12-4982-44a9-9565-5717b522f6fe', '4f4df292-8636-48c5-8bbb-d8cecd9cfbcc'),
    ('a3b40185-0074-41e0-b68a-dcf310fa21f7', '01e4fd0c-16e5-4faf-9d22-66301b6b23bc'),
    ('7f665d68-0a44-4f63-9d5d-66bc65c8d4bf', '01e4fd0c-16e5-4faf-9d22-66301b6b23bc')
  );
  if v_remaining <> 0 then
    raise exception 'delete incomplete: % target rows remain', v_remaining;
  end if;

  select count(*) into v_total from public.project_product_links;
  if v_total <> 19 then
    raise exception 'expected 19 links after the delete, found % — stopping', v_total;
  end if;

  -- Nothing else should be dangling. If this trips, there is a fourth row this
  -- migration was not written for and someone should look at it.
  select count(*) into v_dangling
  from public.project_product_links ppl
  left join public.listings pj on pj.id = ppl.project_id
  left join public.listings pr on pr.id = ppl.product_id
  where pj.id is null or pr.id is null
     or pj.deleted_at is not null or pr.deleted_at is not null;

  if v_dangling <> 0 then
    raise exception 'expected 0 dangling links afterwards, found %', v_dangling;
  end if;

  raise notice 'after: 3 rows deleted, 19 remain, 0 dangling';
end $$;
