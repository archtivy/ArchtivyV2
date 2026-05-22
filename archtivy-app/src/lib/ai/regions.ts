/**
 * AI image region detection — identifies product-like objects and their positions.
 * Uses OpenAI gpt-4o vision via raw fetch (matches existing codebase pattern).
 *
 * V1 only detects high-value product categories:
 * seating, table, lighting, bed, sink, faucet, rug, shelving
 *
 * Returns percentage-based coordinates for responsive rendering.
 */

/** Object types worth detecting for product discovery. */
const VALID_OBJECT_TYPES = new Set([
  "seating",    // sofa, chair, stool, bench, armchair
  "table",      // dining table, coffee table, side table, desk
  "lighting",   // pendant, floor lamp, table lamp, sconce, chandelier
  "bed",        // bed frame, mattress setup
  "sink",       // bathroom sink, kitchen sink
  "faucet",     // faucet, tap, mixer
  "rug",        // rug, carpet, mat
  "shelving",   // shelf, bookshelf, wall unit, storage unit
]);

export interface DetectedRegion {
  label: string;
  object_type: string;
  keywords: string[];
  confidence: number;
  x: number;       // center x, 0-100%
  y: number;       // center y, 0-100%
  width: number;   // bounding box width, 0-100%
  height: number;  // bounding box height, 0-100%
}

export interface RegionDetectionResult {
  scene_summary: string;
  objects: DetectedRegion[];
}

const SYSTEM_PROMPT = `You are an expert architectural product identifier.
Given an interior/exterior photograph from an architecture project, identify the most prominent product-like objects that a designer or architect might want to specify or purchase.

RULES:
- Return ONLY objects that are likely purchasable products (furniture, fixtures, lighting, rugs, shelving)
- Maximum 5 objects per image
- Ignore: walls, floors, ceilings, windows, shadows, generic decor, plants, art (unless clearly a product)
- Each object must have a confidence score (0.0-1.0) — only return objects with confidence >= 0.6
- Coordinates are percentage-based (0-100) relative to the full image
- x, y = center of the object; width, height = approximate bounding box

VALID object_type values (use ONLY these):
seating, table, lighting, bed, sink, faucet, rug, shelving

Return JSON only, no markdown, no explanation.

Schema:
{
  "scene_summary": "Brief architectural description of the scene (1 sentence)",
  "objects": [
    {
      "label": "curved modular sofa",
      "object_type": "seating",
      "keywords": ["curved", "modular", "beige", "low-profile", "upholstered"],
      "confidence": 0.93,
      "x": 45,
      "y": 65,
      "width": 30,
      "height": 20
    }
  ]
}`;

/**
 * Detect product-like objects in an image using OpenAI Vision.
 * Returns curated, high-confidence detections only.
 */
export async function detectImageRegions(
  imageUrl: string,
  listingType?: "project" | "product"
): Promise<RegionDetectionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey?.trim()) {
    console.error("[regions] OPENAI_API_KEY not set");
    return { scene_summary: "", objects: [] };
  }

  const contextHint = listingType === "product"
    ? "This is a product photo. Identify the main product and any complementary items visible."
    : "This is an architectural project photo. Identify specifiable products visible in the scene.";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      max_tokens: 1000,
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: contextHint },
            { type: "image_url", image_url: { url: imageUrl, detail: "high" } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[regions] OpenAI error:", res.status, errText.slice(0, 200));
    return { scene_summary: "", objects: [] };
  }

  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const raw = (data.choices?.[0]?.message?.content ?? "").trim();

  let parsed: RegionDetectionResult;
  try {
    const clean = raw.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    parsed = JSON.parse(clean);
  } catch {
    console.error("[regions] Failed to parse AI response:", raw.slice(0, 200));
    return { scene_summary: "", objects: [] };
  }

  // Filter and validate
  const validated = (parsed.objects ?? [])
    .filter((obj) => {
      if (!VALID_OBJECT_TYPES.has(obj.object_type)) return false;
      if (obj.confidence < 0.6) return false;
      if (obj.x < 0 || obj.x > 100 || obj.y < 0 || obj.y > 100) return false;
      return true;
    })
    .slice(0, 5)
    .map((obj) => ({
      ...obj,
      keywords: Array.isArray(obj.keywords) ? obj.keywords.filter((k): k is string => typeof k === "string") : [],
      x: Math.max(0, Math.min(100, obj.x)),
      y: Math.max(0, Math.min(100, obj.y)),
      width: Math.max(1, Math.min(100, obj.width ?? 10)),
      height: Math.max(1, Math.min(100, obj.height ?? 10)),
    }));

  return {
    scene_summary: parsed.scene_summary ?? "",
    objects: validated,
  };
}
