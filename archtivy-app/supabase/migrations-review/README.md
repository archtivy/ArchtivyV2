# migrations-review/

**Nothing in this directory is applied, and nothing here is on the migration path.**

These are corrected review copies of pending migrations. They live outside
`supabase/migrations/` on purpose: a file in that directory can be picked up by
`supabase db push`, and these must not run until two things are true.

## Blocking pre-conditions

1. **The migration ledger has been read.** `supabase migration list` has not yet
   run successfully — the CLI needs `--linked` (requires `supabase login` or
   `SUPABASE_ACCESS_TOKEN`) or `--db-url` (requires the Postgres password).
   Until the ledger is read we cannot prove these two migrations are unapplied
   from Supabase's point of view. The live DB says the tables do not exist
   (`PGRST205`), which is strong evidence, but it is not the ledger.
2. **Backup/restore posture is confirmed.** Dashboard → Database → Backups:
   frequency, retention, and whether PITR is enabled.

## Contents

| File | Corrects | Verdict |
|---|---|---|
| `20260325_site_settings.CORRECTED.sql` | adds missing RLS | APPLY |
| `20260325_promotion_campaigns.CORRECTED.sql` | replaces broken RLS policies | APPLY WITH CORRECTION |

## How to promote these once unblocked

Do **not** add a new timestamp. Both originals are unapplied drafts, so the
corrected body replaces the original file in place, keeping one file per
migration and one entry per ledger row:

```
cp supabase/migrations-review/20260325_site_settings.CORRECTED.sql \
   supabase/migrations/20260325_site_settings.sql

cp supabase/migrations-review/20260325_promotion_campaigns.CORRECTED.sql \
   supabase/migrations/20260325_promotion_campaigns.sql
```

If the ledger turns out to say either migration **is** already applied, do the
opposite: leave the original untouched and write a new, forward-only migration
containing just the RLS correction. Editing an applied migration desyncs the
ledger permanently.

## Rollback

Both are additive `create table` migrations against tables that do not exist,
and both consuming modules already degrade gracefully when the table is absent.
Rollback is `drop table if exists <name> cascade;` and returns the application
to exactly its current behaviour. See the Phase A report for the per-change
detail, including the one-way gate on `promotion_campaigns` once real Stripe
purchases exist.
