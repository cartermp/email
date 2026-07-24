import sharp from "sharp";

export const AVATAR_PIXEL_SIZE = 256;

/**
 * Normalize every upstream format (including scalable SVG and multi-size ICO)
 * into a dense, browser-safe PNG. Sharp strips scripts and external resources
 * from SVG input while preserving vector detail at the target resolution.
 */
export async function renderAvatarImage(
  input: ArrayBuffer | Uint8Array,
): Promise<Buffer> {
  const bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : input;

  return sharp(Buffer.from(bytes), {
    failOn: "warning",
    limitInputPixels: 4096 * 4096,
  })
    .rotate()
    .resize(AVATAR_PIXEL_SIZE, AVATAR_PIXEL_SIZE, {
      fit: "contain",
      background: { r: 255, g: 255, b: 255, alpha: 0 },
      kernel: sharp.kernel.lanczos3,
      withoutEnlargement: false,
    })
    .png({
      compressionLevel: 9,
      palette: false,
    })
    .toBuffer();
}
