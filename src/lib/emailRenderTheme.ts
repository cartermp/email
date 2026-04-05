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
   * Direct dark-mode background colour applied to the `html` element (no
   * filter on html). Set this to whatever you want the user to actually see
   * behind the email in dark mode.
   */
  htmlDarkBg: string;
  /**
   * Dark-mode background for the `body` element, specified *before* the
   * invert(1) hue-rotate(180deg) filter that is applied to body.
   * After the filter it should equal htmlDarkBg so the background is seamless.
   * Derive it: invert(hue-rotate(180deg)(htmlDarkBg)).
   */
  bodyDarkPreFilterBg: string;
  /**
   * Default text colour for the `body` element in dark mode, specified
   * *before* the filter. Only affects elements that inherit colour from body
   * (unstyled content). Elements with explicit colours override this.
   * Derive it: invert(hue-rotate(180deg)(desiredTextColor)).
   */
  bodyDarkPreFilterColor: string;
  /**
   * Default font-family injected on html,body for HTML emails.
   * Emails that declare their own font override this; it only affects
   * unstyled content like plain-wrapper emails.
   */
  fontFamily: string;
  /** Plain-text email background in dark mode. */
  textDarkBg: string;
  /** Plain-text email text colour in dark mode. */
  textDarkColor: string;
}

/**
 * Matches the app's "dark terminal" palette defined in globals.css.
 *
 * The filter on <body> is invert(1) hue-rotate(180deg). To derive pre-filter
 * values from desired post-filter colours:
 *   pre = invert(hue-rotate(180deg)(desired))
 *
 *   stone-900 #060e06 → hue-rotate → #0e060e → invert → #f1f9f1  (bodyDarkPreFilterBg)
 *   stone-100 #e0ece0 → hue-rotate → #ece0ec → invert → #131f13  (bodyDarkPreFilterColor)
 *
 * Update all three values if the app's dark background or text colour changes.
 */
export const defaultEmailRenderTheme: EmailRenderTheme = {
  htmlDarkBg: "#060e06",              // stone-900 — set directly on html (no filter)
  bodyDarkPreFilterBg: "#f1f9f1",     // → #060e06 (stone-900) after filter
  bodyDarkPreFilterColor: "#131f13",  // → #e0ece0 (stone-100) after filter
  fontFamily: "'Share Tech Mono', monospace",
  textDarkBg: "#060e06",              // stone-900
  textDarkColor: "#e0ece0",           // stone-100
};
