/**
 * GET /api/explore/intelligence?panel=materials|co_occurrence|countries|brands
 * Returns aggregation data for the Intelligence view.
 */
import { NextRequest } from "next/server";
import {
  getMaterialUsage,
  getMaterialCoOccurrence,
  getProjectsByCountry,
  getBrandPenetration,
} from "@/lib/explore/intelligence";

const PANELS = ["materials", "co_occurrence", "countries", "brands"] as const;
type Panel = (typeof PANELS)[number];

export async function GET(request: NextRequest) {
  const panel = request.nextUrl.searchParams.get("panel") as Panel | null;
  const limitRaw = request.nextUrl.searchParams.get("limit");
  const limit = Math.min(100, Math.max(1, parseInt(limitRaw ?? "20", 10) || 20));

  if (!panel || !PANELS.includes(panel)) {
    return Response.json({ error: `Invalid panel. Use: ${PANELS.join(", ")}` }, { status: 400 });
  }

  let data: unknown;

  switch (panel) {
    case "materials":
      data = await getMaterialUsage(limit);
      break;
    case "co_occurrence":
      data = await getMaterialCoOccurrence(limit);
      break;
    case "countries":
      data = await getProjectsByCountry(limit);
      break;
    case "brands":
      data = await getBrandPenetration(limit);
      break;
  }

  return Response.json({ panel, data });
}
