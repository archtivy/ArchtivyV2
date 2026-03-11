/**
 * POST /api/admin/ai/generate-image-seo
 * Admin-only. Sends an image URL to OpenAI Vision and returns SEO metadata.
 * Input:  { imageUrl: string }
 * Output: { alt_text: string, title: string, caption: string }
 */
import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/admin/apiGuard";

const SYSTEM_PROMPT = `You are the Archtivy Vision Metadata Engine.

Your job is to analyze architecture, interior, exterior, and product images and generate high quality metadata.

This metadata must be optimized for architecture discovery and object matching.

You must generate three fields:

alt_text
title
caption

GENERAL RULES

- Never invent elements that are not visible.
- Only describe visible architecture, furniture, surfaces, materials, objects, and built-in elements.
- Avoid emotional or marketing language.
- Do not use words like: beautiful, stunning, elegant, luxurious, cozy, inviting.
- Be objective and professional.
- Focus on materials, colors, forms, and architectural components.

ALT TEXT RULES

Alt text must be optimized for strong matching.

Write alt text as pipe-separated visual descriptors using this structure:

material | color | physical form

Examples:

dark oak wall cladding panels | beige travertine spiral staircase steps | curved plaster stair wall | brushed stainless steel handrail

Include:

- furniture
- architectural surfaces
- built-in cabinetry
- facade elements
- structural forms
- flooring
- ceiling treatments
- windows
- railings
- stairs
- tables
- seating

Avoid vague nouns like:

wood
stone
chair
table
sofa

Prefer specific object phrases:

oak lounge chair
marble coffee table
travertine stair treads
perforated wood facade panels

Separate elements with the pipe symbol:

|

Do not write sentences.

TITLE RULES

Titles must be:

- short
- editorial
- descriptive

4–8 words preferred.

Examples:

Curved Travertine Staircase
Oak Kitchen with Island
Poolside Lounge Terrace
Minimal Bedroom Interior

CAPTION RULES

Captions must be:

- one sentence
- objective
- descriptive

Mention the main architectural or furniture elements.

Example:

Living room interior with curved upholstered seating, oak ceiling panels and a low oval coffee table.

RESPONSE FORMAT

Return only valid JSON with this exact structure:

{
  "alt_text": "...",
  "title": "...",
  "caption": "..."
}`;

export async function POST(request: NextRequest) {
  const guard = await requireAdminApi();
  if (guard) return guard;

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI API key not configured" },
      { status: 500 }
    );
  }

  let body: { imageUrl?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const imageUrl = body.imageUrl?.trim();
  if (!imageUrl) {
    return NextResponse.json({ error: "imageUrl is required" }, { status: 400 });
  }

  try {
    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          max_tokens: 600,
          temperature: 0.3,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: imageUrl, detail: "high" },
                },
                {
                  type: "text",
                  text: "Analyze this image and return the JSON metadata.",
                },
              ],
            },
          ],
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errText = await openaiResponse.text();
      console.error("[generate-image-seo] OpenAI error:", openaiResponse.status, errText);
      return NextResponse.json(
        { error: "AI metadata generation failed. Please try again." },
        { status: 502 }
      );
    }

    const data = await openaiResponse.json();
    const rawContent: string = data.choices?.[0]?.message?.content ?? "";

    // Extract JSON from the response (handle markdown code fences)
    let jsonStr = rawContent.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim();
    }

    let parsed: { alt_text?: string; title?: string; caption?: string };
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      console.error("[generate-image-seo] Failed to parse AI response:", rawContent);
      return NextResponse.json(
        { error: "AI metadata generation failed. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      alt_text: parsed.alt_text ?? "",
      title: parsed.title ?? "",
      caption: parsed.caption ?? "",
    });
  } catch (err) {
    console.error("[generate-image-seo] Unexpected error:", err);
    return NextResponse.json(
      { error: "AI metadata generation failed. Please try again." },
      { status: 500 }
    );
  }
}
