import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * TEMP debug page: proof that NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is loaded.
 * Remove this route when done debugging (delete src/app/debug/ folder).
 *
 * Development-only. robots.txt disallows /debug/, but Disallow prevents crawling,
 * not indexing — a linked URL can still be indexed URL-only. This returns a real
 * 404 outside development. See TECHNICAL_SEO_AUDIT.md C-11.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DebugEnvPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const raw = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
  const tokenExists = Boolean(raw);
  const tokenPrefix = raw ? raw.slice(0, 3) : "";

  return (
    <div className="min-h-screen bg-gray-100 p-6 font-mono text-sm">
      <h1 className="mb-4 text-lg font-semibold">Debug: Env (temporary)</h1>
      <pre className="rounded border border-gray-300 bg-white p-4">
        {JSON.stringify(
          {
            tokenExists,
            tokenPrefix: tokenPrefix || "(empty)",
          },
          null,
          2
        )}
      </pre>
      <p className="mt-2 text-gray-600">
        If tokenExists is false, ensure .env.local has NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN and restart the dev server.
      </p>
    </div>
  );
}
