-- ============================================================================
-- Purpose: stop future deletes from orphaning the products sidecar.
--
-- `products.id` has always been intended to mirror `listings.id` — the admin
-- create path inserts both with the same value — but there has never been a
-- foreign key enforcing it (verified: pg_constraint returns zero FKs where
-- products is the child). That is the root cause of every orphan: deleteListing()
-- and bulkDeleteListings() remove the listings row and never touch products,
-- and five of the six compensating-delete paths in createAdminProductFull() do
-- the same.
--
-- WHY `not valid` — THIS IS LOAD-BEARING, NOT A SHORTCUT:
--   There are currently 6 orphan products rows with no matching listings row.
--   A plain ADD CONSTRAINT fails outright. Verified against production inside a
--   rolled-back transaction:
--     ERROR 23503: insert or update on table "products" violates foreign key
--     constraint ... Key (id)=(95d13c49-...) is not present in table "listings".
--
--   `not valid` skips the one-time validation scan of existing rows. It does
--   NOT weaken enforcement going forward:
--     - new INSERTs and UPDATEs are fully checked
--     - ON DELETE CASCADE fires normally for every future delete
--   The 6 pre-existing orphans are simply left alone, which is the intent —
--   they belong to the old data set being retired, not to this fix.
-- ============================================================================

alter table public.products
  add constraint products_id_listings_fkey
  foreign key (id) references public.listings(id)
  on delete cascade
  not valid;

comment on constraint products_id_listings_fkey on public.products is
  'products.id mirrors listings.id. ON DELETE CASCADE removes the sidecar with its listing, replacing application-level compensating deletes that were incomplete and orphaned 16 rows. Created NOT VALID because 6 pre-existing orphans predate the constraint; new writes are fully enforced.';

-- ── LATER, ONCE THE OLD DATA IS GONE ────────────────────────────────────────
-- After the legacy listings are deleted and no orphan products rows remain,
-- promote the constraint to fully validated. This scans the table and errors if
-- any orphan is still present, so it doubles as a cleanliness assertion:
--
--   alter table public.products validate constraint products_id_listings_fkey;
--
-- Until then the constraint stays NOT VALID. That is harmless — it only means
-- Postgres has not proven the pre-existing rows conform.
