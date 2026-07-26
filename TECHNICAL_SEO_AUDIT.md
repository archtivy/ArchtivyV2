# Archtivy — Technical SEO & Indexability Audit

**Date:** 2026-07-26
**Auditor:** Technical SEO Architect (code + live-production audit)
**Repository:** `ArchtivyV2` — branch `explore-strip-fix` @ `d4012dd`
**Production origin audited:** `https://www.archtivy.com`
**Method:** full source read of `archtivy-app/src/app`, `src/lib/seo`, `src/lib/canonical.ts`, `src/middleware.ts`, plus live HTTP probing with a Googlebot user-agent, live sitemap parsing (1,115 URLs), a 70-URL sampled status sweep, and direct Supabase data-quality queries (164 listings / 206 profiles).

---

## 0. Executive summary

Archtivy is **not** suffering from one bug. It is suffering from four independent failures that compound:

| # | Failure | What it does |
|---|---------|--------------|
| **A** | The SEO code in this repo **has never been deployed**. Production runs a build that predates commit `03cddb4` (2026-05-21). `origin/main` is stale at 2026-03-02. No pushed branch matches production. | Every SEO fix written in the last 5 months is invisible to Google. |
| **B** | The **entire legacy indexed corpus** (`archtivy.com/listing/{slug}/`) was destroyed without redirects, and now returns **HTTP 200 with an empty shell + `<meta name="robots" content="noindex">`** — a textbook soft-404. | Google's whole known inventory for this domain became "noindex 200". This is the single most likely reason indexing collapsed and did not recover. |
| **C** | `metadataBase` is **not set**, so every `alternates.canonical` renders as a **relative URL** (`<link rel="canonical" href="/projects">`). | Canonicalisation is effectively disabled: every host/param variant self-canonicalises. |
| **D** | An unreleased **production maintenance mode** on this branch 307-redirects *every* URL except `/` to the homepage the moment it ships. | Would take the site from "poorly indexed" to "fully de-indexed" on the next deploy. |

Nothing here is fixed by "waiting for Google". A, B and D must be fixed and deployed before recrawl has any chance of helping.

**Good news, confirmed by live probing:** the public pages that *do* exist are technically sound — HTTP 200, unique `<title>`, unique meta description, `<h1>`, meaningful server-rendered text, valid JSON-LD (`ArchitecturalStructure` / `Product` / `BreadcrumbList` / `FAQPage` / `Person`), and crawlable `<a href>` internal links from hub → category → detail. A 70-URL sample from the live sitemap returned **69× 200, 0 errors** (one URL timed out on the probe, not a server error). The foundation is fine; the plumbing around it is broken.

---

## 1. Confirmed problems

### C-1 — Production is running stale code; all SEO work is undeployed
**Severity: CRITICAL** · **Area: Deployment / environment**

**Files:** `archtivy-app/src/app/(public)/u/id/[profileId]/page.tsx`, `archtivy-app/src/app/sitemap.ts` (fixed in `03cddb4`, not live), git branch state.

**Evidence:**
- `git log origin/main -1` → `c065628`, **2026-03-02**. `origin/main` still has the pre-taxonomy route `(public)/projects/[slug]/page.tsx`.
- Production serves taxonomy URLs (`/projects/residential/single-family-house/everden-residence`), which only exist on `explore-strip-fix` → **production is not deployed from `main`**.
- Production `/u/id/{uuid}` emits `<meta name="robots" content="noindex, follow">` for unclaimed profiles. That code block was **deleted** in `03cddb4` → **production predates 2026-05-21**.
- Production `sitemap.xml` contains **156 `/u/id/{uuid}` URLs**; the current `sitemap.ts` filters them out entirely → same conclusion.
- No remote branch (`detail-redesign-v2`, `explore-v2-redesign`, `feature/homepage-polish`, `recover-snapshot`, `main`) matches production's behaviour. Production was deployed from an unpushed local working state.

**Impact:** 20+ commits of SEO work (taxonomy routing, canonical resolver, sitemap `/u/id` exclusion, per-node SEO fields, IndexNow) are not in production. Any fix made today is inert until this is resolved.

**Recommended fix:** Establish `main` = production. Merge `explore-strip-fix` → `main`, push, and deploy `main` from Vercel Git integration (not local `vercel --prod`).
**Risk of fix:** Medium — 20+ commits land at once. Mitigate with a preview deployment + the verification checklist in `SEO_FIX_PLAN.md` before promoting.

---

### C-2 — Legacy `/listing/{slug}` URLs return 200 + noindex (soft-404), destroying the entire pre-existing index
**Severity: CRITICAL** · **Area: Crawlability / indexability / HTTP status**

**File:** `archtivy-app/src/app/(public)/listing/[id]/page.tsx`, `archtivy-app/src/app/(public)/listing/page.tsx`

**Evidence:**
- Google's index for this domain is on the **old** URL shape. `site:archtivy.com` surfaces:
  - `https://archtivy.com/listing/los-altos-modern-single-story-house/`
  - `https://archtivy.com/listing/epicurus-jazz-club/`
- Live probe of `https://www.archtivy.com/listing/los-altos-modern-single-story-house`:
  ```
  HTTP/2 200
  x-matched-path: /listing/[id]
  <title>Archtivy</title>
  <meta name="robots" content="noindex"/>
  (no <h1>, 78,864 bytes of marketing shell only)
  ```
  → **200, not 404.** A page returning 200 with no content and a `noindex` directive is the definition of a soft-404.
- Source: the route is a 6-line stub calling `notFound()` from a **synchronous** component; present since the initial V2 commit (`7b92eb2`, 2026-02-11).
- The legacy slugs no longer exist in the database (Supabase lookup for `los-altos-modern-single-story-house` and `epicurus-jazz-club` → 0 rows). The V2 content set is entirely different (164 listings).

**Impact:** Every URL Google knew about became a 200-with-noindex. Google dropped the pages, kept re-crawling them, and had no redirect to follow to the new `/projects/*` and `/products/*` URLs. Link equity and crawl history were discarded, not migrated.

**Recommended fix:** Replace the stub with a real resolver: look the trailing slug up in `listings`; on a hit `permanentRedirect()` (308) to the canonical `/projects/...` or `/products/...` URL; on a miss return a genuine 404. Verify the status code from a production build, not from source.
**Risk of fix:** Low. Adds one indexed DB lookup on a dead route. No behaviour change for live URLs.

---

### C-3 — `metadataBase` is unset → every canonical tag is a relative URL
**Severity: CRITICAL** · **Area: Indexability / metadata**

**File:** `archtivy-app/src/app/layout.tsx` (root `metadata` export has no `metadataBase`)

**Evidence (live HTML):**
```
/                → <link rel="canonical" href="/"/>
/projects        → <link rel="canonical" href="/projects"/>
/projects/residential/single-family-house/everden-residence
                 → <link rel="canonical" href="/projects/residential/single-family-house/everden-residence"/>
```
vs. `/u/faulkner-architects`, which builds its canonical with `getAbsoluteUrl()` and correctly emits
`<link rel="canonical" href="https://www.archtivy.com/u/faulkner-architects"/>`.

**Impact:** A relative canonical resolves against the *requested* URL. Every variant — `archtivy.com` vs `www.archtivy.com`, any `?utm_*`/`?ref=` parameter, any `.vercel.app` preview host that leaks — becomes self-canonical. Canonicalisation is doing nothing. This also makes preview deployments compete with production if they are ever crawled.

**Recommended fix:** Set `metadataBase: new URL(getBaseUrl())` in the root layout. This is Next.js's intended mechanism and converts every relative `alternates.canonical` and OG image path to absolute in one change.
**Risk of fix:** Very low.

---

### C-4 — `getBaseUrl()` can silently fall back to the ephemeral Vercel deployment host
**Severity: CRITICAL (latent)** · **Area: Deployment / canonicals / sitemap**

**File:** `archtivy-app/src/lib/canonical.ts:9-22`

**Evidence:** resolution order is `NEXT_PUBLIC_SITE_URL` → `VERCEL_URL` → `localhost:3000`. The constant `DEFAULT_BASE = "https://www.archtivy.com"` (line 1) is **declared but never referenced** — dead code. On Vercel, `VERCEL_URL` is the *deployment-specific* host (`archtivy-v2-abc123-team.vercel.app`), never the production alias.

Production currently works only because `NEXT_PUBLIC_SITE_URL` happens to be set (the live sitemap emits `https://www.archtivy.com/...`). If that variable is ever dropped, renamed, or missing on a redeploy, **every canonical, every sitemap `<loc>`, and the `Sitemap:` line in robots.txt silently switch to a throwaway `.vercel.app` hostname**, with no build error.

**Recommended fix:** Use `DEFAULT_BASE` as the production fallback ahead of `VERCEL_URL`, keyed on `VERCEL_ENV === "production"`.
**Risk of fix:** Very low; strictly narrows the failure mode.

---

### C-5 — Unreleased production maintenance mode would de-index the entire site on next deploy
**Severity: CRITICAL (blocking)** · **Area: Middleware / crawlability**

**Files:** `archtivy-app/src/lib/maintenance.ts`, `archtivy-app/src/middleware.ts:19-28`, `archtivy-app/src/app/(public)/page.tsx:42-45`

**Evidence:**
- `isProductionMaintenance()` returns `true` whenever `VERCEL_ENV === "production"` — i.e. it is **unconditionally on in production**, with no way to turn it off short of a code change.
- `middleware.ts` 307-redirects every path to `/` except `/`, `/api*`, `/_next*`, `/og*`, `/logo*`, `/favicon.ico`, `/robots.txt`, `/sitemap.xml`.
- The maintenance homepage sets `robots: { index: true, follow: false }` — `nofollow` on the only reachable page.
- This is commit `d4012dd`, the **HEAD of the branch that also carries every SEO fix**. Deploying the SEO fixes as-is deploys this too.

**Impact if deployed:** All 163 listing pages, 48 profile pages, all taxonomy archives and all marketing pages become 307 redirects to the homepage. `sitemap.xml` continues to advertise 1,115 URLs that all redirect to `/`. Google interprets this as mass consolidation into the homepage and de-indexes everything. `follow: false` prevents any remaining crawl.

**Recommended fix:** Make maintenance an explicit opt-in env flag (`MAINTENANCE_MODE=1`) that is **off** by default; when it *is* on, respond `503 Service Unavailable` + `Retry-After` + `X-Robots-Tag: noindex` instead of a 307 to `/`, and drop `follow: false`. A 503 is the only correct status for planned downtime — Google holds the index rather than dropping it.
**Risk of fix:** Low. Default-off is the safe direction; the capability is preserved behind a flag.

---

### C-6 — `/explore` is a 184-character JavaScript-only page listed in the sitemap at priority 0.9
**Severity: HIGH** · **Area: Rendering / thin content / sitemap quality**

**Files:** `archtivy-app/src/app/(public)/explore/page.tsx`, `archtivy-app/src/app/sitemap.ts:30`

**Evidence (live):** server-rendered visible text for `https://www.archtivy.com/explore` is **184 characters** total, with **0** internal `/projects/`, `/products/` or `/u/` links in the initial HTML. All content is a Mapbox canvas rendered client-side. Compare `/explore/projects` (2,000+ chars, dozens of anchors).

**Impact:** A top-priority sitemap entry with no indexable content is a soft-404 candidate and degrades the perceived quality of the whole sitemap.

**Recommended fix:** Mark `/explore` `noindex, follow` (it is a tool, not a document) and remove it from the sitemap. `/explore/projects`, `/explore/products`, `/explore/designers`, `/explore/brands` stay indexable — they *do* render content and links server-side.
**Risk of fix:** Low and fully reversible (two lines). It removes a URL from the sitemap but does not change or remove the URL itself.

---

### C-7 — `/u/id/{uuid}` duplicates `/u/{username}` with a self-referencing canonical
**Severity: HIGH** · **Area: Duplicate content / canonicals / thin content**

**File:** `archtivy-app/src/app/(public)/u/id/[profileId]/page.tsx:79-93`

**Evidence:**
- Live: `https://www.archtivy.com/u/id/c33a1559-…` → `200`, `<title>Ilya Ivanov</title>`, `<link rel="canonical" href="https://www.archtivy.com/u/id/c33a1559-…"/>` — canonical points at itself, not at the username URL.
- The **live sitemap contains 156 `/u/id/{uuid}` URLs** (of 204 profile URLs), and those same pages currently emit `noindex`. The sitemap is actively advertising 156 noindex URLs.
- Supabase: **206 profiles total; only 49 have a username; 157 have neither username nor bio.** Those 157 are auto-created "credited in a project" stubs — live text content measured at ~1,700 chars, of which the large majority is shared nav/footer boilerplate.

**Impact:** For the 49 profiles that *do* have a username, `/u/id/{uuid}` is a straight duplicate with the wrong canonical. For the other 157 it is an auto-generated thin page.

**Recommended fix:** 308-redirect `/u/id/{uuid}` → `/u/{username}` whenever a username exists; for username-less stubs keep the page reachable but `noindex, follow` (preserves the outbound credit links to real projects without adding thin pages to the index). Do **not** add a robots.txt `Disallow` — that would prevent Google from ever seeing the redirect or the noindex.
**Risk of fix:** Low.

---

### C-8 — Project page titles are malformed: they begin with a preposition
**Severity: HIGH** · **Area: Metadata**

**File:** `archtivy-app/src/lib/seo/seo-templates.ts:90-103` (`buildProjectSeoTitle`)

**Evidence (live):** `https://www.archtivy.com/projects/residential/single-family-house/everden-residence` →
`<title>in Canada — Everden Residence | Archtivy</title>`

Root cause: the builder pushes `category` first, then `in {location}`, then `— {title}`. When `category` is null (the common case, since categorisation moved to the taxonomy tables and the legacy `category` column is largely empty), the title starts with `"in "`.

**Impact:** Titles are the strongest on-page relevance signal and the SERP headline. Starting with `"in Canada — "` wastes the highest-value characters and reads as broken to both users and Google.

**Recommended fix:** Restructure to entity-first: `{Title} — {Category} in {Location} | Archtivy`, degrading gracefully when category and/or location are absent. `buildProductSeoTitle` is already entity-first and needs no change.
**Risk of fix:** Low. Changes the `<title>` of all 75 project pages — which is the intent.

---

### C-9 — Sitemap homepage entry does not match the homepage canonical
**Severity: MEDIUM** · **Area: Sitemap / canonicals**

**File:** `archtivy-app/src/app/sitemap.ts:27`

**Evidence:** sitemap emits `<loc>https://www.archtivy.com</loc>` (no trailing slash). The homepage canonical is `/`, which resolves to `https://www.archtivy.com/`. Sitemap URL ≠ canonical URL.

**Recommended fix:** emit `${base}/`.
**Risk of fix:** None.

---

### C-10 — Non-www → www uses a **307** (temporary), and HTTP adds a second hop
**Severity: MEDIUM** · **Area: URL architecture / redirect chains**

**Evidence:**
```
http://archtivy.com/       → 308 → https://archtivy.com/
https://archtivy.com/      → 307 → https://www.archtivy.com/     ← temporary
https://www.archtivy.com/  → 200
```
Google's *known* URLs are on the **non-www** host (`archtivy.com/listing/...`), so this 307 sits directly on the recovery path.

**Impact:** A 307 signals "this move is temporary, keep indexing the old URL". Combined with the relative canonicals (C-3), the non-www host never cleanly consolidates into www. Two hops from `http://archtivy.com` also wastes crawl budget.

**Recommended fix:** **Not a code change.** Set the non-www → www domain redirect to **308 (permanent)** in the Vercel project's Domains settings.
**Risk of fix:** Low; requires dashboard access.

---

### C-11 — Publicly reachable debug routes in production
**Severity: MEDIUM** · **Area: Crawlability / hygiene**

**Files:** `archtivy-app/src/app/debug/env/page.tsx`, `archtivy-app/src/app/test/page.tsx`

**Evidence:** both are ordinary public routes returning 200. `robots.ts` disallows `/debug/` and `/test/`, but a `Disallow` does not prevent indexing of a URL that is linked from elsewhere — it only prevents crawling. `debug/env` renders whether `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is set and its first 3 characters; its own header comment says "Remove this route when done debugging".

**Recommended fix:** Return a 404 for both outside development, and add `noindex` metadata as belt-and-braces.
**Risk of fix:** Very low.

---

### C-12 — Google's sitemap ping endpoint is dead
**Severity: LOW** · **Area: Deployment / indexing pipeline**

**File:** `archtivy-app/src/lib/seo/indexnow.ts:59-74`

**Evidence:** `pingSitemap()` calls `https://www.google.com/ping?sitemap=…`. Google **retired** this endpoint in 2023; it now returns 404. Bing's equivalent is likewise deprecated in favour of IndexNow.

**Impact:** No harm beyond two wasted outbound requests and misleading log noise on every publish, but it creates a false sense that Google is being notified. It is not.

**Recommended fix:** Drop the Google/Bing sitemap pings; keep the IndexNow submission (which is real and works for Bing/Yandex). Google discovery must come from the sitemap in Search Console.
**Risk of fix:** None.

---

### C-13 — `INDEXNOW_KEY` location is inside a robots-disallowed path
**Severity: LOW** · **Area: Deployment**

**Files:** `archtivy-app/src/lib/seo/indexnow.ts:46`, `archtivy-app/src/app/robots.ts:24`

**Evidence:** `keyLocation` is `${baseUrl}/api/indexnow-key`, while robots.txt has `Disallow: /api/`. IndexNow verification does not honour robots.txt, so this works today, but it is fragile and non-idiomatic (the convention is a root-level `{key}.txt`). Also note `INDEXNOW_KEY` is absent from `.env.local` and `.env.local.example`, so IndexNow is currently a no-op.

**Recommended fix:** Document the env var; optionally move the key file to the root. Low priority.

---

## 2. Probable problems (need deployment or Search Console data to confirm)

### P-1 — Thin / auto-generated profile pages at scale
**Severity: HIGH** · **Confirm with:** GSC → Pages → "Crawled – currently not indexed"

**Evidence:** 157 of 206 profiles (76%) have **no username and no bio**. 171 of 206 (83%) have no bio at all. These are stubs created automatically when someone is credited on a project.

**Why probable, not confirmed:** whether Google classifies them as thin depends on how many get crawled. The current sitemap (post-`03cddb4`) already excludes username-less profiles, and C-7's fix noindexes them. Expect this to resolve once deployed.
**Risk of fix:** Low.

---

### P-2 — Duplicate descriptions across product variants
**Severity: MEDIUM** · **Confirm with:** GSC → "Duplicate without user-selected canonical"

**Evidence (Supabase):** identical description strings shared across multiple approved listings —
`"Fleur Coffee Table, designed by Christophe Delcourt for Molt…"` × **5**,
`"Ortiz House is a single-family residence designed to support…"` × **4**,
plus three more pairs. 11 of 163 approved listings have descriptions under 120 characters; 4 have none at all.

**Recommended fix:** Editorial, not code. Differentiate variant copy, or consolidate true variants onto one page with variant attributes. Do **not** noindex variants blindly.
**Risk of fix:** Low, but requires content work.

---

### P-3 — Three approved listings have no slug and are addressed by UUID
**Severity: MEDIUM** · **Confirm with:** post-deploy sitemap inspection

**Evidence:** Supabase — 3 of 163 approved listings have `slug IS NULL`. `sitemap.ts:118` falls back to `r.slug ?? r.id`, so these enter the sitemap as `/projects/{taxonomy}/{uuid}`. One is titled `"Untitled project"`, another `"MEcid"` — both thin.

**Recommended fix:** Backfill slugs from titles in the admin panel; leave the code fallback in place as a safety net.
**Risk of fix:** Low. This is a data fix, not a code fix — deliberately not automated here.

---

### P-4 — `/u/` layout forces dynamic rendering, overriding page-level ISR
**Severity: LOW** · **Confirm with:** GSC → Crawl stats → average response time

**File:** `archtivy-app/src/app/(public)/u/layout.tsx:1-2` sets `dynamic = "force-dynamic"` and `revalidate = 0`, which override `revalidate = 3600` in `u/[username]/page.tsx:3`.

**Note:** the page calls `auth()` and `currentUser()`, which make it dynamic regardless, so removing the layout override would be close to a no-op. Flagged for clarity, **not changed** — fixing it properly means splitting viewer-specific state out of the page, which is a refactor beyond this audit's scope.

---

### P-5 — `Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch` on every HTML response
**Severity: LOW** · **Confirm with:** GSC URL Inspection → "Page fetch"

Standard Next.js App Router behaviour. Googlebot ignores `Vary` for HTML and the live fetches all succeeded, so this is noted for completeness only. No action.

---

## 3. Areas audited and found **healthy** (no action needed)

Recording these so future work does not re-litigate them.

| Area | Finding |
|------|---------|
| **HTTP status of public pages** | 70-URL random sample from the live sitemap: **69 × 200**, zero 4xx/5xx. |
| **robots.txt** | Valid, `Allow: /`, sensible private-route disallows, correct absolute `Sitemap:` line pointing to the www origin. **Does not block any public content.** |
| **X-Robots-Tag headers** | None present on any public response. Nothing blocking at the header layer. |
| **sitemap.xml** | 200, valid XML, `application/xml`, 1,115 URLs — far under the 50,000 / 50 MB limits, so **no sitemap index is required**. Correctly filters to `status = 'APPROVED'` and `deleted_at IS NULL`; `lastmod` uses real `updated_at` values; static pages use a pinned `2026-03-01` date rather than "today", which correctly avoids crawl spam. |
| **Server-side rendering** | Project, product, profile, hub and taxonomy-archive pages all ship full content in the initial HTML — real `<h1>`, body copy, and crawlable `<a href>` links. No JS dependency for primary content on entity pages. |
| **generateMetadata** | Implemented correctly on every dynamic route; unique titles and descriptions per entity; no throw-on-null paths observed. |
| **Internal linking / crawl depth** | Verified live: `/` → 6 project + 5 product + 5 profile detail links; `/projects` → category hub; `/projects/residential` → 113 links incl. sub-categories and details; `/projects/residential/single-family-house` → detail pages + designer profiles. **Home → detail is 3 clicks. No orphan entity pages.** All links are real `<a href>`, not JS handlers. |
| **Breadcrumbs** | Present as both visible `<nav aria-label="Breadcrumb">` markup and `BreadcrumbList` JSON-LD on detail and archive pages. |
| **Structured data** | Live-verified: homepage `WebSite` + `Organization` (+ `SearchAction`, `ImageObject`); project pages `ArchitecturalStructure` + `PostalAddress` + `GeoCoordinates` + `FAQPage` + `BreadcrumbList`; product pages `Product` + `Offer` + `Organization` (brand) + `FAQPage` + `BreadcrumbList`; profile pages `Person` (or `Organization` for brands). JSON-LD is correctly escaped for `<`, `>`, `&` (`serializeJsonLd`). Types and nesting are valid. |
| **Explore → archive canonicals** | `/explore/projects/{taxonomy}` and `/explore/products/{taxonomy}` correctly cross-canonical to the archive URLs `/projects/{taxonomy}` / `/products/{taxonomy}`, so the two hub systems do not compete. |
| **Legacy query-param URLs** | `?category=` and `?taxonomy=` on explore routes issue redirects to path-based URLs. Good. |
| **Private routes** | `(admin)`, `(app)`, `/sign-in`, `/sign-up` all carry `robots: { index: false, follow: false }` at the layout level **and** are disallowed in robots.txt. Correct belt-and-braces. |
| **Google Search Console verification** | `<meta name="google-site-verification" content="p9zsrg-…"/>` is live on the homepage. The property is verified. |
| **HTTPS / HSTS** | `strict-transport-security: max-age=63072000` on all responses. HTTP correctly upgrades. |
| **Trailing slashes** | Consistent no-trailing-slash policy; `/listing/epicurus-jazz-club/` → 308 → no-slash. No mixed-form duplicates. |

---

## 4. URL architecture assessment

**Current entity URL spaces:**

| Entity | URL pattern | Status |
|--------|-------------|--------|
| Project detail | `/projects/{taxonomy-path}/{slug}` | ✅ Canonical, taxonomy-aware, 308s from flat/UUID forms |
| Product detail | `/products/{taxonomy-path}/{slug}` | ✅ Same |
| Project taxonomy archive | `/projects/{taxonomy-path}` | ✅ In sitemap with per-node SEO fields |
| Product taxonomy archive | `/products/{taxonomy-path}` | ✅ Same |
| Hubs | `/projects`, `/products` | ✅ |
| Designer / studio / brand / manufacturer | `/u/{username}` | ⚠️ **All four share one namespace** |
| Profile (no username) | `/u/id/{uuid}` | ❌ See C-7 |
| Directories | `/explore/designers`, `/explore/brands` | ✅ Server-rendered with anchors |
| Map tool | `/explore` | ❌ See C-6 |
| Collections | — | **Does not exist** |
| Location pages | — | **Does not exist** |

**Gaps (opportunity, not defect — deliberately out of scope for this fix pass):**
- There are **no location landing pages** (`/projects/in/{country}`, `/{city}`), despite `location_city` / `location_country` being populated and used in titles, descriptions and `PostalAddress` schema. "architecture projects in {city}" is the highest-intent long-tail query class for this vertical and is currently unaddressed.
- There is **no `/brands/{slug}` or `/studios/{slug}` namespace**. Brands and designers are both `/u/{username}`, so a brand page cannot rank on brand-specific query patterns and cannot carry `LocalBusiness`/`Organization` treatment distinct from `Person`.
- There are **no collections**.

These require new routes and new content, which is product work, not an indexability fix. Recommended as Phase 3 in `SEO_FIX_PLAN.md`.

---

## 5. Severity roll-up

| ID | Problem | Severity | Fixed in code now? |
|----|---------|----------|--------------------|
| C-1 | Production runs stale code; `main` 5 months behind | **CRITICAL** | ❌ Requires merge + deploy (human) |
| C-2 | `/listing/*` soft-404 (200 + noindex) | **CRITICAL** | ✅ |
| C-3 | `metadataBase` unset → relative canonicals | **CRITICAL** | ✅ |
| C-4 | `getBaseUrl()` can fall back to `.vercel.app` | **CRITICAL** | ✅ |
| C-5 | Maintenance mode de-indexes site on deploy | **CRITICAL** | ✅ |
| C-6 | `/explore` thin page at sitemap priority 0.9 | HIGH | ✅ |
| C-7 | `/u/id/{uuid}` duplicate + thin | HIGH | ✅ |
| C-8 | Project titles start with "in {Country}" | HIGH | ✅ |
| C-9 | Sitemap homepage `<loc>` ≠ canonical | MEDIUM | ✅ |
| C-10 | Non-www → www is 307, not 308 | MEDIUM | ❌ Vercel dashboard (human) |
| C-11 | `/debug/env`, `/test` public in production | MEDIUM | ✅ |
| C-12 | Dead Google sitemap ping | LOW | ✅ |
| C-13 | IndexNow key under `Disallow: /api/`; key unset | LOW | ⚠️ Documented only |
| P-1 | Thin stub profiles (157/206) | HIGH | ✅ (via C-7) |
| P-2 | Duplicate product descriptions | MEDIUM | ❌ Editorial |
| P-3 | 3 approved listings with no slug | MEDIUM | ❌ Data backfill |
| P-4 | `/u/` layout overrides ISR | LOW | ❌ Deliberately not changed |
| P-5 | `Vary` header | LOW | No action |

---

## 6. What this audit **cannot** tell you

These require Google Search Console access and are listed in full in `SEO_FIX_PLAN.md` §5:

- Whether the domain has a **manual action** or security issue.
- The actual **index coverage split** (Discovered / Crawled-not-indexed / Duplicate / Soft 404 / Excluded by noindex).
- Whether the verified GSC property is `https://www.archtivy.com`, `https://archtivy.com`, or a Domain property. **If the property is non-www while canonicals are www, all data is being reported against the wrong host.**
- Whether `sitemap.xml` was ever **submitted**, and its last read date and error count.
- Historical impressions/clicks for the `/listing/*` corpus — needed to quantify what C-2 cost.
- Crawl-rate and crawl-budget data.

---

## 7. Expectation setting

Deploying these fixes does **not** produce indexing. The realistic sequence:

1. **Immediately on deploy** — status codes, canonicals, robots meta and sitemap contents become correct. Verifiable within minutes (see the post-deploy checklist).
2. **Days 1–14** — Google re-crawls the sitemap and the previously soft-404'd `/listing/*` URLs, now finding 308s into live pages. Coverage report starts moving.
3. **Weeks 2–8** — pages migrate out of "Crawled – currently not indexed" into "Indexed", *if* content quality clears the bar. Thin stub profiles will legitimately stay out.
4. **Ongoing** — ranking depends on content depth, external links and the location/brand landing pages that do not yet exist. Technical correctness is table stakes, not a ranking strategy.

A site with 163 listings, 49 real profiles and no external link profile will not rank quickly regardless of how clean the technical layer is. The fixes here remove the reasons Google *refuses* to index; they do not manufacture demand.
