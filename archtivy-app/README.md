# Archtivy App

Next.js 14+ (App Router) app with TypeScript, Tailwind CSS, Clerk (auth), and Supabase (DB). Minimal MVP for listings and profiles.

## Quick start

```bash
cd archtivy-app
npm install
cp .env.local.example .env.local
# Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local
# Run docs/supabase.sql in Supabase SQL Editor
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Full setup

See **[docs/setup.md](docs/setup.md)** for:

- Clerk keys (optional for local run)
- Supabase keys and table creation
- Running locally
- Deploying to Vercel

## Commands

| Command       | Description              |
|---------------|--------------------------|
| `npm run dev` | Start dev server         |
| `npm run build` | Build for production   |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint               |

## Files created

```
archtivy-app/
├── .env.local.example
├── .eslintrc.json
├── .gitignore
├── next.config.mjs
├── package.json
├── postcss.config.mjs
├── tailwind.config.ts
├── tsconfig.json
├── next-env.d.ts
├── docs/
│   ├── setup.md          # Setup steps (Clerk, Supabase, run, deploy)
│   └── supabase.sql      # SQL to create tables
├── src/
│   ├── app/
│   │   ├── actions/
│   │   │   └── listings.ts       # Server actions: createProject, createProduct
│   │   ├── add/
│   │   │   ├── project/
│   │   │   │   ├── page.tsx
│   │   │   │   └── AddProjectForm.tsx
│   │   │   └── product/
│   │   │       ├── page.tsx
│   │   │       └── AddProductForm.tsx
│   │   ├── explore/
│   │   │   ├── projects/page.tsx
│   │   │   └── products/page.tsx
│   │   ├── listing/[id]/page.tsx
│   │   ├── u/[username]/page.tsx  # Public profile placeholder
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx               # Home
│   ├── lib/
│   │   └── supabaseClient.ts      # Supabase client (env: NEXT_PUBLIC_SUPABASE_*)
│   ├── types/
│   │   └── db.ts                  # Profile, Listing, etc.
│   └── middleware.ts               # Clerk (optional when keys set)
```

## Pages

| Route                | Description              |
|----------------------|--------------------------|
| `/`                  | Home                     |
| `/explore/projects`  | List projects            |
| `/explore/products`  | List products            |
| `/add/project`       | Create project (form)   |
| `/add/product`       | Create product (form)   |
| `/listing/[id]`     | View single listing     |
| `/u/[username]`     | Public profile (placeholder) |

## Env vars

- **Supabase:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (required for listings)
- **Clerk:** `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` (optional; app runs without them)
