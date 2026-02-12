# E2E Case Study QA Report: Archtivy Listings
## SEO + Matching + Admin/User Parity

**Scope:** Creating listings (Project/Product) from (A) normal user flow and (B) admin dashboard; public site correctness for SEO, schema, team members, connections/matches, soft delete, and cache.

**Case study data (reference):** Ortiz House (project), White Painted Brick Facade + Wood Slat Shelving System (products), team Brunno / André Pavan, brand Meireles + Pavan Arquitetura, materials white brick, wood, stucco, terrazzo/stone.

---

## A) Database integrity

| # | Check | Result | File(s) / Notes |
|---|--------|--------|-----------------|
| A1 | `listings.deleted_at` exists and is used in public/explore queries | **Pass** | `src/lib/db/explore.ts`: project/product queries use `.is("deleted_at", null)`. Sitemap, search suggest, projectProductLinks, admin list filters use it. |
| A2 | `team_members` stored as structured array (not comma-separated) | **Pass** | `parseTeamMembers()` in createProject, listings.ts, admin _actions parses JSON array `{ name, role }[]`. Insert uses same shape in listings row. |
| A3 | Unknown team member name → profile created (`created_by='archtivy'`, `claim_status='unclaimed'`) | **Pass** | User and admin flows call `persistListingTeamMembers()` which uses RPC `get_or_create_unclaimed_profile`. `src/app/actions/createProject.ts` (exported) and `src/app/(admin)/admin/_actions/listings.ts` (both createAdmin*Full). |
| A4 | No constraint warnings for role (if any, note insert path) | **Pass** | No role constraint in app code; `listing_team_members` and RPC define schema. No warnings observed in code paths. |
| A5 | Product read path vs write path (single source of truth) | **Fail** | **Write:** Admin and user product creation insert into `listings` (type=product) + `listing_images`. **Read:** Explore and product detail use `products` table + `product_images` (`getProductRowBySlug`, `getProductRows`, `getProductsCanonical`, `getProductCanonicalBySlug` in `src/lib/db/explore.ts`; matches API `src/app/api/matches/project/route.ts` reads `products`). If there is no DB sync/view from `listings` → `products`, admin/user-created products will not appear on explore, product detail, or matches. |

**Fix for A5:**  
- **Option 1 (single table):** Change product reads to use `listings` (type=product) and `listing_images`: add e.g. `getProductListingBySlugOrId()` in explore that queries `listings` with `.eq("type","product").is("deleted_at",null)`, and use `getImagesByListingIds` for gallery. Update `getProductRows` / `getProductRowsFiltered` to query `listings` where type=product; normalize to existing ProductCanonical shape. Update matches API to read from `listings` for product id/slug/title/cover.  
- **Option 2 (sync):** If `products` is intentionally separate, document and implement a trigger or job that syncs `listings` (type=product) → `products` and `listing_images` → `product_images`, and ensure soft delete propagates.

---

## B) Public UI

| # | Check | Result | File(s) / Notes |
|---|--------|--------|-----------------|
| B1 | Listing pages show title, location, year, area | **Pass** | Project: `src/app/(public)/projects/[slug]/page.tsx` (DetailSidebar from buildProjectSidebarRows). Product: year/category/material_type/color in buildProductSidebarRows. |
| B2 | Team members show role + name; if profile exists, name is clickable | **Pass** | `getListingTeamMembersWithProfiles` → `TeamMemberLinks` (profile_id, display_name, title, username). Links to `/u/[username]` or `/u/id/[profileId]`. Fallback to JSON team_members names if no listing_team_members. |
| B3 | SEO: meta title/description, canonical, OG tags | **Pass** | `generateMetadata` in projects/[slug]/page.tsx and products/[slug]/page.tsx: title, description (trim 160), alternates.canonical, openGraph (title, description, url, images). `getAbsoluteUrl` from `@/lib/canonical`. |
| B4 | Word count: project 300–500+, product 200+ | **Pass** | AddProjectForm: MIN_DESC_WORDS=300, MAX_DESC_WORDS=500; canPublish includes descValid. AddProductForm: MIN_DESC_WORDS=200; canPublish includes descValid. Server actions enforce (createAdminProjectFull does not re-check word count; createProject/createAdmin* validate required fields; product 200 words in createAdminProductFull). |
| B5 | Min images validation (≥3) | **Pass** | MIN_GALLERY=3 in forms; createAdminProjectFull/createAdminProductFull use MIN_GALLERY_IMAGES=3; user createProject and createProductCanonical same. |
| B6 | Explore filters (year/area/location/type) | **Pass** | explore.ts: getProjectListingRowsFiltered (category, year, area_bucket, country, city, materials, brands, q). getProductRowsFiltered (category, year, material_type, color, brand, materials, q). Filter options from getProjectFilterOptions / getProductFilterOptions. |
| B7 | Matches feature shows correct connections | **Conditional** | “Matches” strip uses `/api/matches/project` and `/api/matches/product` (AI/vector). “Related” uses project_product_links (getProductsForProject / getProjectsForProduct) and filters deleted_at. If product read path is fixed (A5), matches API that reads `products` will show correct items once product data is in the table used by the API. |

---

## C) Caching / Revalidation

| # | Check | Result | File(s) / Notes |
|---|--------|--------|-----------------|
| C1 | After create/delete, public pages update without hard refresh | **Partial** | **Delete:** `src/app/api/admin/listings/[id]/route.ts` DELETE calls revalidatePath("/", "/explore/projects", "/explore/products", "/sitemap.xml") → **Pass**. **Admin create:** `createAdminProjectFull` and `createAdminProductFull` in `src/app/(admin)/admin/_actions/listings.ts` only call `revalidatePath("/admin")` → **Fail**: homepage and explore not revalidated after admin create. |
| C2 | revalidatePath or no-store used where needed | **Pass** | User create: createProject revalidatePath("/explore/projects", "/"); createProductCanonical revalidatePath("/explore/products", "/", "/me/listings"). Delete: see C1. Admin create: revalidatePath is used but only for /admin. |

**Fix for C1 (admin create):**  
In `src/app/(admin)/admin/_actions/listings.ts`, at the end of `createAdminProjectFull` and `createAdminProductFull`, add:

```ts
revalidatePath("/");
revalidatePath("/explore/projects");
revalidatePath("/explore/products");
revalidatePath("/sitemap.xml");
```

(before or alongside the existing `revalidatePath("/admin")` and `redirect(...)`).

---

## D) Admin vs user parity

| # | Check | Result | File(s) / Notes |
|---|--------|--------|-----------------|
| D1 | Admin create uses same form components as user | **Pass** | Admin projects/new and products/new use AddProjectForm and AddProductForm with formMode="admin" and ownerProfileOptions. |
| D2 | Admin create uses same submit pipeline (payload shape, team_members, materials) | **Pass** | Same parseTeamMembers, parseBrandsUsed, parseMaterialIds; same persistListingTeamMembers for team members; listing insert shape aligned (type, title, description, team_members, etc.). |
| D3 | Admin-created listing indistinguishable on public pages | **Conditional** | True for **projects** (read from listings). For **products**, depends on A5: if product reads use only `products` table and no sync exists, admin-created products will not appear on public. |

---

## E) Soft delete behavior

| # | Check | Result | File(s) / Notes |
|---|--------|--------|-----------------|
| E1 | Deleted listing disappears from admin list | **Pass** | Admin projects/page and products/page query with `.is("deleted_at", null)`. |
| E2 | Deleted listing does not appear on public homepage/explore/project detail | **Pass** | getProjectListingRows, getProductRows, getProjectCanonicalBySlugOrId (listings), getProductRowBySlug (products) all use `.is("deleted_at", null)`. getProductsForProject / getProjectsForProduct (projectProductLinks) filter by deleted_at. |
| E3 | Public queries filter deleted_at everywhere | **Pass** | Explore, sitemap, search suggest, projectProductLinks, project detail by slug/id, product detail by slug all use deleted_at null. |

**Note:** `src/lib/db/listings.ts` `getListingsByType` and `getFeaturedListings` do **not** filter `deleted_at`. They are not used by the public homepage (which uses getProjectsCanonical / getProductsCanonical from explore). If any future code uses getListingsByType/getFeaturedListings for public display, add `.is("deleted_at", null)`.

---

## Summary of failures and fixes

| Id | Issue | Fix | Where |
|----|--------|-----|--------|
| A5 | Product read path uses `products` table; create path uses `listings` | Use single source: either read products from `listings` (type=product) + `listing_images`, or implement sync from listings → products and product_images. | `src/lib/db/explore.ts` (getProductRowBySlug, getProductRows, getProductRowsFiltered, getProductCanonicalBySlug, getProductsCanonical, getProductsCanonicalFiltered); `src/app/api/matches/project/route.ts`; canonical-models if column names differ. |
| C1 | Admin create does not revalidate public routes | After successful create in createAdminProjectFull and createAdminProductFull, call revalidatePath("/"), revalidatePath("/explore/projects"), revalidatePath("/explore/products"), revalidatePath("/sitemap.xml"). | `src/app/(admin)/admin/_actions/listings.ts` (both createAdminProjectFull and createAdminProductFull, before redirect). |

---

## Release readiness

**Verdict: Not Ready**

**Reasons:**

1. **Product read/write split (A5):** If the app only writes products to `listings` and the public product experience reads from `products`, then admin- and user-created products will not appear on explore, product detail pages, or matches until this is resolved (single-table reads or sync).
2. **Public cache after admin create (C1):** New admin-created listings may not show on homepage/explore until the next full revalidation or manual refresh unless the revalidatePath fix is applied.

**To reach Ready:**

- Resolve product data source: either make all product reads use `listings` (and `listing_images`) or document and implement a reliable sync from `listings` to `products` (and images).
- Add revalidatePath for "/", "/explore/projects", "/explore/products", and "/sitemap.xml" in both admin create actions.
- (Optional) Add `.is("deleted_at", null)` to `getListingsByType` and `getFeaturedListings` in `src/lib/db/listings.ts` for future-proofing.

---

## Checklist summary

| Category | Pass | Fail | Conditional |
|----------|------|------|-------------|
| A) Database integrity | 4 | 1 | 0 |
| B) Public UI | 6 | 0 | 1 |
| C) Caching/Revalidation | 1 | 1 | 0 |
| D) Admin vs user parity | 2 | 0 | 1 |
| E) Soft delete | 3 | 0 | 0 |

**Total: 16 Pass, 2 Fail, 2 Conditional.**
