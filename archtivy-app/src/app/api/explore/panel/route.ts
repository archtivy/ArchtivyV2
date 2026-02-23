import { NextRequest } from "next/server";
import { getExplorePanelList } from "@/lib/explore/queries";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const panel = searchParams.get("panel")?.trim() ?? "";
  const city = searchParams.get("city")?.trim() || null;
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "50", 10) || 50));

  const valid: Array<string> = ["designers", "projects", "brands", "products", "categories", "collaboration", "market-leaders", "network-growth", "signals"];
  if (!panel || !valid.includes(panel)) {
    return Response.json({ error: "Invalid panel" }, { status: 400 });
  }

  const canonicalPanel = panel === "market-leaders" || panel === "network-growth" ? "designers" : panel === "signals" ? "categories" : panel;

  const rows = await getExplorePanelList(
    canonicalPanel as "designers" | "projects" | "brands" | "products" | "categories" | "collaboration",
    city,
    limit
  );

  return Response.json({ rows });
}
