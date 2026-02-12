/**
 * Image embedding provider for Matches Engine.
 * Replace with real vision/embedding API (e.g. OpenAI CLIP, custom model).
 */

import { EMBEDDING_DIM } from "@/lib/matches/types";

export interface EmbeddingResult {
  /** Always length 1536, float values. */
  embedding: number[];
  error?: string;
}

/**
 * Generate embedding vector for an image URL.
 * Always returns a number[] of length 1536 (float values). No null/undefined.
 * DEV: deterministic fake embedding from URL hash. Production: plug in real API.
 */
export async function getImageEmbedding(imageUrl: string): Promise<EmbeddingResult> {
  const openaiKey = process.env.OPENAI_API_KEY;
  const hasOpenAI = typeof openaiKey === "string" && openaiKey.trim().length > 0;
  console.log("[getImageEmbedding] provider: fake (URL hash). OPENAI_API_KEY present:", !!hasOpenAI, "length:", openaiKey?.length ?? 0);
  if (!hasOpenAI) {
    console.log("[getImageEmbedding] no external API key used; using deterministic fake embedding.");
  }

  const url = typeof imageUrl === "string" ? imageUrl : "";
  if (!url.trim()) {
    console.error("[getImageEmbedding] imageUrl empty or not string, will use zero vector.");
  }
  if (!url.startsWith("http")) {
    console.warn("[getImageEmbedding] image_url is not a full URL (expected https):", url.slice(0, 80));
  }

  try {
    const raw = fakeEmbeddingFromUrl(url);
    const embedding = ensureLength1536(raw);
    console.log("[getImageEmbedding] embedding length:", embedding.length);
    return { embedding };
  } catch (err) {
    console.error("[getImageEmbedding] embedding generation FAILED:", err);
    throw err;
  }
}

/** Deterministic pseudo-embedding from URL (stable for same URL). L2-normalized for cosine. */
function fakeEmbeddingFromUrl(imageUrl: string): number[] {
  const h = simpleHash(imageUrl);
  const v: number[] = Array.from({ length: EMBEDDING_DIM }, (_, i) =>
    Math.sin((h + i * 1.1) * 0.001) * 0.5 + Math.sin((h * 0.7 + i) * 0.002) * 0.3
  );
  return normalizeL2(v);
}

/** Guarantee number[] of length 1536; pad or slice if needed. */
function ensureLength1536(arr: number[]): number[] {
  if (!Array.isArray(arr)) return zeroVector1536();
  if (arr.length === EMBEDDING_DIM) return arr as number[];
  if (arr.length > EMBEDDING_DIM) return arr.slice(0, EMBEDDING_DIM) as number[];
  const out: number[] = arr.slice() as number[];
  while (out.length < EMBEDDING_DIM) out.push(0);
  return out;
}

function zeroVector1536(): number[] {
  return Array.from({ length: EMBEDDING_DIM }, () => 0);
}

function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

/** Use when your embedding API returns unnormalized vectors (for cosine similarity). */
export function normalizeL2(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => Number(x) / norm);
}
