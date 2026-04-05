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

  it("reports content width via direct body children so the parent can scale externally", () => {
    const result = prepareHtml("<html><head></head><body>hi</body></html>");
    // The parent (EmailBody) scales the iframe element itself when content is
    // wider than the container. We measure only direct body children using
    // offsetLeft+offsetWidth (not scrollWidth or getBCR on all descendants)
    // because descending into nested tables picks up inner-element margin
    // overflow, which creates an infinite resize loop.
    assert.ok(result.includes("document.body.children"), "should iterate direct body children");
    assert.ok(result.includes("offsetWidth"), "should use offsetWidth to measure content width");
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

    it("sets a white background", () => {
      const result = prepareHtml(lightEmail);
      assert.ok(result.includes("background-color:#ffffff"));
    });

    it("injects dark-mode filter inversion via CSS @media (prefers-color-scheme:dark)", () => {
      const result = prepareHtml(lightEmail);
      // color-scheme:light suppresses both CSS @media and window.matchMedia in modern
      // browsers, so we must NOT set it. Use a plain CSS @media block instead.
      assert.ok(!result.includes("color-scheme:light"), "must not set color-scheme:light");
      assert.ok(result.includes("filter:invert(1) hue-rotate(180deg)"),
        "should inject invert filter for dark mode");
      assert.ok(result.match(/@media\(prefers-color-scheme:dark\)/),
        "dark mode filter must be in a CSS @media rule");
    });

    it("sets app-matching dark background and text colour via pre-filter values", () => {
      const result = prepareHtml(lightEmail);
      // html gets stone-900 directly (no filter on html) to avoid browser bg-escape quirk
      assert.ok(result.includes("#060e06"), "dark @media block should set html background-color:#060e06");
      // body pre-filter bg: #f1f9f1 → filter → #060e06 (stone-900)
      assert.ok(result.includes("#f1f9f1"), "dark @media block should set body background-color:#f1f9f1");
      // body pre-filter color: #131f13 → filter → #e0ece0 (stone-100)
      assert.ok(result.includes("#131f13"), "dark @media block should set body color:#131f13");
    });

    it("injects default font-family on html,body so unstyled emails match the client font", () => {
      const result = prepareHtml(lightEmail);
      assert.ok(result.includes("font-family:"), "should inject font-family on html,body");
    });

    it("injects counter-filter on img/video/picture/canvas to preserve image colors", () => {
      const result = prepareHtml(lightEmail);
      // These elements get the same filter applied twice (self-inverse).
      // !important ensures email CSS cannot override the counter-filter.
      assert.ok(result.includes("img,video,picture,canvas{filter:invert(1) hue-rotate(180deg)!important}"), `got: ${result}`);
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

  it("injects dark mode via JS matchMedia with app stone palette colors", () => {
    const result = prepareTextBody("text");
    // Must use matchMedia so dark mode works inside the sandboxed iframe
    assert.ok(result.includes("matchMedia") && result.includes("prefers-color-scheme:dark"),
      "should detect dark mode via matchMedia");
    // App stone-900 (#060e06) background, stone-100 (#e0ece0) text
    assert.ok(result.includes("#060e06"), "dark background should use app stone-900 (#060e06)");
    assert.ok(result.includes("#e0ece0"), "dark text should use app stone-100 (#e0ece0)");
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

  describe("stripQuotes option", () => {
    it("strips lines starting with > from plain text", () => {
      const text = "Thanks for the update.\n\n> On Monday, Bob wrote:\n> some quoted text\n> more quoted text";
      const result = prepareTextBody(text, { stripQuotes: true });
      assert.ok(!result.includes("&gt; some quoted text"), "quoted lines should be removed");
      assert.ok(result.includes("Thanks for the update."), "original content should be preserved");
    });

    it("strips the attribution line before quoted text", () => {
      const text = "Got it.\n\nOn Monday, Bob wrote:\n> the previous message";
      const result = prepareTextBody(text, { stripQuotes: true });
      assert.ok(!result.includes("On Monday, Bob wrote:"), "attribution line should be removed");
      assert.ok(result.includes("Got it."), "original content should be preserved");
    });

    it("strips blank lines between content and attribution", () => {
      const text = "Reply here.\n\n\nOn Thu, Alice wrote:\n> quoted";
      const result = prepareTextBody(text, { stripQuotes: true });
      // Everything from the blank lines onward should be gone
      assert.ok(!result.includes("On Thu, Alice wrote:"), "attribution should be removed");
      assert.ok(!result.includes("&gt; quoted"), "quoted content should be removed");
      assert.ok(result.includes("Reply here."), "reply should be preserved");
    });

    it("leaves text untouched when there are no quoted lines", () => {
      const text = "No quotes here.\nJust plain text.";
      const result = prepareTextBody(text, { stripQuotes: true });
      assert.ok(result.includes("No quotes here."), "text should be unchanged");
      assert.ok(result.includes("Just plain text."), "text should be unchanged");
    });

    it("does not strip when stripQuotes is false", () => {
      const text = "My reply.\n\n> quoted line";
      const result = prepareTextBody(text, { stripQuotes: false });
      assert.ok(result.includes("&gt; quoted line"), "quoted line should be present when stripping is off");
    });

    it("does not strip when stripQuotes is omitted", () => {
      const text = "My reply.\n\n> quoted line";
      const result = prepareTextBody(text);
      assert.ok(result.includes("&gt; quoted line"), "quoted line should be present by default");
    });
  });
});

describe("prepareHtml stripQuotes option", () => {
  const selectors = [
    { name: "Gmail (.gmail_quote)", html: '<div class="gmail_quote">quoted</div>' },
    { name: "Apple Mail (blockquote[type=cite])", html: '<blockquote type="cite">quoted</blockquote>' },
    { name: "Outlook (#divRplyFwdMsg)", html: '<div id="divRplyFwdMsg">quoted</div>' },
    { name: "Yahoo (.yahoo_quoted)", html: '<div class="yahoo_quoted">quoted</div>' },
  ];

  for (const { name, html } of selectors) {
    it(`injects JS to remove ${name} quote container`, () => {
      const email = `<html><head></head><body><p>My reply</p>${html}</body></html>`;
      const result = prepareHtml(email, { stripQuotes: true });
      // The injected script should contain the relevant CSS selector
      const selector = html.match(/class="([^"]+)"/)?.[1]
        ? `.${html.match(/class="([^"]+)"/)![1]}`
        : html.match(/id="([^"]+)"/)?.[1]
        ? `#${html.match(/id="([^"]+)"/)![1]}`
        : 'blockquote[type="cite"]';
      assert.ok(result.includes(selector), `should inject selector for ${name}: ${selector}`);
    });
  }

  it("does not inject quote-stripping JS when stripQuotes is false", () => {
    const email = '<html><head></head><body><p>hi</p></body></html>';
    const result = prepareHtml(email, { stripQuotes: false });
    assert.ok(!result.includes("querySelectorAll"), "querySelectorAll should not be injected when stripping is off");
  });

  it("does not inject quote-stripping JS by default", () => {
    const email = '<html><head></head><body><p>hi</p></body></html>';
    const result = prepareHtml(email);
    assert.ok(!result.includes("querySelectorAll"), "querySelectorAll should not be injected by default");
  });

  it("quote-stripping runs after load so DOM is fully parsed", () => {
    const email = '<html><head></head><body><div class="gmail_quote">quoted</div></body></html>';
    const result = prepareHtml(email, { stripQuotes: true });
    // The strip-quotes IIFE must be inside the load event listener, not at the top level,
    // so it runs after the full document is parsed.
    const loadListenerMatch = result.match(/addEventListener\('load',function\(\)\{([\s\S]*?)\}\)/);
    assert.ok(loadListenerMatch, "should have a load event listener");
    assert.ok(loadListenerMatch![1].includes("gmail_quote"), "strip-quotes JS should run inside the load listener");
  });
});
