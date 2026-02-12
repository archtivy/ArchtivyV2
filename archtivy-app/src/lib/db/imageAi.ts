/**
 * image_ai table access for Matches Engine.
 * pgvector: embedding is vector(1536); store/read via literal string and parseVector.
 */

import { getSupabaseServiceClient } from "@/lib/supabaseServer";
import type { ImageSource } from "@/lib/matches/types";
import { EMBEDDING_DIM } from "@/lib/matches/types";

const TABLE = "image_ai";

const NN_DEFAULT_K = 50;

/**
 * pgvector-compatible literal string for vector(1536). Validates length.
 */
export function toVectorLiteral(embedding: number[]): string {
  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIM) {
    throw new Error(`embedding must be number[] of length ${EMBEDDING_DIM}`);
  }
  return "[" + embedding.map((x) => Number(x)).join(",") + "]";
}

/**
 * Parse DB/pgvector embedding value to number[] of length 1536, or null.
 * Handles: Array, string "[1,2,3]", "(1,2,3)", "1,2,3", "{1,2,3}".
 */
export function parseVector(value: unknown): number[] | null {
  if (Array.isArray(value)) {
    const arr = value.map((x) => Number(x)).filter((n) => !Number.isNaN(n));
    return arr.length === EMBEDDING_DIM ? arr : null;
  }
  if (typeof value !== "string") return null;
  const s = value.trim();
  const stripped = s.replace(/^\[|\]$/g, "").replace(/^\(|\)$/g, "").replace(/^\{|\}$/g, "");
  const parts = stripped.split(",").map((p) => parseFloat(p.trim()));
  const arr = parts.filter((n) => !Number.isNaN(n));
  return arr.length === EMBEDDING_DIM ? arr : null;
}

/** Row returned by match_product_images_by_embedding RPC (pgvector HNSW cosine NN). */
export interface ProductImageMatchRow {
  image_id: string;
  product_id: string;
  attrs: Record<string, unknown>;
  distance: number;
}

/**
 * Nearest-neighbor search over product image embeddings (cosine distance, HNSW index).
 * Returns top K product image_ai rows ordered by embedding <=> query_embedding.
 */
export async function matchProductImagesByEmbedding(
  queryEmbedding: number[],
  k: number = NN_DEFAULT_K
): Promise<ProductImageMatchRow[]> {
  if (queryEmbedding.length !== EMBEDDING_DIM) return [];
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup.rpc("match_product_images_by_embedding", {
    query_embedding: toVectorLiteral(queryEmbedding),
    match_count: Math.max(1, Math.min(500, k)),
  });
  if (error) return [];
  const rows = (data ?? []) as { image_id: string; product_id: string; attrs: unknown; distance: number }[];
  return rows.map((r) => ({
    image_id: r.image_id,
    product_id: r.product_id,
    attrs: (r.attrs as Record<string, unknown>) ?? {},
    distance: Number(r.distance),
  }));
}

export interface ImageAiInsert {
  image_id: string;
  source: ImageSource;
  listing_id?: string | null;
  listing_type?: "project" | "product" | null;
  embedding: number[] | null;
  attrs: Record<string, unknown>;
  confidence: number;
}

export async function upsertImageAi(row: ImageAiInsert): Promise<{ error: string | null }> {
  if (row.source === "product" && row.listing_id == null) {
    return { error: "image_ai insert for product must include listing_id (product id)." };
  }
  const sup = getSupabaseServiceClient();
  const embeddingValue: string | null =
    row.embedding != null && Array.isArray(row.embedding)
      ? toVectorLiteral(row.embedding)
      : null;
  const payload: Record<string, unknown> = {
    image_id: row.image_id,
    source: row.source,
    embedding: embeddingValue,
    attrs: row.attrs ?? {},
    confidence: row.confidence,
    updated_at: new Date().toISOString(),
  };
  if (row.listing_id !== undefined) payload.listing_id = row.listing_id;
  if (row.listing_type !== undefined) payload.listing_type = row.listing_type;
  const { error } = await sup.from(TABLE).upsert(payload, { onConflict: "image_id,source" });
  return { error: error?.message ?? null };
}

export async function getImageAi(
  imageId: string,
  source: ImageSource
): Promise<{ embedding: number[] | null; attrs: Record<string, unknown>; confidence: number } | null> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from(TABLE)
    .select("embedding, attrs, confidence")
    .eq("image_id", imageId)
    .eq("source", source)
    .maybeSingle();
  if (error || !data) return null;
  const raw = data as { embedding: unknown; attrs: unknown; confidence: number };
  const embedding = parseVector(raw.embedding);
  return {
    embedding,
    attrs: (raw.attrs as Record<string, unknown>) ?? {},
    confidence: Number(raw.confidence) || 0,
  };
}

/**
 * Fetch all image_ai rows that have listing_id and non-null embedding (for rebuild aggregation).
 * Returns image_id, listing_id, listing_type, embedding.
 */
export async function getImageAiForRebuild(): Promise<
  { image_id: string; listing_id: string; listing_type: string; embedding: number[] }[]
> {
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from(TABLE)
    .select("image_id, listing_id, listing_type, embedding")
    .not("listing_id", "is", null)
    .not("embedding", "is", null);
  if (error) return [];
  const rows = (data ?? []) as { image_id: string; listing_id: string; listing_type: string; embedding: unknown }[];
  const out: { image_id: string; listing_id: string; listing_type: string; embedding: number[] }[] = [];
  for (const row of rows) {
    const embedding = parseVector(row.embedding);
    if (embedding && (row.listing_type === "project" || row.listing_type === "product")) {
      out.push({
        image_id: row.image_id,
        listing_id: row.listing_id,
        listing_type: row.listing_type,
        embedding,
      });
    }
  }
  return out;
}

/** Fetch all image_ai rows for given image IDs and source. */
export async function getImageAiBatch(
  imageIds: string[],
  source: ImageSource
): Promise<Map<string, { embedding: number[] | null; attrs: Record<string, unknown>; confidence: number }>> {
  const out = new Map<string, { embedding: number[] | null; attrs: Record<string, unknown>; confidence: number }>();
  if (imageIds.length === 0) return out;
  const sup = getSupabaseServiceClient();
  const { data, error } = await sup
    .from(TABLE)
    .select("image_id, embedding, attrs, confidence")
    .eq("source", source)
    .in("image_id", imageIds);
  if (error) return out;
  const rows = (data ?? []) as { image_id: string; embedding: unknown; attrs: unknown; confidence: number }[];
  for (const row of rows) {
    const embedding = parseVector(row.embedding);
    out.set(row.image_id, {
      embedding,
      attrs: (row.attrs as Record<string, unknown>) ?? {},
      confidence: Number(row.confidence) || 0,
    });
  }
  return out;
}
