# Archtivy — SEO Fix Plan

Companion to `TECHNICAL_SEO_AUDIT.md`. Every step traces to an audit ID.
Steps are ordered so each one is independently revertible and independently verifiable.

**Scope discipline for this pass:** no UI redesign, no listing deletions, no taxonomy changes, no public URL changes, no unrelated refactors. Every change below is either a status code, a `<head>` directive, a sitemap entry, or an environment gate.

---

## Phase 0 — Blocking prerequisite (human, not code)

### Step 0.1 — Fix the deploy pipeline · **C-1** · CRITICAL

Production is running a build that predates 2026-05-21. `origin/main` is at `c065628` (2026-03-02) and does not even contain the taxonomy routes that production serves. **No pushed branch matches production**, which means the live site was deployed from an unpushed local working state.

**Nothing else in this plan reaches Google until this is resolved.**

1. Merge `explore-strip-fix` → `main`; push.
2. Confirm the Vercel project's Production Branch is `main` and that Git integration (not local `vercel --prod`) drives production.
3. Deploy to a **preview** URL first and run the Phase 4 verification against it.
4. Promote to production only after preview passes.

**Risk:** Medium — 20+ commits promote at once. Mitigated by preview-first + the verification gate. This is the single highest-value action in the entire plan.

---

## Phase 1 — Stop the bleeding (deploy-blocking correctness)

### Step 1.1 — Make maintenance mode explicit and opt-in; use 503 not 307 · **C-5** · CRITICAL
`src/lib/maintenance.ts`, `src/middleware.ts`, `src/app/(public)/page.tsx`

- Gate on `MAINTENANCE_MODE` env (`1`/`true`), **not** `VERCEL_ENV === "production"`. Default off.
- When on, respond **`503` + `Retry-After: 3600` + `X-Robots-Tag: noindex`** instead of `307 → /`. A 503 tells Google "come back later, hold the index"; a 307 to `/` tells Google "every page on this site is the homepage".
- Remove `follow: false` from the maintenance landing metadata.

**Why first:** without this, deploying Phase 0 de-indexes the entire site.
**Risk:** Low. Default-off is the safe direction and the capability is preserved.
**Revert:** set `MAINTENANCE_MODE=1`.

### Step 1.2 — Set `metadataBase` · **C-3** · CRITICAL
`src/app/layout.tsx`

Add `metadataBase: new URL(getBaseUrl())` to the root `metadata` export. Converts every relative `alternates.canonical` and OG image path across the app into an absolute URL in one line.

**Risk:** Very low. **Revert:** delete the line.

### Step 1.3 — Harden `getBaseUrl()` · **C-4** · CRITICAL
`src/lib/canonical.ts`

Resolution order becomes `NEXT_PUBLIC_SITE_URL` → (`VERCEL_ENV === "production"` ? `DEFAULT_BASE`) → `VERCEL_URL` → `localhost`. Activates the already-declared-but-unused `DEFAULT_BASE` constant so production can never emit `.vercel.app` canonicals.

**Risk:** Very low — strictly narrows a failure mode. **Revert:** restore prior order.

---

## Phase 2 — Recover the lost index

### Step 2.1 — Redirect legacy `/listing/*` instead of soft-404ing · **C-2** · CRITICAL
`src/app/(public)/listing/[id]/page.tsx`, `src/app/(public)/listing/page.tsx`

- Look the trailing segment up in `listings` by `slug`, then by `id`.
- Hit → `permanentRedirect()` (308) to the canonical taxonomy-aware `/projects/…` or `/products/…` URL.
- Miss → genuine **404** (async component + `notFound()`), with `robots: noindex` metadata.
- `/listing` (index) → 308 to `/projects`.

This is the change that reconnects Google's existing knowledge of the domain to the current site.

**Risk:** Low. One indexed lookup on an otherwise-dead route; no effect on live URLs.
**Verification is mandatory here** — the current bug is precisely that source-level `notFound()` produced a 200. Status codes must be read from a real production build, not inferred.

### Step 2.2 — Resolve `/u/id/{uuid}` duplication · **C-7, P-1** · HIGH
`src/app/(public)/u/id/[profileId]/page.tsx`

- Username present → **308 → `/u/{username}`** (both in `generateMetadata`'s sibling page body and the page itself).
- No username → keep the page reachable, emit **`noindex, follow`**. `follow` preserves the outbound credits to real project pages.
- Deliberately **not** adding `Disallow: /u/id/` to robots.txt: blocking crawl would prevent Google from ever seeing the redirect or the noindex, freezing the duplicates in the index.

**Risk:** Low. **Revert:** restore self-canonical.

### Step 2.3 — Remove `/explore` from the index and the sitemap · **C-6** · HIGH
`src/app/(public)/explore/page.tsx`, `src/app/sitemap.ts`

`noindex, follow` on the map tool, and drop its sitemap entry. `/explore/projects`, `/explore/products`, `/explore/designers` and `/explore/brands` are unaffected — they render content and links server-side and stay indexable.

**Risk:** Low, fully reversible in two lines. The URL itself is unchanged and still reachable.

---

## Phase 3 — Metadata and sitemap accuracy

### Step 3.1 — Fix the project title template · **C-8** · HIGH
`src/lib/seo/seo-templates.ts` → `buildProjectSeoTitle`

Entity-first: `{Title} — {Category} in {Location} | Archtivy`, degrading cleanly when category and/or location are missing. Eliminates titles that begin `"in Canada — "`. `buildProductSeoTitle` is already correct and is left alone.

**Risk:** Low. Rewrites `<title>` on all 75 project pages — intended.

### Step 3.2 — Sitemap homepage entry · **C-9** · MEDIUM
`src/app/sitemap.ts` — emit `${base}/` so the sitemap URL matches the homepage canonical exactly.

### Step 3.3 — Close the public debug routes · **C-11** · MEDIUM
`src/app/debug/env/page.tsx`, `src/app/test/page.tsx` — `notFound()` outside development, plus `noindex` metadata.

### Step 3.4 — Drop the dead sitemap pings · **C-12** · LOW
`src/lib/seo/indexnow.ts` — remove the Google (retired 2023) and Bing sitemap pings; keep the working IndexNow submission. Document `INDEXNOW_KEY` in `.env.local.example` (**C-13**).

### Step 3.5 — Restore homepage `og:url` / `og:site_name` · MEDIUM
`src/app/(public)/page.tsx` — the page-level `openGraph` object fully replaces the root layout's, dropping `siteName`. Re-add `siteName` and add `url`.

---

## Phase 4 — Verification (before promoting to production)

Run against a **local production build** (`next build && next start`) and again against the **Vercel preview URL**. Details and exact commands in `SEO_CHANGELOG.md` §"Post-deployment verification checklist".

Gate on all of these:

- [ ] `/listing/{known-legacy-slug}` → **308** (not 200)
- [ ] `/listing/{garbage}` → **404** (not 200)
- [ ] `/`, `/projects`, `/products`, a project detail, a product detail, `/u/{username}` → **200**
- [ ] Canonicals are **absolute** (`https://www.archtivy.com/…`) on every one of those
- [ ] No `noindex` on any page intended to be indexed
- [ ] `/explore` → `noindex, follow`; `/u/id/{uuid-with-username}` → 308
- [ ] `/robots.txt` → 200, `Allow: /`, absolute `Sitemap:` line
- [ ] `/sitemap.xml` → 200, valid XML, no `/explore` entry, no `/u/id/` entries, homepage `<loc>` ends in `/`
- [ ] Every sitemap `<loc>` host matches the canonical host
- [ ] Server HTML for a project page contains `<h1>`, body copy, and `<a href>` links (no JS required)
- [ ] `MAINTENANCE_MODE` unset → full site renders; `MAINTENANCE_MODE=1` → 503 + `X-Robots-Tag: noindex`

---

## Phase 5 — Out of scope for this pass (recommended next)

Recorded so they are not lost. None are indexability blockers.

| Item | Audit ID | Why deferred |
|------|----------|--------------|
| Backfill slugs for the 3 approved listings with `slug IS NULL` | P-3 | Data change, belongs in the admin panel |
| De-duplicate the 5×/4× repeated product & project descriptions | P-2 | Editorial content work |
| Fill bios for the 171 profiles with none | P-1 | Editorial / outreach |
| **Location landing pages** (`/projects/in/{country}`, `/{city}`) | §4 | New routes + content. Highest-value growth opportunity — the data already exists and is already in titles, descriptions and `PostalAddress` schema |
| **Dedicated `/brands/{slug}` namespace** distinct from `/u/{username}` | §4 | Brands and designers currently share one namespace; splitting enables `Organization`/`LocalBusiness` treatment and brand-query targeting |
| Split viewer-specific state out of `/u/[username]` so ISR applies | P-4 | Real refactor; current `force-dynamic` is near-moot because `auth()` forces dynamic anyway |
| Move IndexNow key file to site root | C-13 | Cosmetic |

---

## Actions requiring Google Search Console access (cannot be done from code)

| # | Action | Why it matters |
|---|--------|----------------|
| 1 | **Confirm which property is verified** — `https://www.archtivy.com`, `https://archtivy.com`, or a Domain property | Canonicals are www. A non-www-only property reports against the wrong host and will look empty regardless of how well indexing goes. **Fix this before reading any other GSC data.** Prefer a Domain property. |
| 2 | Check **Manual actions** and **Security issues** | A manual action would explain total absence of indexing and is invisible from code. Rule it in or out first. |
| 3 | **Submit `https://www.archtivy.com/sitemap.xml`** and record last-read date + error count | Nothing in the codebase proves the sitemap was ever submitted, and the Google ping endpoint it calls has been dead since 2023 (C-12). |
| 4 | Export **Pages → Why pages aren't indexed** | Distinguishes "Soft 404" (confirms C-2), "Duplicate without user-selected canonical" (confirms C-3/C-7), "Crawled – currently not indexed" (confirms P-1), and "Excluded by noindex". Each points at a different fix. |
| 5 | **URL Inspection → Live Test** on the URLs listed in `SEO_CHANGELOG.md` §"URLs to submit" | Shows Google's *rendered* HTML and its chosen canonical vs. the declared one. The only way to confirm C-3 is resolved from Google's side. |
| 6 | Pull historical **impressions/clicks for `/listing/*`** | Quantifies what the un-redirected migration (C-2) cost, and identifies which legacy URLs deserve hand-mapped redirects. |
| 7 | Review **Crawl stats** (response codes, average response time, crawl requests/day) | Confirms whether the soft-404s were consuming crawl budget, and whether crawl rate recovers post-deploy. |
| 8 | Set the **non-www → www redirect to 308** in Vercel → Domains | C-10. Dashboard-only; currently a 307 (temporary), sitting directly on the recovery path for the non-www legacy URLs. |
| 9 | Confirm `NEXT_PUBLIC_SITE_URL` is set to `https://www.archtivy.com` in Vercel **Production** env | Backstopped in code by Step 1.3, but should be explicit. |
| 10 | Confirm Vercel **Deployment Protection** is off for Production | Was not blocking during this audit (all probes returned 200), but worth pinning down as a standing config. |

---

## What "done" looks like — and what it does not

**Done means:** every public page returns 200 with an absolute, correct canonical and no accidental `noindex`; the legacy corpus 308s into live pages; the sitemap advertises only indexable URLs on the canonical host; and the code that produces all of this is actually running in production.

**Done does not mean indexed.** Expect: correctness verifiable in minutes; recrawl over days 1–14; coverage movement over weeks 2–8; and thin stub profiles legitimately staying out of the index permanently. With 163 listings and no external link profile, technical correctness removes the *blockers* to indexing — it does not by itself create rankings.
