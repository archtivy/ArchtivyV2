# 20260808_view_tracking — WITHDRAWN, not applied

**Premise was wrong.** The migration created `increment_listing_views(p_listing_id uuid)`
on the belief that no such function existed. It does exist, as
**`increment_listing_views(listing_id uuid)`** — a different parameter name.

Postgres resolves named RPC arguments exactly, so `supabase.rpc("increment_listing_views",
{ p_listing_id })` returns PGRST202 "could not find the function" — indistinguishable, from
the client, from the function being absent. That is what I misread.

`supabase db push` caught it:

```
ERROR: cannot change name of input parameter "listing_id" (SQLSTATE 42P13)
```

`create or replace function` cannot rename a parameter — which is Postgres protecting existing
callers, and here it protected us from shipping a second definition of a working function.

## What was done instead

One line in `src/app/api/track-view/route.ts`: `p_listing_id` → `listing_id`. No migration.

## Confirmed behaviour of the existing function

Called with the correct argument name against production:

- `listings.views_count` incremented 2 → 3 ✓
- `listing_views` stayed at **0 rows** — the existing function does **not** write view history

## Still open

`listing_views` exists (id, listing_id, clerk_user_id, anon_id, viewed_on, created_at) and has
never been written to by anything. Only the denormalised counter is maintained.

Adding history means dropping and recreating the function — `create or replace` cannot change
the signature, and the parameter name is load-bearing for the caller. That is a deliberate
change to a working function, not a bug fix, so it is left for a decision rather than folded
into this work. Without it there is no per-day or per-user view data, which the Dashboard's
"Top Performing Projects" panel would eventually want.
