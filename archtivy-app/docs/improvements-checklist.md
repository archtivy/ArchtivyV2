# Post-Implementation Verification Checklist

## 1. Image Lazy Loading

- [ ] Explore cards (ProjectCard, ProductCard, ProjectCardPremium, ProductCardPremium) use responsive `sizes` and no `priority`
- [ ] Detail page hero image only has `priority` (ProjectHeroGallery, ProductDetailGallery)
- [ ] Card images use `sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"` or similar
- [ ] `src/lib/utils/imageUrls.ts` exists; TODO for Supabase transforms when enabled

## 2. Welcome Email

- [ ] `/api/webhooks/clerk` route exists; add endpoint to Clerk Dashboard → Webhooks
- [ ] Set `CLERK_WEBHOOK_SECRET` and `RESEND_API_KEY` in env
- [ ] Subscribe to `user.created` event in Clerk
- [ ] Test: sign up new user, verify welcome email arrives
- [ ] Reply-to is support@archtivy.com (or configured SUPPORT_EMAIL)

## 3. Post-Signup /welcome Page

- [ ] `/welcome` renders; signed-out users see Explore/Sign in CTAs
- [ ] Signed-in users see role pick + Create first listing / Explore CTAs
- [ ] After signup, user is redirected to `/welcome` (afterSignUpUrl)
- [ ] TODO: Store `has_seen_welcome` in Clerk user metadata and skip /welcome on subsequent visits if desired

## 4. Header Search

- [ ] Search icon + input visible on all pages except `/`
- [ ] Typing in search and pressing Enter routes to `/explore/projects?q=...` (or `/explore/products?q=...` when on products page)
- [ ] Explore pages read `searchParams.q` and filter results (already implemented)
- [ ] Mobile: full-width search overlay works with Enter submit

## 5. Cards: Connection Tooltip

- [ ] Project and Product cards show connection count
- [ ] Hover/title on connection count shows: "Matched = AI-suggested links; Confirmed = manually linked team members and products."
- [ ] TODO: When backend provides split counts (matched vs confirmed), show "X matched · Y confirmed"

## 6. More in This Category

- [ ] Project detail: "More in this category" block below content when project has category
- [ ] Product detail: "More in this category" block below Used in Projects when product has product_category
- [ ] Block shows up to 8 items; excludes current listing
- [ ] Cards link to correct project/product URLs
- [ ] Empty when listing has no category

## General

- [ ] `npm run build` passes
- [ ] No regressions on explore, listing detail, or auth flows
