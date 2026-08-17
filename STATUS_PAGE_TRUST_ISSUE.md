# `/status` reports "All systems operational" without checking anything

**Opened:** 2026-08-08 · **Status:** open, not scheduled · **Not part of** the Dashboard /
Publish Flow / Pinpoint Tagging work — filed separately at the request of that brief's review.

**Severity:** low urgency, high trust cost. Nothing is broken; the page is confidently wrong
whenever anything *is* broken.

---

## What it does today

`src/app/(public)/status/page.tsx` renders from a hardcoded array:

```ts
const SERVICES = [
  { name: "Web application",     status: "operational" },
  { name: "API",                 status: "operational" },
  { name: "File storage",        status: "operational" },
  { name: "Search and indexing", status: "operational" },
  { name: "Authentication",      status: "operational" },
  { name: "Database",            status: "operational" },
];
```

Every value is a string literal. There is **no health-check infrastructure anywhere in the
codebase** — no `/api/health`, no probe, no uptime source, no `health_checks` or
`system_status` table. The page computes `allOperational` from the constants and renders a
green banner.

## Why it matters

The page cannot report an outage. During a total Supabase failure it would still render
"All systems operational" in green — while every other page on the site 500s.

This is the *already-shipped* instance of the exact problem the Dashboard brief guards against
for its Finance section: a surface that presents fabricated values styled as real
measurements. A status page is worse than a dashboard metric, because its entire purpose is to
be trusted during an incident, and it is public.

Company Bible, "Trust Before Growth": a reader who checks `/status` during an outage and sees
green learns that Archtivy's status page cannot be relied on. That is not recoverable by later
making it accurate.

## Options, roughly by cost

1. **Remove the page** (cheapest, honest). Delete the route, drop the footer link. No claim is
   better than a false one.
2. **Reduce it to what is true.** Keep the page, drop the six fabricated service rows, and
   state plainly that automated status reporting isn't live yet with a contact route for
   incident reports.
3. **Make it real** (own scoped feature, not a side effect of any other work). A `/api/health`
   route that actually probes: a trivial Supabase query, a storage HEAD, a Clerk JWKS fetch;
   a scheduled writer into a `health_checks` table so the page shows history rather than a
   single instantaneous read; cached briefly so the page is not itself a load source.

Option 2 is the smallest change that removes the false claim, and does not block option 3
later. Option 1 is defensible if the page has no traffic.

## Related

- `DATA_INTEGRITY_LOG.md` — the tracked list for schema/row-level defects. This one is a
  product-surface honesty issue rather than a data defect, hence its own note.
- The Dashboard brief's System Status panel (Image 4) has the same requirement and the same
  missing infrastructure. Whichever option is chosen here should decide that panel too, rather
  than building a second fabricated status display in the admin area.
