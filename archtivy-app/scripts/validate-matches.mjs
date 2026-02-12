/**
 * Validate Matches Engine: run pipeline + matching for one project and a few products.
 *
 * Prerequisites:
 * 1. Run docs/matches-engine-migration.sql in Supabase SQL Editor (and enable pgvector).
 * 2. Start the app: npm run dev
 *
 * Usage:
 *   node scripts/validate-matches.mjs
 *   node scripts/validate-matches.mjs <projectId> <productId1> <productId2>
 *
 * Or with curl:
 *   curl -s -X POST http://localhost:3000/api/admin/matches-test -H "Content-Type: application/json" -d '{}' | jq
 */

const base = process.env.API_BASE ?? "http://localhost:3000";
const args = process.argv.slice(2);
const body =
  args.length >= 1
    ? { projectId: args[0], productIds: args.slice(1) }
    : {};

async function main() {
  const res = await fetch(`${base}/api/admin/matches-test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) {
    console.error("Error:", res.status, json);
    process.exit(1);
  }
  console.log(JSON.stringify(json, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
