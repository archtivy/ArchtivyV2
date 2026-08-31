/**
 * Where an image is actually painted inside its box.
 *
 * ── THE BUG THIS EXISTS TO KILL ─────────────────────────────────────────────
 * Product pins are stored as percentages (x_percent / y_percent, 0–100). The
 * question every surface has to answer is "percentages OF WHAT", and until this
 * helper each one answered differently — by accident, because positioning a
 * child with `left: 89%` inside a `relative` container silently means "89% of
 * the CONTAINER", and the container is only the same thing as the image when
 * the image happens to fill it.
 *
 *   PinEditor   aspect-[3/2] box, object-contain  <- where pins are authored
 *   Gallery     aspect-[16/10] box, object-cover
 *   Lightbox    flex-1 box (any ratio), object-contain
 *
 * With object-contain the image is letterboxed, so the container and the image
 * are genuinely different rectangles. Measured on Istanbul House Design: at
 * 1600 the stage is 1150x784 and the image is painted 1150x746 — a 19px bar —
 * which pushed pins 7px off. At 390 the bars are 192px and pins landed up to
 * 107px away from the thing they point at. At 2048 the bars are horizontal and
 * a pin rendered fully OUTSIDE the photograph, in the gutter beside it.
 *
 * The percentage is a point on the PHOTOGRAPH, not a point on a box that
 * happens to contain it. This computes that photograph's rectangle, so every
 * surface can resolve the same stored pair to the same physical spot.
 */

export interface PaintedRect {
  /** Offset of the painted image inside the box, in px. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export function paintedImageRect(
  natural: { width: number; height: number },
  box: { width: number; height: number },
  fit: "contain" | "cover"
): PaintedRect | null {
  // Nothing sensible to compute before the image has loaded or been laid out.
  if (
    !natural.width ||
    !natural.height ||
    !box.width ||
    !box.height ||
    natural.width <= 0 ||
    natural.height <= 0
  ) {
    return null;
  }

  const scale =
    fit === "contain"
      ? Math.min(box.width / natural.width, box.height / natural.height)
      : Math.max(box.width / natural.width, box.height / natural.height);

  const width = natural.width * scale;
  const height = natural.height * scale;

  // Centred both ways, which is the default object-position for both fits.
  // Under `cover` the offsets come out NEGATIVE — the image overflows the box
  // and is clipped — and that is correct: a pin in the cropped region resolves
  // to a coordinate outside the visible area, which is the truth about where
  // that point went, not something to clamp away.
  return {
    x: (box.width - width) / 2,
    y: (box.height - height) / 2,
    width,
    height,
  };
}

/** Resolve a stored 0–100 pin to px within the box, via the painted image. */
export function pinOffsetInBox(
  pin: { xPercent: number; yPercent: number },
  rect: PaintedRect
): { left: number; top: number } {
  return {
    left: rect.x + (pin.xPercent / 100) * rect.width,
    top: rect.y + (pin.yPercent / 100) * rect.height,
  };
}
