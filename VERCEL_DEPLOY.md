# Vercel deployment

This repo has a **monorepo-like layout**: the Next.js app lives in `archtivy-app/`, not at the repo root.

## Required: set Root Directory in Vercel

1. In the [Vercel dashboard](https://vercel.com/dashboard), open your project.
2. Go to **Settings** → **General** → **Root Directory**.
3. Set **Root Directory** to: **`archtivy-app`** (no leading/trailing slash).
4. Save. Redeploy.

If Root Directory is left at the repo root (`.`), Vercel will not find a `package.json` with `next` and you will see:

> No Next.js version detected. Make sure your package.json has 'next' in dependencies or devDependencies. Also check your Root Directory setting.

## Correct layout

- **Repo root**: `ArchtivyV2/` — static HTML, assets, and this doc. No `package.json` here.
- **Next.js app**: `ArchtivyV2/archtivy-app/` — has `package.json` with `next`, `next.config.mjs`, `src/`. This is the Vercel **Root Directory**.

## vercel.json

- `vercel.json` at **repo root** is only schema; it is ignored when Root Directory is `archtivy-app`.
- `archtivy-app/vercel.json` is used when Root Directory is `archtivy-app` and explicitly sets the Next.js framework.
