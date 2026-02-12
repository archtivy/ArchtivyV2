# Archtivy Auth Setup (Clerk + Supabase)

## 1. Clerk environment variables

Add these to `.env.local` in the `archtivy-app` directory:

```env
# Clerk (https://clerk.com)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=YOUR_CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=YOUR_CLERK_SECRET_KEY

# Redirect URLs (so Clerk sends users to our pages)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

- **NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY**: From [Clerk Dashboard](https://dashboard.clerk.com) → API Keys → Publishable key.
- **CLERK_SECRET_KEY**: From the same page → Secret key.

If these are missing or still set to placeholders (`pk_test_xxxx`), the app will show “Auth not configured” on `/sign-in` and `/sign-up` and will not run Clerk middleware.

## 2. Enable Email + Password and OAuth in Clerk

1. In [Clerk Dashboard](https://dashboard.clerk.com), select your application.
2. Go to **User & Authentication** → **Email, Phone, Username** (or **Social Connections**).
3. **Email + Password**:
   - Enable **Email address** and **Password** for sign-up and sign-in.
4. **OAuth (Google, LinkedIn)**:
   - Go to **User & Authentication** → **Social Connections** (or **SSO**).
   - Enable **Google**: follow the prompts, add OAuth client ID/secret from [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
   - Enable **LinkedIn**: add Client ID and Client Secret from [LinkedIn Developer](https://www.linkedin.com/developers/apps).
5. Under **Paths**, set **Sign-in URL** to `/sign-in` and **Sign-up URL** to `/sign-up` if you use custom paths (or leave default).

## 3. Supabase: run auth migrations

1. In [Supabase Dashboard](https://supabase.com/dashboard), open your project → **SQL Editor**.
2. Run the contents of `docs/auth-migrations.sql`:
   - Creates or updates the `profiles` table (Clerk-backed: `clerk_user_id`, `role`, `username`, `display_name`, links, `designer_title`, etc.).
   - Adds `owner_clerk_user_id` to the `listings` table.
3. If you had an older `profiles` table with a different schema (e.g. `user_id`, `profile_role` enum), uncomment and run the drop statements at the top of the migration first, then run the rest.

## 4. Test the onboarding flow

1. **Start the app**: `npm run dev` in `archtivy-app`.
2. **Sign up**: Go to `/sign-up`, create an account (email+password or Google/LinkedIn).
3. **Onboarding**: You should be redirected to `/onboarding`. Choose a role (Designer / Brand / Reader), set display name and username, and optionally designer title (for designers). Submit.
4. **Profile**: You should be redirected to `/me`, which then redirects to `/u/<your-username>`.
5. **Create listing**:
   - **Designers**: Go to `/add/project`, add a project with at least one image. It will be owned by your Clerk user.
   - **Brands**: Go to `/add/product`, add a product with at least one image.
6. **Profile page**: Visit `/u/<username>` and confirm your Projects or Products (and “Used in” for brands) show correctly. If you’re the owner, you should see “Edit profile” and be able to update bio, location, links, designer title.

## 5. Roles and ownership

- **Visitor** (not signed in): Can browse explore and listing pages; cannot create listings; download section shows “Sign in to download”.
- **Reader**: Can sign in and see profile; cannot create projects or products.
- **Designer**: Can create projects; projects are stored with `owner_clerk_user_id`.
- **Brand**: Can create products; products are stored with `owner_clerk_user_id`.

Role is stored in:
- Clerk `publicMetadata.role` (for fast checks in middleware/UI).
- Supabase `profiles.role` (for app data and queries).

## 6. Next steps (TODOs)

- **RLS**: Enable Row Level Security on `profiles` and `listings` in Supabase and add policies so users can only update their own profile and their own listings.
- **Downloads**: Replace the placeholder “Download file” with real file storage (e.g. Supabase Storage) and enforce access by role/ownership.
- **Avatar**: Sync Clerk user image URL to `profiles.avatar_url` on sign-in or via webhook for the public profile avatar.
