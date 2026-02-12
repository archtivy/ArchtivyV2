/**
 * Image attribute extraction (category, material, color, context) for Matches Engine.
 * Replace with real vision API (e.g. OpenAI GPT-4V, Claude, custom model).
 */

import type { ImageAttrs } from "@/lib/matches/types";

export interface AttributesResult {
  attrs: ImageAttrs;
  confidence: number;
  error?: string;
}

/**
 * Extract structured attributes from an image URL.
 * Stub: returns empty attrs and 0 confidence. Replace with vision API call.
 */
export async function getImageAttributes(imageUrl: string): Promise<AttributesResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          max_tokens: 500,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    "From this image URL (or placeholder), return a JSON object with optional arrays: category (e.g. residential, commercial), material (e.g. concrete, wood), color (e.g. white, grey), context (e.g. interior, exterior). Also return a number 0-100 for confidence. Format: {\"category\":[],\"material\":[],\"color\":[],\"context\":[],\"confidence\":0}",
                },
                { type: "image_url", image_url: { url: imageUrl } },
              ],
            },
          ],
        }),
      });
      if (!res.ok) {
        return { attrs: {}, confidence: 0, error: await res.text() };
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const raw = data.choices?.[0]?.message?.content ?? "";
      const parsed = safeParseAttrs(raw);
      return { attrs: parsed.attrs, confidence: Math.min(100, Math.max(0, parsed.confidence ?? 0)) };
    } catch (e) {
      return { attrs: {}, confidence: 0, error: String(e) };
    }
  }
  return { attrs: {}, confidence: 0 };
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
