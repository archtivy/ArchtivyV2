/**
 * Dev-only: run matches computation for one project and log result + top 10 matches.
 * Run: npm run dev:compute:matches
 */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { computeAndUpsertMatchesForProject } from "../src/lib/matches/engine";
import { getSupabaseServiceClient } from "../src/lib/supabaseServer";

const projectId = "50439a12-4982-44a9-9565-5717b522f6fe";

async function main() {
  const result = await computeAndUpsertMatchesForProject(projectId);
  console.log("compute result:", result);

  const sup = getSupabaseServiceClient();
  const { data: rows, error } = await sup
    .from("matches")
    .select("product_id, score, tier, evidence_image_ids, updated_at")
    .eq("project_id", projectId)
    .order("score", { ascending: false })
    .limit(10);

  if (error) {
    console.error("matches query error:", error.message);
    process.exit(1);
  }
  console.log("matches rows (top 10):", rows ?? []);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
