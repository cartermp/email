import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prepareHtml, prepareTextBody } from "../emailHtml";

describe("prepareHtml", () => {
  it("injects into existing <head>", () => {
    const result = prepareHtml("<html><head></head><body>hi</body></html>");
    assert.ok(result.includes("<style>"), "should inject style");
    assert.ok(result.includes("<script>"), "should inject script");
  });

  it("preserves existing head attributes", () => {
    const result = prepareHtml('<html><head lang="x"></head><body></body></html>');
    assert.ok(result.includes('<head lang="x">'), "should preserve head attributes");
    assert.ok(result.includes("<style>"), "should still inject style");
  });

  it("wraps bare HTML with no <head>", () => {
    const result = prepareHtml("<p>hello</p>");
    assert.ok(result.startsWith("<html><head>"));
    assert.ok(result.includes("<body><p>hello</p></body>"));
  });

  it("reports scrollWidth in the postMessage so the parent can scale externally", () => {
    const result = prepareHtml("<html><head></head><body>hi</body></html>");
    // The parent (EmailBody) scales the iframe element itself when content is
    // wider than the container — it needs scrollWidth to compute the ratio.
    assert.ok(result.includes("scrollWidth"), "should report scrollWidth");
    assert.ok(result.includes("width:w"), "should include width in the postMessage payload");
  });

  it("strips a fixed-width viewport meta from the original email", () => {
    const email = '<html><head><meta name="viewport" content="width=600"></head><body></body></html>';
    const result = prepareHtml(email);
    assert.ok(!result.includes('content="width=600"'), "original fixed-width viewport should be removed");
  });

  it("sets overflow:hidden to prevent iframe internal scrollbar", () => {
    const result = prepareHtml("<html><head></head><body>content</body></html>");
    assert.ok(result.includes("overflow:hidden"));
  });

  it("handles uppercase HEAD tag", () => {
    const result = prepareHtml("<HTML><HEAD></HEAD><BODY>hi</BODY></HTML>");
    assert.ok(result.includes("<style>"), "should inject style into uppercase HEAD");
  });

  it("includes postMessage resize script", () => {
    const result = prepareHtml("<html><head></head><body></body></html>");
    assert.ok(result.includes("iframe-resize"));
    assert.ok(result.includes("postMessage"));
  });

  describe("light-mode emails (no native dark mode)", () => {
    const lightEmail = "<html><head></head><body>plain</body></html>";

    it("locks rendering to light with color-scheme:light", () => {
      const result = prepareHtml(lightEmail);
      assert.ok(result.includes("color-scheme:light"));
    });

    it("sets a white background", () => {
      const result = prepareHtml(lightEmail);
      assert.ok(result.includes("background-color:#ffffff"));
    });

    it("injects dark-mode filter inversion via JS matchMedia, not CSS @media", () => {
      const result = prepareHtml(lightEmail);
      // Must use window.matchMedia so it fires even when color-scheme:light
      // suppresses CSS media queries inside the sandboxed iframe.
      assert.ok(result.includes("matchMedia") && result.includes("prefers-color-scheme:dark"),
        "should use matchMedia to detect dark mode");
      assert.ok(result.includes("filter:invert(1) hue-rotate(180deg)"),
        "should inject invert filter for dark mode");
      // Must NOT rely on a CSS @media block for the inversion
      assert.ok(!result.match(/@media[^{]*prefers-color-scheme[^{]*dark[^{]*\{[^}]*filter/),
        "dark mode filter must not be in a CSS @media rule");
    });

    it("injects counter-filter on img and video to preserve image colors", () => {
      const result = prepareHtml(lightEmail);
      // img and video get the same filter applied twice (self-inverse for images)
      assert.ok(result.includes("img,video{filter:invert(1) hue-rotate(180deg)}"), `got: ${result}`);
    });
  });

  describe("dark-mode-aware emails", () => {
    const darkEmail =
      "<html><head><style>@media (prefers-color-scheme: dark){body{background:#000}}</style></head><body></body></html>";

    it("does not inject color-scheme:light", () => {
      const result = prepareHtml(darkEmail);
      assert.ok(!result.includes("color-scheme:light"));
    });

    it("does not inject a white background override", () => {
      const result = prepareHtml(darkEmail);
      // The injected style should only contain overflow:hidden, not a background color
      const injectedStyle = result.match(/<style>(.*?)<\/style>/)?.[1] ?? "";
      assert.ok(!injectedStyle.includes("background-color:#ffffff"), `got: ${injectedStyle}`);
    });

    it("does not inject a filter inversion (email handles its own dark mode)", () => {
      const result = prepareHtml(darkEmail);
      // Only one prefers-color-scheme reference — the email's own style, not our injected filter
      const injectedStyle = result.match(/<style>(.*?)<\/style>/)?.[1] ?? "";
      assert.ok(!injectedStyle.includes("filter:invert"), `injected style should not contain filter: ${injectedStyle}`);
    });

    it("still injects overflow:hidden", () => {
      const result = prepareHtml(darkEmail);
      assert.ok(result.includes("overflow:hidden"));
    });
  });
});

describe("prepareTextBody", () => {
  it("returns a full HTML document", () => {
    const result = prepareTextBody("hello world");
    assert.ok(result.startsWith("<html>"), "should start with <html>");
    assert.ok(result.includes("</html>"), "should end with </html>");
  });

  it("escapes HTML entities in the text", () => {
    const result = prepareTextBody("<b>bold</b> & \"quoted\"");
    assert.ok(result.includes("&lt;b&gt;bold&lt;/b&gt;"), "< and > should be escaped");
    assert.ok(result.includes("&amp;"), "& should be escaped");
    assert.ok(!result.includes("<b>"), "raw <b> tag must not appear");
  });

  it("uses system-ui sans-serif font (not monospace)", () => {
    const result = prepareTextBody("hello");
    assert.ok(result.includes("sans-serif"), "should use sans-serif font");
    assert.ok(!result.includes("monospace"), "must not use monospace font");
  });

  it("preserves newlines via white-space:pre-wrap", () => {
    const result = prepareTextBody("line one\nline two");
    assert.ok(result.includes("white-space:pre-wrap") || result.includes("white-space: pre-wrap"),
      "should use pre-wrap to preserve newlines");
    assert.ok(result.includes("line one\nline two"), "raw text with newlines should be present");
  });

  it("injects dark mode via JS matchMedia with stone palette colors", () => {
    const result = prepareTextBody("text");
    // Must use matchMedia so dark mode works inside the sandboxed iframe
    assert.ok(result.includes("matchMedia") && result.includes("prefers-color-scheme:dark"),
      "should detect dark mode via matchMedia");
    // Stone-800 (#1c1917) background and stone-200 (#e7e5e4) text
    assert.ok(result.includes("#1c1917"), "dark background should use stone-900 (#1c1917)");
    assert.ok(result.includes("#e7e5e4"), "dark text should use stone-200 (#e7e5e4)");
    // Must NOT use a CSS @media block for dark mode
    assert.ok(!result.match(/@media[^{]*prefers-color-scheme[^{]*dark/),
      "dark mode must not use a CSS @media rule");
  });

  it("injects the iframe resize postMessage script", () => {
    const result = prepareTextBody("text");
    assert.ok(result.includes("iframe-resize"), "should send iframe-resize postMessage");
    assert.ok(result.includes("postMessage"), "should call postMessage");
  });

  it("sets overflow:hidden to prevent internal scrollbar", () => {
    const result = prepareTextBody("text");
    assert.ok(result.includes("overflow:hidden"));
  });
});
