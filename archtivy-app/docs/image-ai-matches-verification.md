# Image AI + Matches Verification

After running the admin tool **"Run Image AI Backfill + Rebuild Matches"**, use these checks to verify alt coverage, image_ai, and matches.

## URL debug panel

- Add **`?matchesDebug=1`** to any project or product detail URL to show the matches debug panel (e.g. `https://yoursite.com/projects/my-slug?matchesDebug=1`).
- The panel shows: `rawMatchesCount`, `shownCount`, `minScore`, `limit`, and top raw scores.

---

## 1) Alt coverage per listing

Count images with non-empty alt per listing (listings with any null/empty alt will show `missing_alt_count > 0`):

```sql
SELECT
  li.listing_id,
  COUNT(*) AS total_images,
  COUNT(li.alt) FILTER (WHERE TRIM(COALESCE(li.alt, '')) <> '') AS with_alt,
  COUNT(*) FILTER (WHERE TRIM(COALESCE(li.alt, '')) = '' OR li.alt IS NULL) AS missing_alt_count
FROM listing_images li
GROUP BY li.listing_id
HAVING COUNT(*) FILTER (WHERE TRIM(COALESCE(li.alt, '')) = '' OR li.alt IS NULL) > 0
ORDER BY missing_alt_count DESC;
```

All listings fully covered (no rows with missing alt):

```sql
SELECT listing_id, COUNT(*) AS images, COUNT(alt) FILTER (WHERE TRIM(COALESCE(alt, '')) <> '') AS with_alt
FROM listing_images
GROUP BY listing_id
ORDER BY listing_id;
```

---

## 2) Recent image_ai rows (updated in last 1 hour)

```sql
SELECT image_id, source, listing_id, listing_type, confidence, updated_at
FROM image_ai
WHERE updated_at >= NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 50;
```

---

## 3) Matches count for a project

Replace `'YOUR_PROJECT_ID'` with a real `listings.id` (type = project):

```sql
SELECT project_id, product_id, score, tier, updated_at, run_id
FROM matches
WHERE project_id = 'YOUR_PROJECT_ID'
ORDER BY score DESC
LIMIT 20;
```

Count of matches per project:

```sql
SELECT project_id, COUNT(*) AS match_count
FROM matches
GROUP BY project_id
ORDER BY match_count DESC
LIMIT 20;
```

---

## Env and run

- **OPENAI_API_KEY** must be set (server-side) for alt generation and embeddings.
- Locally: set in `.env.local`.
- Vercel: set in Project → Settings → Environment Variables.
- Optional: **MAX_IMAGES_PER_RUN** (default 200) to cap backfill images per run.
