# Archtivy App – Setup

## Prerequisites

- Node.js 18.17+
- npm or yarn

## 1. Install dependencies

```bash
cd archtivy-app
npm install
```

## 2. Environment variables

Copy the example env file and fill in values (placeholders are fine to run locally without Clerk/Supabase):

```bash
cp .env.local.example .env.local
```

### Clerk (optional for local run)

1. Go to [clerk.com](https://clerk.com) and create an application.
2. In the Clerk Dashboard, copy:
   - **Publishable key** → `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - **Secret key** → `CLERK_SECRET_KEY`
3. Add them to `.env.local`.

If you omit Clerk keys, the app still runs; auth UI and protected routes will not work until keys are set.

### Supabase (required for listings)

1. Go to [supabase.com](https://supabase.com) and create a project.
2. In **Project Settings → API**:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Add them to `.env.local`.

## 3. Create database tables

1. In Supabase Dashboard, open **SQL Editor**.
2. Paste the contents of `docs/supabase.sql`.
3. Run the script to create `profiles`, `listings`, `listing_images`, and `project_product_links`.

## 4. Create storage bucket (for gallery images)

1. In Supabase Dashboard, open **Storage**.
2. Create a bucket named **gallery**.
3. Set the bucket to **Public** so listing images can be served via public URLs.

## 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

- **Home:** `/`
- **Explore:** `/explore/projects`, `/explore/products`
- **Add:** `/add/project`, `/add/product`
- **Listing:** `/listing/[id]`
- **Profile:** `/u/[username]`

## 6. Deploy to Vercel

1. Push the repo to GitHub (or connect your Git provider in Vercel).
2. In [vercel.com](https://vercel.com), **Add New Project** and import `archtivy-app` (or the repo containing it).
3. Set **Root Directory** to `archtivy-app` if the app lives in a subfolder.
4. Add environment variables in **Settings → Environment Variables**:
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - `CLERK_SECRET_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy. Vercel will run `npm run build` and `npm start` (or use the default Next.js preset).

## Summary

| Step              | Action |
|-------------------|--------|
| Install           | `npm install` in `archtivy-app` |
| Env               | Copy `.env.local.example` → `.env.local`, add Clerk + Supabase keys |
| DB                | Run `docs/supabase.sql` in Supabase SQL Editor |
| Storage           | Create public buckets **gallery** and **documents** in Supabase Storage |
| Run               | `npm run dev` |
| Deploy            | Connect repo to Vercel, add env vars, deploy |
