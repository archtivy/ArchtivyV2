# Data Integrity Log

Schema- and data-level defects found while building features, kept here so they are not lost
in conversation history. **Distinct from `D7_CLEANUP_FOLLOWUPS.md`**, which tracks taxonomy
structure; this file tracks rows, columns and constraints that are wrong or missing, plus code
that a data or routing change has stranded.

Each item records how it was found, what it silently breaks, and whether resolving it is a
code change or a data decision. Nothing here is scheduled — logging is not triage.

---

## Open

### 1. `project_material_links` has no foreign keys

**Found:** while building the Projects Index filter rail.

**What breaks:** PostgREST cannot embed across a relationship it cannot see. The natural query

```ts
.from("project_material_links").select("project_id, materials:material_id(name)")
```

returns rows where the embedded `materials` object is simply **absent** — and returns
**no error**. The Materials filter therefore silently produced zero values and disappeared
from the rail, with nothing in the logs to indicate why.

**Current state:** worked around, not fixed. `lib/db/projectsDirectory.ts` and
`lib/db/explore.ts` both do an explicit two-step lookup (`materials` by id, then
`project_material_links` by `material_id`) instead of an embed.

**Resolution:** add the FKs to `material_id` and `project_id`. Code change plus a migration.
Check for orphan rows first — the same `NOT VALID` / orphan problem that is currently blocking
`VALIDATE CONSTRAINT products_id_listings_fkey` (see `D7_CLEANUP_FOLLOWUPS.md`) may apply.

**Wider risk:** any other PostgREST embed in the codebase that crosses a missing FK fails the
same silent way. Worth an audit of `.select()` calls using embed syntax.

---

### 2. `Faulkner Architects` is duplicated, and the wrong row is the live one

**Found:** 2026-08-04, while measuring designer records for `/designers`.

| Row | `deleted_at` | Location | Avatar | Approved projects owned |
|---|---|---|---|---|
| `faulkner-architects` | **set** (2026-02-10) | — | no | **7** |
| `faulkner-architect` | null | Truckee, United States | yes | **0** |

The soft-deleted row owns all the real work; the surviving row carries all the real profile
detail. Neither is correct on its own.

**What it looks like today:** `/designers` correctly excludes deleted rows, so Faulkner appears
as a designer with **zero projects and no card image**, while 7 approved projects continue to
credit the name. Before the `deleted_at` fix below, *both* rows were listed — the same studio
twice.

**Resolution: data decision, not a code fix.** Someone has to choose which id survives, then
re-point `listings.owner_profile_id` (and any `listing_team_members.profile_id`) from the
retired id to it before deleting. Deliberately left alone pending that decision.

**Related:** worth checking whether other `display_name` collisions exist across roles — only
designer-vs-designer was measured.

---

### 3. Profile-directory cluster is stranded — delete in a separate pass

**Found:** 2026-08-04, on redirecting `/explore/brands` to `/brands`.

`/explore/designers` and `/explore/brands` were the only two callers. Both are now
`permanentRedirect` stubs, so nothing in the app reaches this code. Verified by grep: the only
remaining occurrences are the definitions themselves and explanatory comments.

| File | Status |
|---|---|
| `lib/db/profileDirectory.ts` — `getProfileDirectoryByRole` + `…Cached` | 0 callers |
| `components/explore/directory/ProfileDirectoryClient.tsx` | 0 callers |
| `components/explore/directory/ProfileDirectoryCard.tsx` | 0 external callers (only the client above) |

The whole `components/explore/directory/` directory goes with it — `ProfileDirectoryCard` has
no other consumer.

**Deliberately not deleted yet.** Removing it in the same change as the routing swap would have
mixed a behaviour change with a code removal, making the routing change harder to review or
revert on its own.

**Two things to check before deleting:**

1. The `deleted_at` fix recorded under *Resolved* below lives in `profileDirectory.ts`. If that
   file is deleted, confirm nothing else has since started importing it — the fix is only
   valuable while the fetcher is in use.
2. `ProfileDirectoryItem` is exported from `profileDirectory.ts` and may be imported as a type
   elsewhere independently of the fetcher.

**Not an issue — checked:** the `revalidatePath` calls in `app/actions/profile.ts` and
`admin/_actions/profiles.ts` were repointed from `/explore/designers` and `/explore/brands` to
the new routes. Both files also call `revalidateTag(CACHE_TAGS.profiles)`, which is exactly the
tag on `getDesignersDirectory` and `getBrandsDirectory`, so admin profile edits already bust
both directories. No change needed; recorded so it is not re-investigated.

---

### 4. Content types disagree on whether submissions are reviewed

**Found:** 2026-08-06, while investigating the moderation convention for the Magazine.

The `listings.status` column has an `APPROVED` / `PENDING` vocabulary and the admin UI has an
approve button, so the platform *looks* moderated. It is not. **No user-facing create path
ever produces a `PENDING` row:**

| Path | Inserts |
|---|---|
| `app/actions/createProject.ts` | `status: "APPROVED"` |
| `lib/db/listings.ts` → `createListing` | `LISTING_STATUS_APPROVED` |
| `admin/_actions/listings.ts` → `createAdminProjectFull` / `createAdminProductFull` | `"APPROVED"` |

Live counts confirm it: **75 project/APPROVED, 88 product/APPROVED, 1 product/PENDING** — and
the single pending row is admin-created. There is also no Verification Queue surface; approval
exists only as a per-item button on `/admin/projects/[id]` and `/admin/products/[id]`.

**As of the Magazine build, articles are the only reviewed content type.** They go
`draft → pending_review → published`, and only a moderator can publish. This was a deliberate
product decision (2026-08-06), taken knowing it makes articles *stricter* than projects and
products rather than consistent with them — the opposite of what the Magazine brief assumed
when it said "don't make articles the one content type with a lower quality bar."

**The open question is for projects and products, not articles:** should they be gated too? If
yes, it needs a decision on the 163 already-approved rows and a change to three create paths.
`/admin/magazine` was built generic enough in shape to widen rather than duplicate.

**Not a bug, so not "resolved" — a deliberate asymmetry that should be revisited on purpose
rather than discovered later.**

---

### 5. `createAuditLog` wrote to a table that never existed

**Found:** 2026-08-07, investigating the Dashboard's Activity Feed data source.
**Fix prepared:** 2026-08-08 — `migrations-review/20260808_audit_logs.REVIEW.sql` **plus** a
code fix, both listed under *Resolved* below once the migration is applied.

`lib/db/audit.ts` inserted into `public.audit_logs`, which does not exist, and **discarded the
result** — `await sup.from(...).insert(...)` with no error check. Confirmed by a live probe:
`PGRST205: Could not find the table 'public.audit_logs' in the schema cache`.

**16 call sites** across admin actions — listing approve, delete, bulk delete, create, update,
user role change, disable, delete — every one of which has recorded nothing since the module
was written. This is unrecoverable data loss: the actions happened, the history did not.

**The lesson is the discarded result, not the missing table.** A missing table is a five-minute
migration; an unchecked write is what let it go unnoticed indefinitely. Every Supabase write in
this codebase that ignores `{ error }` has the same failure mode — worth a sweep.

---

### 6. Saves were written to a table that does not exist — RESOLVED IN CODE

**Found:** 2026-08-08, while verifying that view/save counters would populate.
**Decision:** 2026-08-08 — repoint the code at `listing_saves`. **Do not create the missing
tables** (Database Bible, Single Source of Truth: one save table, not three).
**Applied:** 2026-08-08, code only — no migration needed, which is the point of the decision.

The save infrastructure was split across three names, and the code used the two that were
never created:

| Referenced by | Table | Existed? |
|---|---|---|
| `lib/db/userSaves.ts` — `addSave`/`removeSave`, the real write path | `user_saves` | **NO** |
| `lib/db/userStats.ts` — profile totals and per-listing counts | `saved_listings` | **NO** |
| `api/admin/dashboard/route.ts` — admin total-saves tile | `user_saves` | **NO** |
| nothing at all | `listing_saves` | yes, 0 rows |

So **saving a listing failed for every user**, and every save count read a missing table —
`SaveToggle` appears on every card across five directory pages and cannot have worked.

**Why `listing_saves` won.** Its columns are byte-for-byte what the code was already sending,
verified against production:

```
id             uuid  pk
listing_id     uuid  not null, FK -> listings.id
clerk_user_id  text  not null
created_at     timestamptz not null
unique (listing_id, clerk_user_id)
```

The FK and the unique index already exist. Creating `user_saves` would have meant a new table
with no FK, no constraint, and a second answer to "what has this user saved" — the failure this
log's item 1 already documents in another form.

**Changed:**
- `userSaves.ts` → `listing_saves`; 23505 on double-save is now treated as a no-op rather than
  surfaced as "duplicate key"; the read error is logged instead of silently returning `[]`.
- `userStats.ts` → `listing_saves` in both the profile total and the per-listing counts; the
  discarded `{ error }` in `getLiveSaveCountsByListingIds` is now checked.
- `api/admin/dashboard/route.ts` → `listing_saves`.

**Not verified end to end:** saving requires a signed-in Clerk session, so the write path was
confirmed by direct insert against `listing_saves` (accepted, unique constraint enforced,
test row removed) rather than by clicking Save in a browser.

**Two save mechanisms, and that is deliberate.** Decided 2026-08-08 — not an open item, and
**not a consolidation candidate**. `listing_saves` (flat quick-save) and `folders` /
`folder_items` (named boards) are two intentionally distinct behaviours, the Pinterest split
between a one-tap save and organising into a board. A future reader finding both should leave
them alone.

This does **not** contradict Single Source of Truth, which is what retired `user_saves` and
`saved_listings` above: those were three names for *one* concept. These are two names for *two*
concepts. The test is whether the same fact is recorded twice, not whether two tables both
mention saving.

The one thing worth watching: a listing can be in `listing_saves` and in a folder at the same
time, so "how many people saved this?" has two possible readings. Any count surfaced in the UI
should say which one it means — today `userStats` and the admin dashboard both count
`listing_saves` only.

---

### 7. Duplicate product, one copy unreachable

**Found:** 2026-08-10, while regression-testing product detail after the hotspot work.

Two APPROVED products share the title **Nena Armchair**:

| slug | `listing_taxonomy_node` | Reachable |
|---|---|---|
| `nena-armchair` (`c7416757`) | **none** | **`/products/nena-armchair` → 404** |
| `nena-armchair-2` (`4aedfb7f`) | 1 row, `is_primary` | 200 |

The detail route builds its canonical path from the primary taxonomy node, so an unclassified
listing cannot resolve and 404s. The Products index only links the classified copy, so nothing
in the UI points at the broken one — but it is APPROVED, so it is counted in the 76-product
totals shown across the platform while being impossible to open.

**Not caused by the hotspot work** — the 404 happens in the route's canonical resolution, before
`productDetail.ts` runs. Confirmed by other product pages returning 200 through the same code.

**Same class as item 2 (Faulkner Architects):** a duplicate entity where the surviving-by-URL
copy and the data-carrying copy are different rows. Needs a merge decision, not a code fix —
either classify `nena-armchair` or retire it in favour of `nena-armchair-2`.

**Worth a sweep:** this was found by accident on one product. How many other APPROVED listings
have no `listing_taxonomy_node` row and are therefore counted-but-unreachable is unknown —
126 of 163 listings are classified, so up to 37 may be in this state.

---

### 9. The old profile layout is stranded — delete in a separate pass

**Found:** 2026-08-18, unifying `/u/[username]` and `/u/id/[profileId]` onto one component.

The two routes were two ~420-line implementations of the same page. Because only 41 of 199
profiles have a username, the id route was **not** a fallback — it served the majority of
profiles with a different layout. Both now render `components/profile/ProfilePageView`.

That leaves four modules with **zero consumers**:

| File | Status |
|---|---|
| `components/profile/ProfileHero.tsx` | 0 consumers |
| `components/profile/ProfileSidebar.tsx` | 0 consumers |
| `components/profile/ProfileMobilePanel.tsx` | 0 consumers |
| `lib/profileCardData.ts` | 0 consumers |

**Deliberately not deleted in the same change**, for the reason already recorded under item 3:
removing code in the commit that changes behaviour makes the behaviour change harder to review
or revert on its own.

**Why this one matters more than usual:** on 2026-08-18 a document-download bug was "fixed" in
five components that turned out to be off the render path entirely, and the real defect sat
untouched in the component the page actually used. Dead UI code that still looks live is what
made that possible. These four should go before someone edits one expecting it to render.

**Before deleting, check:** `ProfileSidebar` and `ProfileMobilePanel` both import `FollowButton`
and `ProfileContactButton`, which ARE still live via `ProfilePageView` — delete the panels, not
their dependencies.

---

## Separate notes

- **`STATUS_PAGE_TRUST_ISSUE.md`** — `/status` reports all six services "operational" from a
  hardcoded array with zero health checks. A product-surface honesty issue rather than a data
  defect, so it has its own note.

---

## Resolved

### `getProfileDirectoryByRole` never filtered `deleted_at`

**Found:** 2026-08-04, same measurement pass. **Fixed:** 2026-08-04, one predicate in
`lib/db/profileDirectory.ts`.

Soft-deleted profiles were listed publicly on both directories that use this fetcher:

| Route | Before | After | Rows removed |
|---|---|---|---|
| `/explore/designers` | 27 | 24 | `faulkner-architects`, `mustafaltindal`, `hidesign` |
| `/explore/brands` | 18 | 17 | `dogru-joe` |

`/explore/designers` has since been replaced by `/designers`, whose own data layer
(`lib/db/designersDirectory.ts`) excludes deleted rows independently. The fix still matters for
`/explore/brands`, which continues to use this fetcher.

**Lesson worth carrying:** `is_hidden` and `deleted_at` are separate concepts here and both
have to be checked. Any new query against `profiles` intended for public display needs
`is_hidden = false`, `deleted_at IS NULL` **and** `username IS NOT NULL` — the last because a
row without a username has no public URL.

---

### `getPlatformTotals` counted unreachable profiles

**Found / fixed:** 2026-08-04.

Designer and brand totals counted `is_hidden = false` alone, reporting **153 designers** and
**48 brands** across the homepage and every directory header. 126 of those designer rows are
auto-created credit stubs from `listing_team_members` with no username, no location and no bio,
reachable only at the deliberately-`noindex` `/u/id/{uuid}`. Corrected to public counts —
**24 designers, 17 brands** — and the cache key bumped to `v2` so the old figures did not
survive in `.next/cache`.
