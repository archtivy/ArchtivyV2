-- ============================================================================
-- listing_views: remove the permissive client INSERT policy
--
-- ── WHAT WAS WRONG ──────────────────────────────────────────────────────────
-- The table carried exactly one policy:
--
--   anon_insert_listing_views | INSERT | {anon, authenticated} | WITH CHECK (true)
--
-- `WITH CHECK (true)` means any caller holding the publishable anon key — which
-- every browser on the site has, by design — could insert a listing_views row
-- naming ANY clerk_user_id. Verified against production before this migration:
--
--   READ   another user's history  -> blocked (no SELECT policy)
--   DELETE another user's history  -> no-op  (no DELETE policy)
--   UPDATE another user's history  -> no-op  (no UPDATE policy)
--   INSERT rows as another user    -> ACCEPTED, 1 row -> 4 rows
--
-- While the table was empty and unread this was inert. It stops being inert the
-- moment personalization reads it: forged rows become someone else's inferred
-- interests, which steer their home feed and their notifications. That is the
-- "a signed-in user must not be able to manipulate another user's private
-- viewing history" rule, and it was violable.
--
-- ── THE FIX ─────────────────────────────────────────────────────────────────
-- Drop the policy and add nothing. RLS stays enabled with NO policies, so a
-- client can neither read, insert, update nor delete — the same shape already
-- used for document_downloads. Writes continue to work because the only writer
-- is /api/track-view, which runs on the service role and bypasses RLS after
-- taking the user id from the Clerk session rather than from the request body.
--
-- No client-side writer exists: listing_views is referenced in exactly one
-- write path in the codebase, and it is that route.
--
-- ── REVERSIBLE ──────────────────────────────────────────────────────────────
--   create policy "anon_insert_listing_views" on public.listing_views
--     for insert to anon, authenticated with check (true);
-- (Restoring it would reopen the forgery, so this is recorded for completeness
-- rather than recommended.)
-- ============================================================================

drop policy if exists "anon_insert_listing_views" on public.listing_views;

-- Belt and braces: the table must never be readable by a client.
alter table public.listing_views enable row level security;

comment on table public.listing_views is
  'Per-viewer listing history, used only by the personalization layer. RLS is '
  'enabled with NO policies: clients can neither read nor write it. The sole '
  'writer is /api/track-view via the service role, which takes the user id '
  'from the Clerk session. Signed-out visitors are not recorded.';

-- ── Verification ────────────────────────────────────────────────────────────
--   select count(*) from pg_policies where tablename = 'listing_views';  -- 0
