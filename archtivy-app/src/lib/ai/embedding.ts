/**
 * Text embeddings — OpenAI text-embedding-3-small, 1536 dims, L2-normalised.
 *
 * ── THE SYNTHETIC-EMBEDDING BUG THIS FILE USED TO CONTAIN ───────────────────
 * There was a `getImageEmbedding(url, altText?)` here whose documented
 * behaviour was: embed the alt text if there is one, otherwise "fall back to
 * deterministic fake embedding from URL for backward compat". The fallback
 * was two sine waves seeded by a hash of the URL string.
 *
 * It was not a rare path. Sampling 1000 of the 1830 live `image_ai` rows on
 * 2026-09-02, 845 of them are that sine wave — smooth, monotonic, and carrying
 * no information about the image whatsoever. They were written into a
 * `vector(1536)` column behind two HNSW cosine indexes, so every nearest-
 * neighbour query has been ranking real images against noise, and the noise
 * clusters (all URLs from one bucket hash to nearby values) so it out-ranks
 * genuine neighbours. The 155 real ones were embeddings of the SEO alt
 * sentence, which is a description, not an appearance.
 *
 * A missing vector is honest and a caller can handle it. A plausible-looking
 * fake vector cannot be detected downstream and silently corrupts the index.
 * So the fallback is deleted rather than repaired, and failures return null.
 */

import { EMBEDDING_DIM } from "@/lib/matches/types";

export interface EmbeddingResult {
  /** Length EMBEDDING_DIM and L2-normalised, or null when it could not be made. */
  embedding: number[] | null;
  error?: string;
}

const OPENAI_EMBED_MODEL = "text-embedding-3-small";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Embed text. Deterministic for the same input, so re-running a batch over
 * unchanged signatures produces unchanged vectors.
 */
export async function getTextEmbedding(
  text: string,
  { retries = 2 }: { retries?: number } = {}
): Promise<EmbeddingResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) return { embedding: null, error: "OPENAI_API_KEY not set" };

  const input = typeof text === "string" ? text.trim() : "";
  if (!input) return { embedding: null, error: "text empty" };

  let lastError = "";
  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await sleep(1000 * 2 ** (attempt - 1));

    let res: Response;
    try {
      res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: OPENAI_EMBED_MODEL, input: input.slice(0, 8191) }),
      });
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
      continue;
    }

    if (!res.ok) {
      lastError = `OpenAI embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`;
      if (res.status !== 429 && res.status < 500) break;
      continue;
    }

    const data = (await res.json()) as { data?: { embedding?: number[] }[] };
    const raw = data.data?.[0]?.embedding;
    if (!Array.isArray(raw) || raw.length !== EMBEDDING_DIM) {
      lastError = `expected ${EMBEDDING_DIM} dims, got ${Array.isArray(raw) ? raw.length : "none"}`;
      continue;
    }
    return { embedding: normalizeL2(raw.map(Number)) };
  }

  return { embedding: null, error: lastError || "unknown failure" };
}

/**
 * Embed a visual signature from lib/ai/visualSignature.
 *
 * A separate name from getTextEmbedding purely so the call sites read as what
 * they are; the vectors share one space, which is what makes a room signature
 * and a product signature comparable at all.
 */
export async function getSignatureEmbedding(signature: string): Promise<EmbeddingResult> {
  return getTextEmbedding(signature);
}

/** For cosine similarity. pgvector's `<=>` wants unit vectors to behave. */
export function normalizeL2(v: number[]): number[] {
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => Number(x) / norm);
}
