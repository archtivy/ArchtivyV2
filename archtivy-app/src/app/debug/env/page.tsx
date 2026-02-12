/**
 * TEMP debug page: proof that NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN is loaded.
 * Remove this route when done debugging (delete src/app/debug/ folder).
 */
export default function DebugEnvPage() {
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
