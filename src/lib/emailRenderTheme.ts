/**
 * Defaults used only when a message does not provide its own typography.
 * HTML email colours are deliberately left alone: preserving the sender's
 * light/dark artwork is more reliable than applying a blanket colour filter.
 */
export interface EmailRenderTheme {
  fontFamily: string;
  textLightBg: string;
  textLightColor: string;
  textDarkBg: string;
  textDarkColor: string;
}

export const defaultEmailRenderTheme: EmailRenderTheme = {
  fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  textLightBg: "#ffffff",
  textLightColor: "#0f172a",
  textDarkBg: "#0f172a",
  textDarkColor: "#e2e8f0",
};
