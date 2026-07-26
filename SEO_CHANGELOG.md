# Archtivy — SEO Changelog

**Date:** 2026-07-26
**Branch:** `explore-strip-fix`
**Status:** implemented and **verified against a local production build** (`next build && next start`). **Not yet deployed.**

Every claim below was measured against a real production build, not inferred from source. Where a fix could not be verified locally (domain-level redirects, Search Console state), it is listed as unverified and the reason is given.

---

## 1. Changes made

### 1.1 `metadataBase` set on the root layout — fixes relative canonicals · C-3
**`archtivy-app/src/app/layout.tsx`**

Added `metadataBase: new URL(getBaseUrl())`.

| | Before | After |
|---|---|---|
| `/` | `<link rel="canonical" href="/"/>` | `<link rel="canonical" href="https://www.archtivy.com"/>` |
| `/projects` | `href="/projects"` | `href="https://www.archtivy.com/projects"` |
| project detail | `href="/projects/residential/…"` | `href="https://www.archtivy.com/projects/residential/…"` |

Also switched the maintenance import to `isMaintenanceMode`.

---

### 1.2 Legacy `/listing/*` converted from soft-404 to 308 / 410 · C-2
**Deleted:** `src/app/(public)/listing/[id]/page.tsx`, `src/app/(public)/listing/[id]/loading.tsx`
**Added:** `src/app/(public)/listing/[id]/route.ts`
**Changed:** `src/app/(public)/listing/page.tsx`

This is the single highest-value change: it reconnects the URLs Google already knows about to the live site.

| Request | Before (live production) | After (verified) |
|---|---|---|
| `/listing/everden-residence` | 200 + empty shell + `noindex` | **308** → `https://www.archtivy.com/projects/residential/single-family-house/everden-residence` |
| `/listing/{unknown}` | 200 + empty shell + `noindex` | **410 Gone** + `X-Robots-Tag: noindex, follow` |
| `/listing` | 200 (soft 404) | **308** → `/projects` |

**Why a Route Handler and not a page.** The first attempt kept it as a page and made the component `async` so `notFound()` would produce a 404. A production build proved that wrong — `/listing/{unknown}` still returned **200**. Once a dynamic page starts streaming, the status is already committed and the not-found boundary cannot change it. That is precisely the original bug. A Route Handler sets the status explicitly, so the contract is exact and testable. **This is why the fix was verified rather than assumed.**

**410 rather than 404** because the V1 content set was replaced wholesale (the legacy slugs return zero rows from `listings`). 410 signals permanent removal, is dropped from the index faster, and cannot be mistaken for a soft 404.

---

### 1.3 Maintenance mode made opt-in and given a correct status code · C-5
**`src/lib/maintenance.ts`, `src/middleware.ts`, `src/app/layout.tsx`, `src/app/(public)/layout.tsx`, `src/app/(public)/page.tsx`**

| | Before | After |
|---|---|---|
| Trigger | `VERCEL_ENV === "production"` — permanently on in production | `MAINTENANCE_MODE` env = `1`/`true` — **off by default** |
| Response | `307` redirect of every URL to `/` | `503` + `Retry-After: 3600` + `X-Robots-Tag: noindex` |
| Homepage robots | `index: true, follow: false` | `follow: false` removed |

Verified both ways: with the variable unset every public page returns 200; with `MAINTENANCE_MODE=1`, `/projects` returns `503` with `retry-after: 3600` and `x-robots-tag: noindex`, while `/`, `/robots.txt` and `/sitemap.xml` stay 200.

A 307 to `/` tells Google every URL on the site is a duplicate of the homepage. A 503 tells it to hold the index and come back.

**Operational note:** middleware env is read at deploy time on Vercel, so toggling `MAINTENANCE_MODE` requires a redeploy. This was equally true of the previous `VERCEL_ENV` approach.

---

### 1.4 `getBaseUrl()` hardened against `.vercel.app` leakage · C-4
**`src/lib/canonical.ts`**

Resolution order is now `NEXT_PUBLIC_SITE_URL` → `DEFAULT_BASE` (when `VERCEL_ENV === "production"`) → `VERCEL_URL` → `localhost`. This activates the previously dead `DEFAULT_BASE` constant. If `NEXT_PUBLIC_SITE_URL` is ever dropped, production can no longer silently publish canonicals, sitemap `<loc>` values and the robots.txt `Sitemap:` line on a throwaway deployment hostname.

---

### 1.5 `/u/id/{uuid}` duplicate profiles resolved · C-7 / P-1
**`src/app/(public)/u/id/[profileId]/page.tsx`**

- Username present → **308 → `/u/{username}`**. Verified: `/u/id/3f0b690d-…` → `308` → `/u/meireles-pavan-arquitetura`.
- No username → **200 + `noindex, follow`** + self-canonical. Verified.

`follow` is deliberate: the 157 username-less stubs still pass link equity to the real project pages that credit them, they just do not enter the index themselves. No robots.txt `Disallow` was added — blocking crawl would stop Google ever seeing the redirect or the noindex.

---

### 1.6 `/explore` removed from the index and the sitemap · C-6
**`src/app/(public)/explore/page.tsx`, `src/app/sitemap.ts`**

`robots: { index: false, follow: true }` and the sitemap entry dropped. The map renders ~184 characters of server-side text and zero crawlable entity links. `/explore/projects`, `/explore/products`, `/explore/designers` and `/explore/brands` are untouched and remain indexable — they do render content and anchors server-side. The `/explore` URL itself is unchanged and still fully reachable.

---

### 1.7 Project title template fixed · C-8
**`src/lib/seo/seo-templates.ts`**

| Before | After |
|---|---|
| `in Canada — Everden Residence \| Archtivy` | `Everden Residence in Canada \| Archtivy` |
| `in Canada — Lawrence Park \| Archtivy` | `Lawrence Park in Canada \| Archtivy` |
| `in Netherlands — BASIL Residential Complex \| Archtivy` | `BASIL Residential Complex in Netherlands \| Archtivy` |

Entity-first, with no dangling dash when category is absent. `buildProductSeoTitle` was already correct and was not touched.

---

### 1.8 Sitemap corrections · C-9, C-6, C-7

Verified from the built `sitemap.xml`:

| Metric | Before (live prod) | After |
|---|---|---|
| Total URLs | 1,115 | **958** |
| `/u/id/{uuid}` entries | **156** | **0** |
| `/explore` (map) | present, priority 0.9 | **absent** |
| Homepage `<loc>` | `https://www.archtivy.com` | `https://www.archtivy.com` — now **byte-identical** to the rendered canonical |
| Entries on a non-canonical host | 0 | 0 |
| Valid XML | yes | yes |

The homepage entry was briefly changed to `${base}/`, then reverted after the build showed Next resolves the `/` canonical to `${base}` with no trailing slash. The sitemap now matches what is actually rendered — a case where verification changed the fix.

---

### 1.9 Public debug routes closed in production · C-11
**`src/app/debug/env/page.tsx`, `src/app/test/layout.tsx` (new), `src/app/test/page.tsx`**

Both return a genuine **404** outside development, plus `noindex` metadata. Verified: `/debug/env` → 404, `/test` → 404. `robots.txt` `Disallow` prevents crawling but not URL-only indexing, so a real 404 was needed. The gate for `/test` lives in a new `layout.tsx` because `page.tsx` is a client component and can neither export metadata nor call `notFound()` before its hooks.

---

### 1.10 Dead search-engine pings removed · C-12 / C-13
**`src/lib/seo/indexnow.ts`, `.env.local.example`**

Removed `pingSitemap()`. Google retired `google.com/ping?sitemap=` in 2023 (it 404s) and Bing deprecated its equivalent in favour of IndexNow. Keeping them created a false impression that Google was being notified on every publish. The working IndexNow submission is retained.

`.env.local.example` now documents `NEXT_PUBLIC_SITE_URL`, `SITEMAP_LASTMOD`, `INDEXNOW_KEY` and `MAINTENANCE_MODE`, with an explicit warning that `MAINTENANCE_MODE` must stay unset in production.

---

### 1.11 Homepage Open Graph completed
**`src/app/(public)/page.tsx`** — re-added `siteName` and `url`. A page-level `openGraph` object fully replaces the root layout's, so the root's `siteName: "Archtivy"` was being silently dropped from the homepage.

---

## 2. Complete list of files changed

**Added (4)**
```
TECHNICAL_SEO_AUDIT.md
SEO_FIX_PLAN.md
SEO_CHANGELOG.md
archtivy-app/src/app/(public)/listing/[id]/route.ts
archtivy-app/src/app/test/layout.tsx
```

**Deleted (2)**
```
archtivy-app/src/app/(public)/listing/[id]/page.tsx     — replaced by route.ts
archtivy-app/src/app/(public)/listing/[id]/loading.tsx  — orphaned by the above
```

**Modified (16)**
```
archtivy-app/.env.local.example
archtivy-app/src/middleware.ts
archtivy-app/src/app/layout.tsx
archtivy-app/src/app/sitemap.ts
archtivy-app/src/app/(public)/layout.tsx
archtivy-app/src/app/(public)/page.tsx
archtivy-app/src/app/(public)/explore/page.tsx
archtivy-app/src/app/(public)/listing/page.tsx
archtivy-app/src/app/(public)/u/id/[profileId]/page.tsx
archtivy-app/src/app/debug/env/page.tsx
archtivy-app/src/app/test/page.tsx
archtivy-app/src/lib/canonical.ts
archtivy-app/src/lib/maintenance.ts
archtivy-app/src/lib/seo/indexnow.ts
archtivy-app/src/lib/seo/seo-templates.ts
```

Net: **+189 / −75** lines across 17 source files. No UI redesign, no listing deleted, no taxonomy change, no public URL changed, no unrelated refactor.

**Not changed, deliberately:** `robots.ts` (already correct — verified live), all `(admin)`/`(app)` noindex layouts (already correct), `jsonld.ts` (schema verified valid live), `u/layout.tsx` ISR override (P-4 — real refactor, out of scope), listing/profile content (editorial).

---

## 3. Verification performed

`next build` → exit 0. `next start` → probed with curl.

**Status codes**
```
/                                                            200
/projects                                                    200
/products                                                    200
/explore                                                     200
/explore/projects  /explore/designers  /explore/brands       200
/projects/residential                                        200
/projects/residential/single-family-house/everden-residence  200
/u/faulkner-architects                                       200
/robots.txt  /sitemap.xml                                    200
/listing                                                     308 → /projects
/listing/everden-residence                                   308 → canonical detail URL
/listing/definitely-not-a-real-slug-xyz                      410
/debug/env  /test                                            404
/nonexistent-page-xyz                                        404
/u/id/{uuid-with-username}                                   308 → /u/{username}
/u/id/{uuid-without-username}                                200 + noindex, follow
```

**Sitemap sweep:** 60 randomly sampled URLs from the newly built `sitemap.xml` → **59 × 200, 0 errors** (one probe truncated by the read loop, not a server error).

**Canonicals:** absolute on every page checked; every sitemap `<loc>` on `https://www.archtivy.com`; homepage `<loc>` byte-identical to the homepage canonical.

**Rendering (project detail):** 4,899 characters of server-rendered visible text, `<h1>` present, 65 unique internal `<a href>` links, JSON-LD types `ArchitecturalStructure`, `PostalAddress`, `GeoCoordinates`, `BreadcrumbList`, `FAQPage`, `Question`, `Answer`, `ListItem`. No JavaScript required for primary content.

**Maintenance mode:** unset → all pages 200. `MAINTENANCE_MODE=1` → `/projects` 503 + `retry-after: 3600` + `x-robots-tag: noindex`; `/`, `/robots.txt`, `/sitemap.xml` remain 200.

**Types:** `tsc --noEmit` clean.

### Not verified locally — and why
- **Non-www → www 308** (C-10): a Vercel domain setting, not code. Currently a 307 in production.
- **Whether Google honours any of this**: requires deployment plus recrawl.
- **Search Console state**: no GSC access. See §5.
- Pre-existing unrelated build warnings (`/api/admin/taxonomy-audit` dynamic-usage notice, missing `promotion_campaigns` table) are untouched by this work.

---

## 4. Post-deployment verification checklist

Run against the **preview URL first**, then production. `$B` = origin under test.

**A. Status codes**
- [ ] `curl -sI $B/` → 200
- [ ] `curl -sI $B/projects` → 200 · `$B/products` → 200
- [ ] `curl -sI $B/projects/residential/single-family-house/everden-residence` → 200
- [ ] `curl -sI $B/u/faulkner-architects` → 200
- [ ] `curl -sI $B/listing/everden-residence` → **308**, `location:` = canonical detail URL
- [ ] `curl -sI $B/listing/definitely-not-a-real-slug-xyz` → **410**
- [ ] `curl -sI $B/listing` → **308** → `/projects`
- [ ] `curl -sI $B/debug/env` → **404** · `$B/test` → **404**
- [ ] No response carries `X-Robots-Tag: noindex` on a page meant to be indexed

**B. Canonicals & robots meta**
- [ ] Every canonical is **absolute** and starts `https://www.archtivy.com`
      `curl -s $B/projects | grep -o '<link rel="canonical"[^>]*>'`
- [ ] No `noindex` on `/`, `/projects`, `/products`, detail pages, `/u/{username}`, `/explore/*` sub-pages
- [ ] `/explore` **does** carry `noindex, follow`
- [ ] `/u/id/{uuid}` with a username → **308**; without → **200 + noindex, follow**

**C. robots.txt & sitemap**
- [ ] `$B/robots.txt` → 200, contains `Allow: /`, `Sitemap: https://www.archtivy.com/sitemap.xml`
- [ ] `$B/sitemap.xml` → 200, `content-type: application/xml`, parses as valid XML
- [ ] ~958 URLs; **zero** `/u/id/`; **no** `/explore` entry
- [ ] Every `<loc>` starts `https://www.archtivy.com` — no `.vercel.app`, no non-www
- [ ] Spot-check 20 sitemap URLs → all 200

**D. Rendered content**
- [ ] `curl -s $B/projects/…/everden-residence` contains `<h1>`, body copy and `<a href>` links **without** executing JS
- [ ] Titles read entity-first (`Everden Residence in Canada | Archtivy`) — **no title beginning with "in "**
- [ ] JSON-LD validates at [validator.schema.org](https://validator.schema.org) and Google's Rich Results Test for one project, one product and one profile URL

**E. Environment**
- [ ] `MAINTENANCE_MODE` is **unset** in Vercel Production (single most important env check)
- [ ] `NEXT_PUBLIC_SITE_URL=https://www.archtivy.com` in Production
- [ ] `curl -sI https://archtivy.com/` → **308** (not 307) → `https://www.archtivy.com/`
- [ ] Preview deployments are not publicly crawlable (Deployment Protection on for Preview)

**F. Search Console (after deploy)**
- [ ] URL Inspection → Live Test on the URLs in §6: "URL is available to Google", user-declared canonical == Google-selected canonical
- [ ] Resubmit `sitemap.xml`; confirm "Success" and ~958 discovered URLs
- [ ] Re-check Coverage at **day 7** and **day 30** — not day 1

---

## 5. Issues requiring Google Search Console access

Full detail in `SEO_FIX_PLAN.md`. Summary, in priority order:

| # | Action | Why |
|---|--------|-----|
| 1 | **Confirm which property is verified** (www / non-www / Domain) | Canonicals are www. A non-www-only property reports against the wrong host and looks empty regardless of real progress. Do this before reading any other GSC data. Prefer a Domain property. |
| 2 | Check **Manual actions** and **Security issues** | Would explain total absence of indexing and is invisible from code. Rule in or out first. |
| 3 | **Submit `https://www.archtivy.com/sitemap.xml`**; record last-read date and errors | Nothing in the codebase proves it was ever submitted, and the ping endpoint it used has been dead since 2023. |
| 4 | Export **Pages → Why pages aren't indexed** | "Soft 404" confirms C-2; "Duplicate without user-selected canonical" confirms C-3/C-7; "Crawled – currently not indexed" confirms P-1. Each points at a different fix. |
| 5 | **URL Inspection → Live Test** on the §6 URLs | The only way to see Google's *chosen* canonical vs. the declared one. |
| 6 | Historical **impressions/clicks for `/listing/*`** | Quantifies what the un-redirected migration cost and identifies legacy URLs worth hand-mapping. |
| 7 | **Crawl stats** (response codes, avg response time) | Confirms the soft-404s were burning crawl budget and whether crawl rate recovers. |
| 8 | Set non-www → www to **308** in Vercel → Domains | C-10. Dashboard-only. Currently 307. |
| 9 | Confirm `NEXT_PUBLIC_SITE_URL` in Vercel Production | Backstopped in code, but should be explicit. |
| 10 | Confirm Deployment Protection: **off** for Production, **on** for Preview | Prevents preview deployments competing for the same content. |

---

## 6. URLs to submit to Google Search Console

Submit **after** deploying, via URL Inspection → Request Indexing. Order matters — hubs before details, so Google re-establishes the site structure first.

**Tier 1 — structure (submit first, all 5)**
```
https://www.archtivy.com/
https://www.archtivy.com/projects
https://www.archtivy.com/products
https://www.archtivy.com/explore/projects
https://www.archtivy.com/explore/products
```

**Tier 2 — taxonomy archives (representative sample)**
```
https://www.archtivy.com/projects/residential
https://www.archtivy.com/projects/residential/single-family-house
https://www.archtivy.com/projects/hospitality
https://www.archtivy.com/products/furniture
https://www.archtivy.com/products/furniture/seating
```

**Tier 3 — entity detail pages (proves the detail template indexes)**
```
https://www.archtivy.com/projects/residential/single-family-house/everden-residence
https://www.archtivy.com/projects/residential/housing-complex/basil-residential-complex
https://www.archtivy.com/projects/commercial/office-building/ernest-young-porto-office
https://www.archtivy.com/products/decor-accessories/decorative-objects/vase/serie-473
https://www.archtivy.com/products/furniture/seating/sofa/dwell-3-seater-fabric-sofa
```

**Tier 4 — profiles (only ones with a username and a bio)**
```
https://www.archtivy.com/u/faulkner-architects
https://www.archtivy.com/u/meireles-pavan-arquitetura
```

**Tier 5 — redirect proof (Inspect, do NOT request indexing)**

Inspect these to confirm Google sees the 308/410 rather than the old soft-404:
```
https://archtivy.com/listing/los-altos-modern-single-story-house/
https://archtivy.com/listing/epicurus-jazz-club/
```
Both are URLs Google currently has indexed. They should now report a redirect or "Not found (410)". **Do not** request indexing on them — the goal is for Google to drop or follow them, not index them.

> GSC allows roughly 10–12 "Request indexing" submissions per property per day. Spread Tiers 1–4 over two days. Bulk discovery comes from the sitemap, not from manual submission — manual requests are for the handful of URLs that prove each template works.

---

## 7. Honest status of each issue class

**Fixed in code and verified against a production build**
C-2 (legacy soft-404 → 308/410), C-3 (relative canonicals), C-4 (base URL fallback), C-5 (maintenance mode), C-6 (`/explore` thin page), C-7 (`/u/id` duplicates), C-8 (title template), C-9 (sitemap/canonical match), C-11 (debug routes), C-12 (dead pings).

**Requires deployment before it means anything**
All of the above. **None of these changes are live.** Production is currently running a build that predates 2026-05-21 (C-1) — the most important item in this entire audit is not a code change but merging `explore-strip-fix` → `main` and deploying it.

**Requires Google Search Console data**
Property-host mismatch, manual actions, actual coverage breakdown, sitemap submission state, historical `/listing/*` performance, crawl stats. Six unknowns that could each change priorities. See §5.

**Requires waiting for Google to recrawl**
Everything user-visible. Realistic timeline: correctness verifiable in minutes; recrawl over days 1–14; coverage movement over weeks 2–8; thin stub profiles legitimately staying out permanently.

**Not fixed — needs human decisions**
- C-10: non-www → www 307 → 308 (Vercel dashboard).
- P-2: duplicate descriptions across 5 product and 4 project listings (editorial).
- P-3: 3 approved listings with `slug IS NULL`, addressed by UUID (data backfill).
- P-1: 171 of 206 profiles have no bio (editorial/outreach).
- Location landing pages and a dedicated `/brands/{slug}` namespace — the largest untapped opportunity, and the reason a technically-perfect site with 163 listings still will not rank quickly. See `SEO_FIX_PLAN.md` Phase 5.
