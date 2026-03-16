/**
 * GET /api/explore/graph?seed=<id>&type=<project|product|brand|designer>
 * Returns { nodes, edges } for the relationship explorer.
 * Without seed: returns overview graph of top connected entities.
 */
import { NextRequest } from "next/server";
import { buildGraphFromSeed, buildOverviewGraph } from "@/lib/explore/graph";

export async function GET(request: NextRequest) {
  const seed = request.nextUrl.searchParams.get("seed")?.trim();
  const type = request.nextUrl.searchParams.get("type")?.trim() as
    | "project"
    | "product"
    | "brand"
    | "designer"
    | null;

  if (seed && type) {
    const valid = ["project", "product", "brand", "designer"];
    if (!valid.includes(type)) {
      return Response.json({ error: "Invalid type" }, { status: 400 });
    }
    const data = await buildGraphFromSeed(seed, type);
    return Response.json(data);
  }

  const data = await buildOverviewGraph(30);
  return Response.json(data);
}
