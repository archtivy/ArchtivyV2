-- ============================================================================
-- profiles: a real cover, a real short intro, and two more social columns
--
-- Purely ADDITIVE. Four nullable text columns, no defaults, no backfill, no
-- rename, no drop, no RLS change, no index. Every existing row is untouched
-- and reads NULL on all four, which is exactly what the fallbacks below expect.
-- ============================================================================

alter table public.profiles
  add column if not exists cover_image_url text,
  add column if not exists short_bio       text,
  add column if not exists twitter_url     text,
  add column if not exists pinterest_url   text;


-- ── WHY NO BACKFILL OF short_bio ────────────────────────────────────────────
-- The obvious move is `update profiles set short_bio = bio`, and it is wrong.
-- The band under the cover renders `short_bio ?? bio`, so a NULL short_bio
-- already displays today's text: every one of the 200 live profiles looks
-- byte-identical after this migration. Copying bio across would instead FREEZE
-- a snapshot of it — edit About afterwards and the intro would silently keep
-- the old sentence, which is the exact divergence the two-field split exists to
-- avoid. short_bio becomes non-null only when an owner actually writes one.
--
-- ── WHY NO CHECK CONSTRAINT ON short_bio LENGTH ─────────────────────────────
-- The 300-character limit is enforced where it can be shown: maxLength on the
-- textarea, and .slice(0, 300) in updateProfileAction — the same way that
-- action already sanitises `username` with .slice(0, 50). A CHECK would turn an
-- over-long value into a 23514 error at save time instead of a trimmed string,
-- and the only way to hit it is a bug in our own code, where failing loudly at
-- the database is no more useful than trimming.
--
-- ── WHY cover_image_url IS text, NOT A MEDIA FK ─────────────────────────────
-- There is no `media` table in this database. Covers are text URLs everywhere
-- else — listings.cover_image_url, articles.cover_image_url, folders
-- .cover_image_url — so this follows the existing convention rather than
-- introducing a second one for a single column. Same name as its siblings, so
-- the column means the same thing wherever it appears.
--
-- Rollback, should it ever be needed:
--   alter table public.profiles
--     drop column if exists cover_image_url,
--     drop column if exists short_bio,
--     drop column if exists twitter_url,
--     drop column if exists pinterest_url;
