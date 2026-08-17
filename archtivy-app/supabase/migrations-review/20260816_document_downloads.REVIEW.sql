-- ============================================================================
-- Document download tracking — the ledger behind /me/files
--
-- Review copy. NOT APPLIED.
--
-- ── WHAT ALREADY EXISTS ─────────────────────────────────────────────────────
-- The download CAPABILITY is built and working. Verified live 2026-08-16:
--   listing_documents            60 rows
--   /api/documents/download      401s anonymous, verifies doc belongs to
--                                listing, 302s to a 60-second signed URL
-- What does not exist is any record that a download happened. The route hands
-- out a signed URL and writes nothing, so every download to date was made by
-- an identifiable signed-in user whose identity was never recorded. Nothing is
-- retroactively recoverable — this table starts empty by necessity, not by
-- choice.
--
-- ── WHY NOT STORE THE URL ───────────────────────────────────────────────────
-- Signed URLs expire in 60 seconds (SIGNED_URL_EXPIRES_SEC). A stored link is
-- dead almost immediately, so this table records WHAT was downloaded, never
-- HOW to fetch it. /me/files re-authorises through the same route on every
-- click, which means access is re-checked at click time rather than inherited
-- from a past download.
-- ============================================================================

begin;

create table if not exists public.document_downloads (
  id                  uuid primary key default gen_random_uuid(),

  profile_id          uuid not null references public.profiles(id) on delete cascade,

  -- The document. ON DELETE SET NULL, deliberately NOT cascade: when a brand
  -- removes a spec sheet, the user's history should say "no longer available"
  -- rather than silently losing the row. Hence nullable, and hence the
  -- denormalised columns below.
  listing_document_id uuid references public.listing_documents(id) on delete set null,

  -- The listing the document belonged to. Also SET NULL for the same reason.
  listing_id          uuid references public.listings(id) on delete set null,

  -- Denormalised at download time so a removed document still displays as
  -- something a human recognises. Without these, a deleted document leaves a
  -- row that can only render as a blank line.
  file_name           text,
  listing_title       text,

  downloaded_at       timestamptz not null default now()
);

-- The /me/files query: this profile's downloads, newest first.
create index if not exists document_downloads_profile_idx
  on public.document_downloads (profile_id, downloaded_at desc);

-- For "who downloaded this?" from the owning brand's side, later.
create index if not exists document_downloads_document_idx
  on public.document_downloads (listing_document_id);

-- Re-downloading the same file is a real event worth recording (it is how you
-- tell a returning user from a one-off), so there is deliberately NO unique
-- constraint on (profile_id, listing_document_id). /me/files collapses repeats
-- at read time and shows the most recent instead.

comment on table public.document_downloads is
  'One row per download through /api/documents/download. Records what was downloaded, never a URL — signed URLs expire in 60s and /me/files re-authorises on each click.';
comment on column public.document_downloads.file_name is
  'Denormalised at download time so history stays readable after a document is deleted.';

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- A download history is personal. Enabled with NO permissive policy: every
-- read path goes through the service-role client in a route that has already
-- resolved the signed-in profile, so the anon key must see nothing at all.
alter table public.document_downloads enable row level security;

commit;

-- ── Verification ────────────────────────────────────────────────────────────
--   select count(*) from public.document_downloads;          -- expect 0
--
--   -- FK behaviour on document removal: the row survives, readable.
--   -- (run against a scratch row, not real data)
--   --   insert ... ; delete from listing_documents where id = ...;
--   --   select file_name, listing_document_id from document_downloads ...;
--   --        -- expect file_name intact, listing_document_id null
--
--   -- anon must see nothing:
--   --   set role anon; select * from public.document_downloads;  -- expect 0 rows
