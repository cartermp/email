/**
 * Defaults used only when a message does not provide its own colours or
 * typography. Email backgrounds remain transparent so the reader surface
 * shows through; sender-authored backgrounds and artwork are left untouched.
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
