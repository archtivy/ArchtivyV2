import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import { getDocumentById, getDocumentStoragePath } from "@/lib/db/listingDocuments";

const DOCUMENTS_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_DOCS_BUCKET?.trim() || "listing-documents";
const SIGNED_URL_EXPIRES_SEC = 60;

/**
 * GET /api/documents/download?docId=...&listingId=...
 * Requires signed-in user (Clerk). Verifies document belongs to listing, then redirects (302)
 * to a short-lived signed Supabase Storage URL. Use for downloads and preview img src.
 */
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Sign in to download." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const docId = searchParams.get("docId")?.trim();
  const listingId = searchParams.get("listingId")?.trim();

  if (!docId || !listingId) {
    return Response.json(
      { error: "Missing docId or listingId." },
      { status: 400 }
    );
  }

  const { data: doc, error: docError } = await getDocumentById(docId, listingId);
  if (docError) {
    return Response.json({ error: docError }, { status: 400 });
  }
  if (!doc) {
    return Response.json({ error: "Document not found." }, { status: 404 });
  }

  const path = getDocumentStoragePath(doc);
  if (!path) {
    return Response.json(
      { error: "Could not resolve storage path for this document." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseServiceClient();
  const { data: signed, error: signError } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRES_SEC);

  if (signError || !signed?.signedUrl) {
    const msg = signError?.message ?? "Failed to create download link.";
    return Response.json(
      {
        error: msg,
        bucket: DOCUMENTS_BUCKET,
        path,
      },
      { status: msg.toLowerCase().includes("object not found") ? 404 : 500 }
    );
  }

  return Response.redirect(signed.signedUrl, 302);
}
