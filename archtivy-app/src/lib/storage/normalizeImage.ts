/**
 * Bring an uploaded photograph down to something the site can actually serve.
 *
 * ── WHY THIS EXISTS ─────────────────────────────────────────────────────────
 * Measured on the live corpus (22 sampled listing images): the median stored
 * asset is 281KB at 1350px on its long edge, which is fine. The tail is not —
 * 5 of 22 exceed 2000px and the worst reach 3200px and 1.9MB. The project hero
 * that made detail pages slow is a 1.9MB WebP.
 *
 * Those originals are not served directly; Next optimises them per request.
 * But optimising one costs 3.4–7.9s the first time anybody asks for it, and
 * cold LCP on a project detail page was 6.3s against 0.9s warm. Cheaper
 * originals are the only fix that helps the FIRST visitor — a cache cannot.
 *
 * ── WHERE THE NUMBERS COME FROM ─────────────────────────────────────────────
 * Not invented. The detail hero renders with
 * `sizes="(max-width: 1024px) 100vw, 66vw"`, so a 2560px display asks for
 * ~1690 CSS px, and the lightbox goes full-bleed. Next's srcset for these
 * images offers 640 / 750 / 828 / 1080 / 1200 / 1920 / 2048 / 3840.
 *
 * MAX_EDGE is 2048: it covers every rung the browser realistically picks
 * including 1920 and 2048 themselves, leaves retina headroom for the
 * full-screen lightbox, and stops short of 3840 — a rung that on this corpus
 * would mean UPSCALING a 3200px source and which produced a 1.39MB response
 * when measured.
 *
 * QUALITY is 0.82. Next re-encodes at q=75 downstream, so this is a source
 * asset rather than a delivered one and has to stay comfortably above the
 * final encode to avoid stacking two lossy passes into visible artefacts.
 *
 * ── WHAT IT DELIBERATELY DOES NOT DO ────────────────────────────────────────
 * It never upscales, and it leaves a file completely alone unless that file is
 * actually a problem — over MAX_EDGE on its long side, or over SIZE_BUDGET on
 * disk. An image already inside both limits is uploaded byte-for-byte as the
 * user supplied it, so the common case loses nothing at all and the only
 * assets re-encoded are the ones that would otherwise cost seconds.
 *
 * That is also the answer to preserving source quality: rather than storing
 * two copies of everything and doubling both storage and upload time on a
 * direct-to-bucket flow, this only touches files no detail page can display at
 * full size anyway. GIFs are passed through untouched — re-encoding one to
 * WebP through a canvas would flatten it to a single frame.
 */

/** Longest edge, in pixels, that any listing image needs to be. */
export const MAX_EDGE = 2048;

/** Files at or under this are left alone regardless of dimensions. */
export const SIZE_BUDGET = 600 * 1024;

/** WebP quality for the re-encode. Source asset, not the delivered one. */
export const QUALITY = 0.82;

/** Formats that survive a canvas round trip without losing something. */
const RE_ENCODABLE = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface NormalizeResult {
  file: File;
  /** False when the original was returned untouched. */
  changed: boolean;
  reason: string;
  before: { bytes: number; width: number | null; height: number | null };
  after: { bytes: number; width: number | null; height: number | null };
}

function passthrough(file: File, reason: string): NormalizeResult {
  return {
    file,
    changed: false,
    reason,
    before: { bytes: file.size, width: null, height: null },
    after: { bytes: file.size, width: null, height: null },
  };
}

/**
 * Decode just far enough to read the dimensions.
 *
 * `createImageBitmap` is the cheap path and is available in every browser this
 * app supports; the `<img>` fallback exists because it costs four lines and
 * covers the case where a decode is refused.
 */
async function decode(file: File): Promise<ImageBitmap | HTMLImageElement | null> {
  try {
    if (typeof createImageBitmap === "function") return await createImageBitmap(file);
  } catch {
    /* fall through */
  }
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/**
 * Normalise one image in the browser, before it is uploaded.
 *
 * Never throws: any failure returns the original file. A photograph that
 * cannot be re-encoded should still be publishable — this is an optimisation,
 * and an optimisation that can block an upload is a bug.
 */
export async function normalizeListingImage(file: File): Promise<NormalizeResult> {
  if (typeof document === "undefined") return passthrough(file, "not in a browser");
  if (!RE_ENCODABLE.has(file.type)) return passthrough(file, `format ${file.type} passed through`);

  const bitmap = await decode(file);
  if (!bitmap) return passthrough(file, "could not decode");

  const width = "width" in bitmap ? bitmap.width : 0;
  const height = "height" in bitmap ? bitmap.height : 0;
  if (!width || !height) return passthrough(file, "no dimensions");

  const longEdge = Math.max(width, height);
  const oversized = longEdge > MAX_EDGE;
  const heavy = file.size > SIZE_BUDGET;

  if (!oversized && !heavy) {
    if ("close" in bitmap) bitmap.close();
    return {
      file,
      changed: false,
      reason: `already within budget (${longEdge}px, ${Math.round(file.size / 1024)}KB)`,
      before: { bytes: file.size, width, height },
      after: { bytes: file.size, width, height },
    };
  }

  // Scale only downward — never invent detail that was not photographed.
  const scale = oversized ? MAX_EDGE / longEdge : 1;
  const targetW = Math.max(1, Math.round(width * scale));
  const targetH = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    if ("close" in bitmap) bitmap.close();
    return passthrough(file, "no 2d context");
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, targetW, targetH);
  if ("close" in bitmap) bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", QUALITY)
  );
  if (!blob) return passthrough(file, "encode failed");

  /*
   * Keep whichever is smaller. A already-well-compressed WebP can come out of
   * a canvas re-encode LARGER than it went in, and shipping the bigger file
   * would be the opposite of the point.
   */
  if (blob.size >= file.size && !oversized) {
    return {
      file,
      changed: false,
      reason: `re-encode was not smaller (${Math.round(blob.size / 1024)}KB vs ${Math.round(file.size / 1024)}KB)`,
      before: { bytes: file.size, width, height },
      after: { bytes: file.size, width, height },
    };
  }

  const renamed = file.name.replace(/\.[^.]+$/, "") + ".webp";
  return {
    file: new File([blob], renamed, { type: "image/webp", lastModified: Date.now() }),
    changed: true,
    reason: oversized
      ? `resized ${width}x${height} → ${targetW}x${targetH}`
      : `re-encoded at ${targetW}x${targetH}`,
    before: { bytes: file.size, width, height },
    after: { bytes: blob.size, width: targetW, height: targetH },
  };
}
