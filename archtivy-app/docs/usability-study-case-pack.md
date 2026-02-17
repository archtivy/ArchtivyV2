# Archtivy UX Usability Study Case Pack

**Purpose:** Simulate real users stress-testing the platform. Use for moderated sessions, unmoderated task-based tests, and prioritising fixes.

**Severity scale:** S1 = critical (blocking), S2 = major (high friction), S3 = moderate (confusing), S4 = minor (polish).

---

## 1. Visitor / Reader (no account)

**Persona:** Browsing for inspiration, specs, or references. May be student, journalist, or enthusiast. No intent to publish. Wants to understand value before signing up.

**Motivation:** Find a project or product; understand who did it and what was used; decide if the platform is worth an account.

**Top tasks:**
- Find projects by theme or location.
- Open a project and see “what products were used.”
- Open a product and see “where it’s used.”
- Understand who posted (designer vs brand).
- Decide whether to sign up or leave.

**Test script:**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Land on homepage. | Clear value prop; paths to Explore Projects / Products. |
| 2 | Click “Explore Projects.” | Grid of projects; filters/sort if present. |
| 3 | Use search or filters (e.g. location, category). | Results update; empty state if no match. |
| 4 | Click one project card. | Project detail: title, gallery, description, location, team, products used. |
| 5 | Find “connections” or “products used” section. | Understand what “connections” means (products + people linked). |
| 6 | Click a linked product. | Product detail; see “Used in projects” with link back. |
| 7 | Click “Save” on project or product (signed out). | Redirect to sign-in with return URL, or clear prompt to sign in. |
| 8 | Open a profile (e.g. u/username from card). | See projects/products by that user; distinguish “authored” vs “collaborated.” |

**Confusion points:**

| Friction | Severity | Where | Improvement |
|----------|----------|--------|-------------|
| “Connections” is jargon; unclear if it’s people, products, or both. | S2 | Project/Product cards, detail sidebar | One-line definition or tooltip: “Products and people linked to this listing.” |
| Card shows owner name but not “designer” vs “brand.” | S3 | ProjectCard, ProductCard | Role or type pill/label (e.g. “Project by designer”). |
| Save as guest: redirect feels abrupt; no inline “Sign in to save.” | S2 | DetailHeaderBar, ProductDetailLayout | Inline hint: “Sign in to save to a board” before redirect. |
| Empty search results: no suggestion to broaden or contact. | S3 | Explore (projects/products) | Empty state copy: “No results. Try different filters or search terms.” |
| “Used in projects” on product page: unclear if it’s verified or user-submitted. | S2 | Product detail, Used in projects section | Short line: “Linked by project authors” or “As credited on projects.” |

**Success criteria:** Visitor finds a project, follows to a product, and can articulate “connections” in &lt; 3 min. No dead ends on empty states.

---

## 2. Designer (wants to publish projects)

**Persona:** Architect or designer who wants to publish built work and get credit for specifications. May work in a studio. Wants to add projects and link products.

**Motivation:** Publish a project; add team; link products used; be discoverable.

**Top tasks:**
- Sign up and choose “designer.”
- Add a project (title, description, location, gallery).
- Add team members and link products to the project.
- See project live and shared correctly.
- Edit or fix a project after publish.

**Test script:**

| Step | Action | Expected |
|------|--------|----------|
| 1 | From homepage, click primary CTA or “Explore Projects” then sign-in. | Sign-in/sign-up; optional post-sign-up onboarding. |
| 2 | Complete onboarding; select “Designer.” | Role confirmed; path to add project. |
| 3 | Go to Add Project (nav or /add/project). | Form: title, description, location, gallery, team, products. |
| 4 | Fill required fields; upload at least 3 images. | Validation clear; upload progress visible. |
| 5 | Add team members (names/roles). | Rows add; roles from predefined list. |
| 6 | Search and add “products used.” | Search works; selected products appear; can remove. |
| 7 | Submit. | Success state; redirect to project or “My listings”; no silent fail. |
| 8 | Open the new project (public URL). | Project is live; team and products visible; status not “pending” if approved. |
| 9 | Click “Save” on own project. | Save-to-folder modal (signed in); no redirect to sign-in. |

**Confusion points:**

| Friction | Severity | Where | Improvement |
|----------|----------|--------|-------------|
| After sign-up, no clear “Add your first project” path. | S2 | Post sign-up, /me | Onboarding or dashboard CTA: “Add project” with short benefit. |
| Word-count or image-count rules not visible until error. | S3 | AddProjectForm | Inline hints: “Min 300 words,” “At least 3 images.” |
| “Products used” search empty or slow; no “add product later.” | S2 | Add project form, product search | Allow submit without products; empty state: “You can link products when editing.” |
| Pending approval: project not visible; no timeline. | S1 | Project detail when PENDING | Message: “Under review. You’ll be able to share once approved.” |
| Confusion between “Save” (to board) and “Publish”/submit. | S3 | Detail vs Add form | Reserve “Save” for boards; use “Submit” or “Publish” for listing. |

**Success criteria:** Designer adds a project with gallery and at least one product link in &lt; 10 min. Sees it live (or clear “pending”) with no crash.

---

## 3. Brand / Manufacturer (wants to publish products)

**Persona:** Brand or manufacturer publishing product catalog. Wants products discovered and linked from projects.

**Motivation:** Add products; appear in “Used in projects”; get visibility with designers.

**Top tasks:**
- Sign up as “brand.”
- Add a product (title, category, specs, gallery).
- See product on a project’s “products used” (when linked by designer).
- Understand “Used in projects” count and links.

**Test script:**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Sign up; choose “Brand.” | Onboarding reflects brand role; path to add product. |
| 2 | Go to Add Product. | Form: title, category, description, gallery, specs. |
| 3 | Fill and submit. | Validation; success; product appears in “My listings” or similar. |
| 4 | Open product detail (public). | Product live; “Used in projects” shows count and links when designers have linked it. |
| 5 | Search for own product from a project’s “add product.” | Product appears in search; designer can link it. |
| 6 | Click “Save” on a product. | Save-to-folder modal; no redirect. |

**Confusion points:**

| Friction | Severity | Where | Improvement |
|----------|----------|--------|-------------|
| “Used in projects” is 0 and unclear how it gets populated. | S2 | Product detail | Line: “Designers link your product when they add it to a project.” |
| Product categories or types not obvious. | S3 | Add product form | Short examples or tooltip per field. |
| Brand profile vs product listing: what appears where. | S3 | Profile (u/username), product cards | Profile section label: “Products by [name].” |

**Success criteria:** Brand adds a product and sees it on the product detail page; understands how “Used in projects” grows.

---

## 4. Recruiter / Studio lead (exploring portfolios & teams)

**Persona:** Hiring or scouting; cares about who did the work and team structure.

**Motivation:** Find designers or studios; see projects and team; judge credibility.

**Top tasks:**
- Explore by designer or brand.
- Open a project and see team members and roles.
- Go to a designer profile and see all their work.
- Distinguish “led” vs “contributed” vs “product by.”

**Test script:**

| Step | Action | Expected |
|------|--------|----------|
| 1 | From Explore, open Designers (or equivalent). | List or grid of designers. |
| 2 | Click a designer; land on profile. | Profile: name, bio, projects, possibly products. |
| 3 | Open a project from profile. | Project detail with team (names/roles). |
| 4 | Check if team members are clickable or have profiles. | Clear if they’re links; or “Team” is display-only. |
| 5 | Compare two projects: one with team, one without. | No broken layout; empty team handled. |

**Confusion points:**

| Friction | Severity | Where | Improvement |
|----------|----------|--------|-------------|
| Team members not linked to profiles; can’t find more work. | S3 | Project detail, Team section | If no profile link: “Team as credited on this project.” |
| Profile mixes “projects I own” and “projects I contributed to” without label. | S2 | u/[username] | Tabs or labels: “Projects,” “Collaborations,” “Products.” |
| “Connections” number on card doesn’t map to “team + products.” | S3 | ProjectCard | Tooltip or meta: “X connections = team members + linked products.” |

**Success criteria:** Recruiter finds a designer, opens a project, sees team and roles, and can explain “who did what” in &lt; 2 min.

---

## 5. Admin / Curator (reviewing, tagging, quality control)

**Persona:** Internal or trusted curator. Approves listings; may tag or enrich content.

**Motivation:** Review pending listings; approve/reject; maintain quality; optionally tag or fix data.

**Top tasks:**
- See pending projects/products.
| 2 | Open a pending listing. | Full detail; approve/reject or edit. |
| 3 | Approve; confirm it goes live. | Status updates; listing visible on explore. |
| 4 | Edit a listing (e.g. fix title or tags). | Save works; no data loss. |
| 5 | Use any image-tagging or product-linking tools. | UI is understandable; save confirms. |

**Confusion points:**

| Friction | Severity | Where | Improvement |
|----------|----------|--------|-------------|
| No bulk actions for pending queue. | S4 | Admin listings list | “Approve selected” or filters. |
| Reject with no reason; creator doesn’t know why. | S2 | Admin approve/reject | Optional rejection reason; consider email or in-app note. |
| Tagging or linking UI dense; easy to mis-save. | S3 | Admin project/product edit, tagging | “Save” vs “Save and continue”; clear success state. |

**Success criteria:** Admin resolves a pending listing (approve or reject) and sees updated status; no undefined errors on save.

---

## 6. Power user (saving to boards, collecting inspiration)

**Persona:** Actively collects projects and products into boards; may share boards; uses lightbox and detail Save.

**Motivation:** Build multiple boards; save from lightbox and from detail; share a board link; revisit later.

**Top tasks:**
- Save a project from project detail.
- Save a product from product detail.
- Save from lightbox (same modal).
- Create a board/folder; add items.
| 5 | Toggle board visibility; copy share link. | Board public/private; share URL works. |
| 6 | Open shared board (signed out or other user). | Board view with correct items; no crash. |

**Test script:**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Sign in; open a project detail. | Save button visible. |
| 2 | Click Save. | Save-to-folder modal with boards; can select folders and save. |
| 3 | Close modal; click Save again. | Modal reopens; selection state consistent. |
| 4 | Open lightbox from same project; click Save. | Same Save-to-folder modal; save works. |
| 5 | Go to Saved / Boards. | List of boards; open one; see items. |
| 6 | Create new board; add name. | Board created; can add items to it. |
| 7 | Make board public; copy share link. | Share modal or copy; URL works in incognito. |
| 8 | Open shared board URL (signed out). | Public board renders; no sign-in wall if public. |

**Confusion points:**

| Friction | Severity | Where | Improvement |
|----------|----------|--------|-------------|
| “Save” on detail vs “Save to folder” in lightbox: same action, different words. | S4 | DetailHeaderBar, LightboxGallery | Align copy: “Save” with aria “Save to folder.” |
| New user has no folders; modal empty. | S2 | SaveToFolderModal | Empty state: “Create a board to start saving” + CTA. |
| Can’t remove item from board from detail page. | S3 | Detail page | “Saved to X” with “Remove from board” if in a board. |
| Board share link not obvious. | S3 | Saved boards, BoardShareModal | Clear “Share board” and “Copy link.” |

**Success criteria:** Power user saves from detail and lightbox into a board, creates a board, and shares it; shared link loads without errors.

---

## 7. International user (language / locations, unfamiliar names)

**Persona:** Non-English primary or exploring projects in unfamiliar cities/countries.

**Motivation:** Find projects by location; understand place names; trust location data.

**Top tasks:**
- Filter explore by location or country.
- Read location on cards and detail.
- Understand “City, Country” or place-name format.
- See if content is in English only.

**Test script:**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Use location filter (if any) on Explore. | Results scoped to location; empty state if none. |
| 2 | Open a project in an unfamiliar city. | Location shown clearly (e.g. “City, Country”). |
| 3 | Check for language switcher or locale. | Known: EN only or documented. |
| 4 | Search with non-English term (if supported). | Clear behaviour; no silent empty. |

**Confusion points:**

| Friction | Severity | Where | Improvement |
|----------|----------|--------|-------------|
| Location is free text; inconsistent “City, Country.” | S3 | Project form, cards, detail | Placeholder or format hint; optional map. |
| No language or region hint. | S4 | Footer, About | “Content is in English. Locations are global.” |
| City/country names not standardised (spelling variants). | S3 | Search, filters | Normalise or suggest canonical names. |

**Success criteria:** User can filter or read locations without misunderstanding; no broken layout for long names.

---

## 8. Mobile-first user (small screen)

**Persona:** Uses phone as primary device; thumb-driven; limited patience for deep nav.

**Motivation:** Browse, open detail, save or share; add listing if motivated.

**Top tasks:**
- Use homepage and explore on mobile.
- Open project/product detail; read and scroll.
- Use Save (modal); use lightbox (zoom, next/prev).
- Use nav (menu, account); optionally add listing.

**Test script:**

| Step | Action | Expected |
|------|--------|----------|
| 1 | Open homepage on narrow viewport. | Hero and featured sections readable; CTAs tappable. |
| 2 | Open hamburger/menu. | Drawer or menu; links work; close clear. |
| 3 | Explore projects; open a card. | Detail loads; gallery usable (swipe or dots). |
| 4 | Open lightbox from gallery. | Full-screen image; next/prev; close; Save reachable. |
| 5 | Tap Save (signed in). | Modal fits screen; folder list scrollable; tap targets ≥44px. |
| 6 | Add project (optional). | Form fields and upload usable; no horizontal scroll. |

**Confusion points:**

| Friction | Severity | Where | Improvement |
|----------|----------|--------|-------------|
| Save or Share buttons too small or cramped. | S2 | Detail header (mobile) | Adequate tap size; spacing. |
| Lightbox Save at bottom; hard to reach one-handed. | S3 | LightboxGallery | Keep Save visible or sticky. |
| Tables or wide content overflow. | S2 | Detail, admin | Scroll wrapper or responsive table. |
| Filter chips or sort overflow. | S3 | Explore pages | Horizontal scroll or collapse. |

**Success criteria:** Key flows (explore → detail → Save) completable on 375px width in &lt; 3 min; no tap targets &lt; 44px for primary actions.

---

## Key flows summary

| Flow | Critical pages/components | Main risks |
|------|---------------------------|------------|
| Explore & search | `/explore/projects`, `/explore/products`, search UI | Empty states, jargon (“connections”), filters unclear. |
| Project detail + connections | `ProjectDetailLayout`, sidebar, “Used in” / products | “Connections” undefined; team vs products unclear. |
| Lightbox + related | `LightboxGallery`, related sidebar | Save placement on mobile; related vs “Used in.” |
| Save to folder (detail + lightbox) | `SaveToFolderModal`, `DetailHeaderBar`, `ProductDetailLayout`, `ProjectDetailHeader` | Same modal everywhere; empty folders; share link discoverability. |
| Profile (authored vs collaborated) | `u/[username]`, profile sections | No label for “mine” vs “collaborated”; team not linked. |
| Add listing | `AddProjectForm`, `AddProductForm`, `/add/project`, `/add/product` | Validation only on submit; pending state; product search empty. |
| Onboarding / sign-in | Sign-in, sign-up, onboarding, redirect_url | Redirect loop if auth not ready; post-sign-up next step unclear. |
| Empty states | Explore, boards, folders, search | Generic or missing copy; no next step. |
| Trust / credibility | Cards, detail, profile | Who posted; what is verified vs user-submitted. |

---

## Metrics to capture

- **Time to task:** e.g. “Find a project and a linked product” (&lt; 3 min), “Add project with 1 product” (&lt; 10 min).
- **Error rate:** Clicks that lead to error screen or undefined.
- **Drop-off:** Abandon at sign-in, at form, or at Save modal.
- **SUS or CSAT:** Post-task or post-session.
- **First-time success:** % completing “Save to board” and “Open shared board” without help.

Use this pack to script moderated sessions, write unmoderated task prompts, and prioritise S1/S2 fixes before S3/S4.
