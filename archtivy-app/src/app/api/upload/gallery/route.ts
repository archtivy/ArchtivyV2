/**
 * POST /api/upload/gallery
 *
 * Generates a signed Supabase Storage upload URL so the client can upload
 * an image directly to Supabase (bypassing Vercel's 4.5MB body limit).
 *
 * Request body (JSON):
 *   { fileName: string, contentType: string }
 *
 * Response (JSON):
 *   { token: string, path: string, fullUploadUrl: string, publicUrl: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";

const BUCKET = "gallery";

const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const EXTENSION_MAP: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export async function POST(request: NextRequest) {
  // Auth: require signed-in user (public) or admin
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { fileName?: string; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { fileName, contentType } = body;

  if (!fileName || typeof fileName !== "string") {
    return NextResponse.json({ error: "fileName is required" }, { status: 400 });
  }
  if (!contentType || !ALLOWED_TYPES.has(contentType)) {
    return NextResponse.json(
      { error: `Unsupported content type: ${contentType}. Use JPEG, PNG, WebP or GIF.` },
      { status: 400 }
    );
  }

  const ext = EXTENSION_MAP[contentType] ?? "jpg";
  const path = `gallery/${crypto.randomUUID()}.${ext}`;

  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);

  if (error) {
    console.error("[upload/gallery] signed URL error:", error.message);
    return NextResponse.json(
      { error: "Failed to create upload URL" },
      { status: 500 }
    );
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    token: data.token,
    path,
    fullUploadUrl: data.signedUrl,
    publicUrl,
  });
}
