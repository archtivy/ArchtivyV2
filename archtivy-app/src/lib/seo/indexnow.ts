/**
 * IndexNow + Sitemap Ping — fire-and-forget notifications to search engines
 * when a listing becomes publicly visible (approved/created).
 *
 * Environment variables:
 *   INDEXNOW_KEY          — your IndexNow API key (required to enable IndexNow)
 *   NEXT_PUBLIC_SITE_URL  — canonical site URL (already used elsewhere)
 *
 * If INDEXNOW_KEY is not set, IndexNow calls are silently skipped.
 * Sitemap pings always fire when a valid base URL is available.
 */

import { getBaseUrl } from "@/lib/canonical";

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

/**
 * Notify search engines that one or more URLs have changed.
 * Calls IndexNow (Bing/Yandex/others) and pings Google + Bing sitemaps.
 * All calls are fire-and-forget — errors are logged but never thrown.
 */
export async function notifySearchEngines(paths: string[]): Promise<void> {
  const baseUrl = getBaseUrl();
  if (!baseUrl || baseUrl.includes("localhost")) return;

  const urls = paths.map((p) => `${baseUrl}${p.startsWith("/") ? p : `/${p}`}`);

  await Promise.allSettled([
    submitIndexNow(baseUrl, urls),
    pingSitemap(baseUrl),
  ]);
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

async function pingSitemap(baseUrl: string): Promise<void> {
  const sitemapUrl = encodeURIComponent(`${baseUrl}/sitemap.xml`);
  const endpoints = [
    `https://www.google.com/ping?sitemap=${sitemapUrl}`,
    `https://www.bing.com/ping?sitemap=${sitemapUrl}`,
  ];

  await Promise.allSettled(
    endpoints.map(async (url) => {
      try {
        await fetch(url, { method: "GET", signal: AbortSignal.timeout(10000) });
      } catch (err) {
        console.warn(`[SitemapPing] failed for ${url}:`, err instanceof Error ? err.message : err);
      }
    })
  );
}
