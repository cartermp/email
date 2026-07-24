/**
 * Defaults used when a message does not provide usable colours or typography.
 * Dark mode also maps neutral, near-white canvases to the reader surface while
 * leaving image-backed and strongly coloured artwork untouched.
 */
export interface EmailRenderTheme {
  fontFamily: string;
  surfaceLightColor: string;
  surfaceDarkColor: string;
  textLightColor: string;
  textDarkColor: string;
  linkLightColor: string;
  linkDarkColor: string;
}

export const defaultEmailRenderTheme: EmailRenderTheme = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  surfaceLightColor: "#f8fafc",
  surfaceDarkColor: "#0f172a",
  textLightColor: "#0f172a",
  textDarkColor: "#e2e8f0",
  linkLightColor: "#2563eb",
  linkDarkColor: "#60a5fa",
};
