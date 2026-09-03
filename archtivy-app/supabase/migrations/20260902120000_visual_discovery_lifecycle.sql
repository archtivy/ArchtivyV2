-- ============================================================================
-- Visual Discovery: durable object vectors + a processed-state lifecycle
--
-- Two problems, both structural.
--
-- ── 1. FROZEN RECOMMENDATIONS ───────────────────────────────────────────────
-- Object-click discovery read `image_regions.match_candidates`, a jsonb list of
-- products computed when the photograph was analysed. That list is correct on
-- the day it is written and wrong forever after: a product published next week
-- can never appear in it, and the only way to refresh it is to send the old
-- project image back through the vision model — paying again to learn nothing
-- new about a photograph that has not changed.
--
-- The durable asset is not the answer, it is the QUESTION: the object's own
-- visual vector. Stored once, it can be run against the product index as it
-- stands at the moment someone clicks, so a new product becomes eligible for
-- every old project the instant its own embedding lands. No vision call, no
-- reprocessing, no staleness.
--
-- Same 1536 dimensions and same space as image_ai.embedding, because the
-- region vector is a query INTO that index. It gets no index of its own: it is
-- never searched, only read by primary key and used as a probe.
--
-- ── 2. NO WAY TO KNOW WHAT HAS BEEN DONE ────────────────────────────────────
-- `image_ai` recorded that a row existed, not whether it was current, what
-- image it described, or whether the attempt had failed. So the pipeline could
-- not tell a new upload from a processed one, could not notice that an image
-- had been REPLACED at the same row id, and could not retry a failure without
-- redoing everything. Every run was therefore either a full re-spend or a
-- guess. The four columns below make the state explicit and let the work be
-- selected precisely.
--
-- Additive only: every column is nullable or defaulted, nothing is dropped,
-- and existing rows keep their values. Legacy rows land on pipeline_version 0,
-- which is exactly right — they hold the synthetic URL-hash vectors and need
-- reprocessing, but as a deliberate backfill rather than as "new work".
-- ============================================================================

-- ── 1. The durable object representation ────────────────────────────────────
alter table public.image_regions
  add column if not exists embedding vector(1536);

comment on column public.image_regions.embedding is
  'Visual signature vector for this detected object. The query probe for live '
  'product retrieval: stored once, run against the current product index on '
  'every click, so newly published products appear without reprocessing.';

comment on column public.image_regions.match_candidates is
  'SUPERSEDED and no longer written. Held a frozen product list computed at '
  'analysis time, which could not include products published later. Retrieval '
  'now runs live from image_regions.embedding. Left in place rather than '
  'dropped so historical rows remain readable.';

-- ── 2. Processed state on image_ai ──────────────────────────────────────────
alter table public.image_ai
  -- WHICH image was analysed. A listing_images row can have its image_url
  -- swapped in place, which leaves the id — and therefore the whole processed
  -- record — pointing at a photograph nobody has ever looked at.
  add column if not exists source_url text,

  -- WHICH pipeline produced it. Bumping this constant in code marks every
  -- older row as outdated without touching a single row here, which is how
  -- the synthetic-vector backfill is selected.
  add column if not exists pipeline_version smallint not null default 0,

  -- Whether the last attempt succeeded. A failure has to be recorded, or a
  -- permanently unreadable image is retried on every single run forever.
  add column if not exists status text not null default 'ok',
  add column if not exists error text,
  add column if not exists attempts smallint not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'image_ai_status_check'
  ) then
    alter table public.image_ai
      add constraint image_ai_status_check check (status in ('ok', 'failed'));
  end if;
end $$;

-- The batch selects failed rows that are still worth retrying. Partial, because
-- the overwhelming majority of rows are 'ok' and never match.
create index if not exists idx_image_ai_retryable
  on public.image_ai (attempts)
  where status = 'failed';

-- Selecting outdated rows for a version backfill.
create index if not exists idx_image_ai_pipeline_version
  on public.image_ai (pipeline_version);

-- ── Verification ────────────────────────────────────────────────────────────
--   select count(*) from image_ai where pipeline_version = 0;   -- 1830 legacy
--   select count(*) from image_regions where embedding is not null;  -- 0 today
--   \d+ public.image_regions
