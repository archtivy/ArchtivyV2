export const revalidate = 300; // 5-minute ISR cache

import { getPlatformActivityFeed } from "@/lib/db/platformActivity";

export async function GET() {
  const items = await getPlatformActivityFeed();
  return Response.json({ items });
}
