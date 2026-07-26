/**
 * IndexNow — fire-and-forget notifications to search engines
 * when a listing becomes publicly visible (approved/created).
 *
 * Environment variables:
 *   INDEXNOW_KEY          — your IndexNow API key (required to enable IndexNow)
 *   NEXT_PUBLIC_SITE_URL  — canonical site URL (already used elsewhere)
 *
 * If INDEXNOW_KEY is not set, IndexNow calls are silently skipped — which is the
 * current production state, so this module is presently a no-op.
 */

import { getBaseUrl } from "@/lib/canonical";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Notify search engines that one or more URLs have changed.
 * Calls IndexNow (Bing/Yandex/others). Fire-and-forget — errors are logged, never thrown.
 *
 * Google has no equivalent push API: the sitemap-ping endpoint
 * (google.com/ping?sitemap=) was retired in 2023 and now 404s, so calling it gave a
 * false impression that Google was being notified. Google discovery comes from
 * sitemap.xml being registered in Search Console. See TECHNICAL_SEO_AUDIT.md C-12.
 */
export async function notifySearchEngines(paths: string[]): Promise<void> {
  const baseUrl = getBaseUrl();
  if (!baseUrl || baseUrl.includes("localhost")) return;

  const urls = paths.map((p) => `${baseUrl}${p.startsWith("/") ? p : `/${p}`}`);

  await Promise.allSettled([submitIndexNow(baseUrl, urls)]);
}

async function submitIndexNow(baseUrl: string, urls: string[]): Promise<void> {
  const key = process.env.INDEXNOW_KEY;
  if (!key || urls.length === 0) return;

  try {
    const host = new URL(baseUrl).host;
    const res = await fetch(INDEXNOW_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        host,
        key,
        keyLocation: `${baseUrl}/api/indexnow-key`,
        urlList: urls.slice(0, 10000),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) {
      console.warn(`[IndexNow] ${res.status} ${res.statusText} for ${urls.length} URLs`);
    }
  } catch (err) {
    console.warn("[IndexNow] failed:", err instanceof Error ? err.message : err);
  }
}

