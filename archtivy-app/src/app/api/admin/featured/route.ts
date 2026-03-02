export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

type AnyResult = { data: unknown; error: { message: string } | null };

async function safeFetch(fn: () => Promise<AnyResult>): Promise<AnyResult> {
  try {
    return await fn();
  } catch {
    return { data: null, error: { message: "Table not found or query failed" } };
  }
}

export async function GET(_req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const supabase = getSupabaseServiceClient();

  const [featuredRes, sponsorRes] = await Promise.all([
    safeFetch(() =>
      supabase
        .from("featured_slots" as never)
        .select("*")
        .order("starts_at" as never, { ascending: false })
        .limit(100) as unknown as Promise<AnyResult>
    ),
    safeFetch(() =>
      supabase
        .from("sponsor_slots" as never)
        .select("*")
        .order("created_at" as never, { ascending: false })
        .limit(100) as unknown as Promise<AnyResult>
    ),
  ]);

  return NextResponse.json({
    featured: featuredRes.data ?? [],
    featured_error: featuredRes.error?.message ?? null,
    sponsors: sponsorRes.data ?? [],
    sponsors_error: sponsorRes.error?.message ?? null,
  });
}

export async function POST(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const supabase = getSupabaseServiceClient();
  const body = await req.json();
  const { table, payload } = body as {
    table: "featured_slots" | "sponsor_slots";
    payload: Record<string, unknown>;
  };

  if (!["featured_slots", "sponsor_slots"].includes(table)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  const { data, error } = (await (supabase
    .from(table as never)
    .insert(payload as never)
    .select() as unknown)) as AnyResult;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function PATCH(req: NextRequest) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const supabase = getSupabaseServiceClient();
  const body = await req.json();
  const { table, id, payload } = body as {
    table: "featured_slots" | "sponsor_slots";
    id: string;
    payload: Record<string, unknown>;
  };

  if (!["featured_slots", "sponsor_slots"].includes(table)) {
    return NextResponse.json({ error: "Invalid table" }, { status: 400 });
  }

  const { data, error } = (await (supabase
    .from(table as never)
    .update(payload as never)
    .eq("id" as never, id)
    .select() as unknown)) as AnyResult;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
