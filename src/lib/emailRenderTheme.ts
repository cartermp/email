/**
 * Visual theme for email rendering inside sandboxed iframes.
 *
 * HTML emails use CSS invert(1) hue-rotate(180deg) for dark mode, so their
 * background must be specified as a *pre-filter* value — whatever colour you
 * want the user to actually see must first be run through the inverse
 * transform to produce the right input for the filter:
 *
 *   pre-filter = invert( hue-rotate(180deg)(desiredBg) )
 *
 * Plain-text emails don't use the inversion filter; their dark-mode colours
 * are applied directly via a matchMedia check.
 */
export interface EmailRenderTheme {
  /**
   * HTML email background in dark mode, specified *before* the
   * invert(1) hue-rotate(180deg) filter is applied.
   * Derive it: invert(hue-rotate(180deg)(appDarkBg)).
   */
  htmlDarkPreFilterBg: string;
  /** Plain-text email background in dark mode. */
  textDarkBg: string;
  /** Plain-text email text colour in dark mode. */
  textDarkColor: string;
}

/**
 * Matches the app's "dark terminal" palette defined in globals.css.
 *
 * app stone-900 = #060e06
 *   → hue-rotate(180deg) → #0e060e
 *   → invert           → #f1f9f1   (htmlDarkPreFilterBg)
 *
 * If you change the app's dark background colour, update htmlDarkPreFilterBg
 * using the formula above.
 */
export const defaultEmailRenderTheme: EmailRenderTheme = {
  htmlDarkPreFilterBg: "#f1f9f1", // → #060e06 after filter
  textDarkBg: "#060e06",          // stone-900
  textDarkColor: "#e0ece0",       // stone-100
};
