/**
 * Image attribute extraction (category, material, color, context) and alt text for Matches Engine.
 * Uses OpenAI gpt-4o-mini vision (OPENAI_API_KEY).
 */

import type { ImageAttrs } from "@/lib/matches/types";

export interface AttributesResult {
  attrs: ImageAttrs;
  confidence: number;
  error?: string;
}

export interface AltTextResult {
  alt: string;
  confidence: number;
  error?: string;
}

const ALT_MIN_CHARS = 80;
const ALT_MAX_CHARS = 180;
const OPENAI_VISION_MODEL = "gpt-4o-mini";

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Retry with exponential backoff (1s, 2s, 4s...). */
function withRetries<T>(fn: () => Promise<T>, retries: number, baseMs = 1000): Promise<T> {
  return fn().catch((err) => {
    if (retries <= 0) throw err;
    const delay = baseMs * Math.pow(2, 2 - retries);
    console.warn("[getImageAltText] retry after", delay, "ms:", err instanceof Error ? err.message : String(err));
    return sleep(delay).then(() => withRetries(fn, retries - 1, baseMs));
  });
}

/**
 * Generate short, objective, SEO-safe alt text from an image URL using OpenAI vision.
 * English, 80–180 chars; material/color/form/object type; no mood or marketing words.
 * Uses 2 retries with exponential backoff.
 */
export async function getImageAltText(imageUrl: string): Promise<AltTextResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    return { alt: "", confidence: 0, error: "OPENAI_API_KEY not set" };
  }
  const url = typeof imageUrl === "string" ? imageUrl.trim() : "";
  if (!url) return { alt: "", confidence: 0, error: "imageUrl empty" };

  return withRetries(async () => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_VISION_MODEL,
        max_tokens: 150,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Describe this image in one short sentence in English for use as image alt text. Rules: factual and objective only; include material, color, form, or object type when visible; length between ${ALT_MIN_CHARS} and ${ALT_MAX_CHARS} characters; SEO-safe; avoid mood words and marketing adjectives (e.g. no "beautiful", "stunning"). Reply with ONLY the alt text, no quotes or explanation.`,
              },
              { type: "image_url", image_url: { url } },
            ],
          },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { alt: "", confidence: 0, error: `OpenAI ${res.status}: ${errText.slice(0, 200)}` };
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = (data.choices?.[0]?.message?.content ?? "").trim();
    const alt = raw.length > ALT_MAX_CHARS ? raw.slice(0, ALT_MAX_CHARS) : raw;
    const confidence = alt.length > 0 ? 85 : 0;
    return { alt, confidence };
  }, 2);
}

/**
 * Extract structured attributes from an image URL (OpenAI gpt-4o-mini vision).
 * Returns category, material, color, context arrays and confidence. Uses 2 retries with exponential backoff.
 */
export async function getImageAttributes(imageUrl: string): Promise<AttributesResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) return { attrs: {}, confidence: 0 };

  return withRetries(async () => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_VISION_MODEL,
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  "From this image, return a JSON object with optional arrays: category (e.g. residential, commercial), material (e.g. concrete, wood), color (e.g. white, grey), context (e.g. interior, exterior). Also return a number 0-100 for confidence. Format: {\"category\":[],\"material\":[],\"color\":[],\"context\":[],\"confidence\":0}",
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });
    if (!res.ok) return { attrs: {}, confidence: 0, error: await res.text() };
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = safeParseAttrs(raw);
    return { attrs: parsed.attrs, confidence: Math.min(100, Math.max(0, parsed.confidence ?? 0)) };
  }, 2).catch((e) => ({ attrs: {}, confidence: 0, error: String(e) }));
}

function safeParseAttrs(raw: string): { attrs: ImageAttrs; confidence?: number } {
  try {
    const json = raw.replace(/```json?\s*|\s*```/g, "").trim();
    const o = JSON.parse(json) as Record<string, unknown>;
    const attrs: ImageAttrs = {};
    for (const k of ["category", "material", "color", "context"]) {
      if (Array.isArray(o[k])) attrs[k] = (o[k] as unknown[]).map(String).filter(Boolean);
    }
    const confidence = typeof o.confidence === "number" ? o.confidence : undefined;
    return { attrs, confidence };
  } catch {
    return { attrs: {} };
  }
}
