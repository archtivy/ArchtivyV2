/**
 * Image/text embedding provider for Matches Engine.
 * Uses OpenAI text-embedding-3-small (1536 dims). For images we embed generated alt text.
 */

import { EMBEDDING_DIM } from "@/lib/matches/types";

export interface EmbeddingResult {
  /** Always length EMBEDDING_DIM (1536), float values, L2-normalized. */
  embedding: number[];
  error?: string;
}

const OPENAI_EMBED_MODEL = "text-embedding-3-small";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Retry with exponential backoff (1s, 2s). */
function withRetries<T>(fn: () => Promise<T>, retries: number, baseMs = 1000): Promise<T> {
  return fn().catch((err) => {
    if (retries <= 0) throw err;
    const delay = baseMs * Math.pow(2, 2 - retries);
    console.warn("[getTextEmbedding] retry after", delay, "ms:", err instanceof Error ? err.message : String(err));
    return sleep(delay).then(() => withRetries(fn, retries - 1, baseMs));
  });
}

/**
 * Generate embedding for text using OpenAI text-embedding-3-small (1536 dimensions).
 * Returns L2-normalized vector. Deterministic for same input. Uses 2 retries.
 */
export async function getTextEmbedding(text: string): Promise<EmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    return { embedding: zeroVector(), error: "OPENAI_API_KEY not set" };
  }
  const input = typeof text === "string" ? text.trim() : "";
  if (!input) return { embedding: zeroVector(), error: "text empty" };

  return withRetries(async () => {
    const res = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_EMBED_MODEL,
        input: input.slice(0, 8191),
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI embeddings ${res.status}: ${errText.slice(0, 200)}`);
    }

    const data = (await res.json()) as { data?: { embedding?: number[] }[] };
    const raw = data.data?.[0]?.embedding;
    if (!Array.isArray(raw)) throw new Error("OpenAI embeddings: no embedding in response");
    const embedding = ensureLength(raw);
    return { embedding: normalizeL2(embedding) };
  }, 2);
}

/**
 * Generate embedding for an image. When altText is provided, embeds that text (stable).
 * Otherwise falls back to deterministic fake embedding from URL for backward compat.
 */
export async function getImageEmbedding(imageUrl: string, altText?: string): Promise<EmbeddingResult> {
  const url = typeof imageUrl === "string" ? imageUrl : "";
  if (altText != null && String(altText).trim()) {
    const result = await getTextEmbedding(String(altText).trim());
    if (result.embedding.length === EMBEDDING_DIM) return result;
  }

  if (!url.trim()) return { embedding: zeroVector(), error: "imageUrl empty" };
  try {
    const raw = fakeEmbeddingFromUrl(url);
    const embedding = ensureLength(raw);
    return { embedding: normalizeL2(embedding) };
  } catch (err) {
    console.error("[getImageEmbedding] fallback FAILED:", err);
    return { embedding: zeroVector(), error: String(err) };
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

/** Guarantee number[] of length EMBEDDING_DIM; pad or slice if needed. */
function ensureLength(arr: number[]): number[] {
  if (!Array.isArray(arr)) return zeroVector();
  if (arr.length === EMBEDDING_DIM) return arr as number[];
  if (arr.length > EMBEDDING_DIM) return arr.slice(0, EMBEDDING_DIM) as number[];
  const out: number[] = arr.slice() as number[];
  while (out.length < EMBEDDING_DIM) out.push(0);
  return out;
}

function zeroVector(): number[] {
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
