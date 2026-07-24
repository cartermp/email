const WIDTH_TOLERANCE = 2;

/**
 * Once an oversized message is scaled, keep its first measured content width
 * stable. Feeding later scroll-width measurements back into the iframe width
 * can create an endless loop for content such as `width:100%` plus padding.
 */
export function lockEmailContentWidth(
  availableWidth: number,
  measuredWidth: number,
  lockedWidth: number | null,
): number | null {
  if (availableWidth <= 0) return lockedWidth;

  if (lockedWidth !== null) {
    return lockedWidth > availableWidth + WIDTH_TOLERANCE
      ? lockedWidth
      : null;
  }

  return measuredWidth > availableWidth + WIDTH_TOLERANCE
    ? measuredWidth
    : null;
}
