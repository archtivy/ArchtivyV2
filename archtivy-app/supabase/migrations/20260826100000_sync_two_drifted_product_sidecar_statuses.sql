-- Repair the two product sidecar rows left behind by approveListingAction.
--
-- ── WHAT WENT WRONG ─────────────────────────────────────────────────────────
-- A product is a `listings` row plus a `products` sidecar sharing its id, and
-- both carry a `status`. approveListingAction (admin/_actions/listings.ts) wrote
-- `listings` alone — the sidecar was never in the code path. So every product an
-- admin approved kept its pre-approval `products.status` forever.
--
-- Introduced 2026-02-16 (commit 9581aba) and unchanged since. It is NOT from the
-- embedded-product-tagging series: none of 6241bae, d5bcfa6, a52d77c, 60ba4da,
-- 7d36914 or 0e8c324 touch that file. The series only made it observable, by
-- routing self-serve product publishes through PENDING often enough that someone
-- finally approved one and looked at both tables.
--
-- The code fix ships in the same PR. This repairs the rows written before it.
--
-- ── MEASURED AGAINST PRODUCTION BEFORE WRITING ──────────────────────────────
-- Exactly three product rows disagree across the two tables. They are NOT one
-- population, and only the first two belong to this bug:
--
--   REPAIRED HERE — listings APPROVED, products PENDING, both live:
--     eb8413fd-f27b-4760-954e-e15bc283e270  otoo-chair   approved 2026-08-26
--     9797257a-05c1-45d2-9ae8-59be343b5cee  deneme-rn    approved 2026-08-24
--
--   DELIBERATELY UNTOUCHED — the opposite direction, and soft-deleted:
--     56ae0e32-6386-4c27-9e28-a138c0444345  maeff
--       listings PENDING / products APPROVED, deleted_at 2026-03-02
--
-- maeff cannot have come from approveListingAction, which only ever moves
-- `listings` forward. It is a separate, older bug with its own logged entry, and
-- writing it here would erase evidence of a cause nobody has diagnosed yet.
--
-- ── WHY THIS IS NOT "SYNC ALL MISMATCHES" ───────────────────────────────────
-- A blanket `update products set status = listings.status` would look tidier and
-- would silently swallow maeff — resolving a bug we have not explained, in the
-- direction that happens to be convenient. Two ids, named explicitly, is the
-- honest scope: this migration repairs what this bug caused and nothing else.
--
-- ── DIRECTION OF THE REPAIR ─────────────────────────────────────────────────
-- `listings.status` is authoritative. It is the only status any reader consults
-- (the public product page gates on it via getProductListingBySlugOrId; no code
-- path selects products.status at all), and it is what the admin actually
-- approved. The sidecar is brought up to it, never the reverse.
--
-- Both rows are already publicly visible and correctly so — the admin approved
-- them. This changes no visibility. It makes a dormant column stop lying.
--
-- Idempotent: the update is itself guarded on the mismatch it repairs, so a
-- re-run matches nothing and the assertions still hold.

do $$
declare
  v_drifted bigint;
begin
  select count(*) into v_drifted
  from public.listings l
  join public.products p on p.id = l.id
  where l.id in (
      'eb8413fd-f27b-4760-954e-e15bc283e270',
      '9797257a-05c1-45d2-9ae8-59be343b5cee'
    )
    and l.status = 'APPROVED'
    and p.status = 'PENDING';

  raise notice 'before: % of 2 target rows are APPROVED/PENDING', v_drifted;

  if v_drifted = 0 then
    raise notice 'nothing to do — already applied';
  elsif v_drifted <> 2 then
    -- 2 was measured on 2026-08-26. Anything else means the data moved under us
    -- (a row deleted, re-approved, or repaired by hand) and this should be
    -- re-reviewed rather than run against a state it was not written for.
    raise exception 'expected 2 drifted rows, found % — stopping rather than guessing', v_drifted;
  end if;
end $$;

update public.products p
set status = l.status
from public.listings l
where l.id = p.id
  and p.id in (
    'eb8413fd-f27b-4760-954e-e15bc283e270',
    '9797257a-05c1-45d2-9ae8-59be343b5cee'
  )
  -- Self-guarding: names the exact state being repaired, so a re-run and any
  -- row that has since moved on are both no-ops.
  and l.status = 'APPROVED'
  and p.status = 'PENDING';

do $$
declare
  v_remaining bigint;
  v_maeff_listing text;
  v_maeff_product text;
  v_total_mismatched bigint;
begin
  select count(*) into v_remaining
  from public.listings l
  join public.products p on p.id = l.id
  where l.id in (
      'eb8413fd-f27b-4760-954e-e15bc283e270',
      '9797257a-05c1-45d2-9ae8-59be343b5cee'
    )
    and l.status is distinct from p.status;

  if v_remaining <> 0 then
    raise exception 'repair incomplete: % target rows still disagree', v_remaining;
  end if;

  -- maeff must be exactly as it was. If this migration moved it, something in
  -- the statement above was broader than intended.
  select l.status, p.status into v_maeff_listing, v_maeff_product
  from public.listings l
  join public.products p on p.id = l.id
  where l.id = '56ae0e32-6386-4c27-9e28-a138c0444345';

  if v_maeff_listing is distinct from 'PENDING' or v_maeff_product is distinct from 'APPROVED' then
    raise exception 'maeff was modified (listings=%, products=%) — it must not be touched',
      v_maeff_listing, v_maeff_product;
  end if;

  select count(*) into v_total_mismatched
  from public.listings l
  join public.products p on p.id = l.id
  where l.type = 'product' and l.status is distinct from p.status;

  if v_total_mismatched <> 1 then
    raise exception 'expected exactly 1 remaining mismatch (maeff), found %', v_total_mismatched;
  end if;

  raise notice 'after: 2 rows repaired; 1 mismatch remains and it is maeff, untouched as intended';
end $$;
