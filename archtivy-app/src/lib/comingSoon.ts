/**
 * Pre-launch gate.
 *
 * Hides the public site from anyone who is not signed in. Explicit opt-in via
 * the COMING_SOON_MODE env var — OFF unless set to "1" or "true", so merging
 * this changes nothing until the variable is set in Vercel.
 *
 * Deliberately NOT keyed on VERCEL_ENV, for the same reason maintenance mode
 * isn't: environment-keyed gates are permanently on in production and cannot be
 * lifted without a deploy.
 *
 * RESPONSE SHAPE — 503 + Retry-After.
 * A 503 tells search engines the unavailability is temporary and to hold the
 * index. The alternatives are worse: a 200 would make every URL a duplicate of
 * one page, and a redirect to /coming-soon would tell Google every page on the
 * site is a duplicate of that one — the de-indexing mistake documented in
 * maintenance.ts and TECHNICAL_SEO_AUDIT.md C-5.
 *
 * ── WHY MIDDLEWARE REWRITES INSTEAD OF ANSWERING DIRECTLY ───────────────────
 * The gate shows live platform totals, which come from getPlatformTotals() —
 * Supabase service client + unstable_cache, both Node-only. Middleware runs on
 * the edge runtime and cannot call either. So middleware rewrites gated
 * requests to /coming-soon, and that Route Handler (Node) renders the markup
 * and returns the 503. A rewrite keeps the visitor's URL intact and passes the
 * handler's status through, which a redirect would not.
 *
 * This module therefore holds only edge-safe code. `PlatformTotals` is imported
 * as a TYPE ONLY — a value import would pull supabaseServer into the middleware
 * bundle and break the build.
 */

import type { PlatformTotals } from "@/lib/db/platformTotals";

/** Enabled only by explicit env opt-in. */
export function isComingSoonMode(): boolean {
  const raw = process.env.COMING_SOON_MODE?.trim().toLowerCase();
  return raw === "1" || raw === "true";
}

/** Seconds search engines and browsers should wait before retrying. */
export const COMING_SOON_RETRY_AFTER_SECONDS = 3600;

/** Internal path the gate is rendered by. */
export const COMING_SOON_PATH = "/coming-soon";

/**
 * Paths that stay reachable while the gate is up.
 *
 * NOTE ON /api: the maintenance gate passes through ALL of /api. This one does
 * not, and must not. /api/explore/*, /api/activity, /api/search/suggest and
 * /api/track-view have no auth check of their own, so a blanket /api bypass
 * would leave the entire catalogue readable to anyone with the URLs and make
 * the gate cosmetic. Only routes that authenticate themselves, or that must
 * serve unauthenticated machines, are listed here.
 */
export function isComingSoonBypass(pathname: string): boolean {
  // The gate's own route — without this the rewrite target would be gated too.
  if (pathname === COMING_SOON_PATH) return true;

  // Sign-in only. Existing members must be able to get in.
  // /sign-up is deliberately ABSENT: registration is closed until launch, so
  // sign-up attempts fall through to the gate.
  if (pathname === "/sign-in" || pathname.startsWith("/sign-in/")) return true;

  // Admin is self-guarded by requireAdmin() / requireAdminApi() and is
  // unaffected by this gate. Listed explicitly so a future change to the
  // "is signed in" test can never lock admins out of their own panel, and so
  // admin APIs keep returning 401/403 JSON rather than an HTML gate body.
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return true;
  if (pathname.startsWith("/api/admin/")) return true;

  // Webhooks verify their own signatures (svix for Clerk, Stripe for billing)
  // and never carry a Clerk session. Gating these breaks user sync and payment
  // activation silently — no error surfaces anywhere in the app.
  if (pathname.startsWith("/api/webhooks/")) return true;

  // Authenticates with a shared secret, not a session.
  if (pathname === "/api/revalidate") return true;

  // Scheduled jobs. Vercel's cron invoker carries no Clerk session, so without
  // this the gate answers 503 and the job silently never runs — which is
  // exactly what happened: collections-refresh had not executed once between
  // 2026-08-08 and 2026-08-17 despite CRON_SECRET being set, because the gate
  // intercepted every scheduled request before the route could authenticate.
  //
  // Safe by the same rule as /api/revalidate above: every route under /api/cron
  // verifies CRON_SECRET as a bearer token and FAILS CLOSED when the variable
  // is unset, so this bypass exposes nothing to an unauthenticated caller.
  if (pathname.startsWith("/api/cron/")) return true;

  // Crawler and social-scraper assets. Scrapers are unauthenticated, so gating
  // /og breaks every link preview.
  if (pathname === "/robots.txt" || pathname === "/sitemap.xml") return true;
  if (pathname === "/api/indexnow-key") return true;
  if (pathname === "/og" || pathname.startsWith("/og/")) return true;
  if (pathname === "/logo" || pathname.startsWith("/logo/")) return true;
  if (pathname === "/favicon.ico") return true;

  // /_next and static file extensions are already excluded by config.matcher.
  return false;
}

/* ── Markup ────────────────────────────────────────────────────────────────
 *
 * Hand-written HTML with inline CSS rather than a React component, because a
 * page.tsx cannot return a 503 — the same limitation that made /listing/[id]
 * answer 200 while calling notFound(), fixed in 1498d7e.
 *
 * Tokens are taken from the real config, not approximated:
 *   #09090b  zinc-950   — HeroV2's `bg-zinc-950` hero background
 *   #173DED  archtivy.primary (tailwind.config.ts)
 *   Lato via var(--font-lato, 'Lato', system-ui, …) — the exact declaration
 *            used by MaintenanceLanding and the listing cards. The CSS variable
 *            is undefined outside the Next layout, so the 'Lato' → system-ui
 *            fallback applies here, matching what those components already do
 *            when the variable is missing.
 *   Headline serif matches HeroV2's `font-serif`, i.e. Tailwind's default
 *            ui-serif/Georgia stack — no webfont, so no external request.
 */

const SANS = "var(--font-lato, 'Lato', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif)";
const SERIF = "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Grouped count, mirroring formatExactCount() in lib/format/count.ts. */
function formatCount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}

/**
 * Stat strip: same four-figure pattern and the same source as the homepage
 * hero rail, so the two cannot disagree.
 *
 * Zero-valued stats are dropped and an all-zero set renders nothing at all —
 * matching HeroStatsRail, which would rather show no rail than a row of zeros.
 */
function statStrip(totals: PlatformTotals): string {
  const stats = [
    { label: "Projects", value: totals.projects },
    { label: "Products", value: totals.products },
    { label: "Designers", value: totals.designers },
    { label: "Countries", value: totals.countries },
  ].filter((s) => s.value > 0);

  if (stats.length === 0) return "";

  const items = stats
    .map(
      (s) => `<div class="stat">
        <dd class="stat-v">${formatCount(s.value)}</dd>
        <dt class="stat-l">${escapeHtml(s.label)}</dt>
      </div>`
    )
    .join("");

  return `<dl class="stats">${items}</dl>`;
}

export function comingSoonHtml(totals: PlatformTotals): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Archtivy — The intelligence layer of architecture</title>
<meta name="description" content="Archtivy is being rebuilt. Existing members can sign in to keep browsing.">
<meta name="theme-color" content="#09090b">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    background: #09090b;
    color: #fff;
    font-family: ${SANS};
    -webkit-font-smoothing: antialiased;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
  .wrap { width: 100%; max-width: 1440px; margin: 0 auto; padding: 0 24px; }
  @media (min-width: 640px) { .wrap { padding: 0 40px; } }

  /* ── Top bar ── */
  header { padding: 26px 0; }
  .bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
  .mark {
    font-size: 19px; font-weight: 700; letter-spacing: .01em;
    color: #fff; text-decoration: none;
  }
  .login {
    display: inline-flex; align-items: center;
    border: 1px solid rgba(255,255,255,.22);
    background: rgba(255,255,255,.07);
    color: rgba(255,255,255,.92);
    font-size: 13px; font-weight: 500;
    padding: 7px 16px; border-radius: 999px;
    text-decoration: none; transition: background .15s ease, border-color .15s ease;
  }
  .login:hover { background: rgba(255,255,255,.14); border-color: rgba(255,255,255,.4); }
  .login:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

  /* ── Centre ── */
  main { flex: 1; display: flex; align-items: center; padding: 56px 0; }
  /* max-width lives on the h1, NOT on a wrapper: the ch unit resolves against
     the element's own font-size, so 20ch on a 16px wrapper is ~160px and breaks
     the headline one word per line. Here it resolves against the clamped
     display size, giving the intended 2-3 lines. */
  h1 {
    font-family: ${SERIF};
    font-weight: 400;
    font-size: clamp(32px, 5.4vw, 58px);
    line-height: 1.1;
    letter-spacing: -.02em;
    margin: 0;
    max-width: 21ch;
  }
  .sub {
    margin: 22px 0 0;
    max-width: 46ch;
    font-size: 17px;
    line-height: 1.65;
    color: rgba(255,255,255,.75);
  }
  .members {
    margin: 26px 0 0;
    max-width: 46ch;
    font-size: 13.5px;
    line-height: 1.6;
    color: rgba(255,255,255,.5);
  }
  .members a {
    color: rgba(255,255,255,.85);
    text-decoration: underline;
    text-decoration-color: rgba(255,255,255,.3);
    text-underline-offset: 4px;
  }
  .members a:hover { color: #fff; text-decoration-color: rgba(255,255,255,.7); }
  .members a:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

  /* ── Stat strip ── */
  footer { padding: 0 0 40px; }
  .stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 26px 20px;
    margin: 0;
    padding-top: 30px;
    border-top: 1px solid rgba(255,255,255,.12);
  }
  @media (min-width: 640px) { .stats { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
  .stat { display: flex; flex-direction: column; gap: 5px; }
  .stat-v {
    margin: 0;
    font-size: 27px; font-weight: 600; line-height: 1;
    letter-spacing: -.02em;
    font-variant-numeric: tabular-nums;
  }
  .stat-l {
    font-size: 12px; font-weight: 500;
    letter-spacing: .04em;
    color: rgba(255,255,255,.55);
  }
</style>
</head>
<body>
  <header>
    <div class="wrap bar">
      <a class="mark" href="/">archtivy</a>
      <a class="login" href="/sign-in">Log in</a>
    </div>
  </header>

  <main>
    <div class="wrap">
      <div class="copy">
        <h1>The world&rsquo;s architecture knowledge graph is getting rebuilt.</h1>
      </div>
      <p class="sub">
        We&rsquo;re rebuilding how architectural work is documented, how products are
        credited, and how professionals find each other across cities.
      </p>
      <p class="members">
        Already a member? <a href="/sign-in">Sign in</a> to keep browsing.
      </p>
    </div>
  </main>

  <footer>
    <div class="wrap">
      ${statStrip(totals)}
    </div>
  </footer>
</body>
</html>`;
}

/**
 * 503 Service Unavailable.
 *
 * NO `X-Robots-Tag: noindex` here — a deliberate difference from
 * maintenanceResponse(). noindex asks search engines to REMOVE the URL, while
 * 503 asks them to keep it and retry; sending both is contradictory and risks
 * the de-indexing this response shape was chosen to avoid.
 *
 * `Cache-Control: no-store` matters more than it looks: a cached 503 at the CDN
 * would keep serving the gate to visitors after COMING_SOON_MODE is switched
 * off at launch.
 */
export function comingSoonResponse(totals: PlatformTotals): Response {
  return new Response(comingSoonHtml(totals), {
    status: 503,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": String(COMING_SOON_RETRY_AFTER_SECONDS),
      "Cache-Control": "no-store",
    },
  });
}
