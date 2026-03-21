import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prepareHtml } from "../emailHtml";

describe("prepareHtml", () => {
  it("injects into existing <head>", () => {
    const result = prepareHtml("<html><head></head><body>hi</body></html>");
    assert.ok(result.startsWith("<html><head><style>"));
    assert.ok(result.includes("</style><script>"));
  });

  it("preserves existing head attributes", () => {
    const result = prepareHtml('<html><head lang="x"></head><body></body></html>');
    assert.ok(result.includes('<head lang="x"><style>'));
  });

  it("wraps bare HTML with no <head>", () => {
    const result = prepareHtml("<p>hello</p>");
    assert.ok(result.startsWith("<html><head>"));
    assert.ok(result.includes("<body><p>hello</p></body>"));
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

    it("does not inject a dark-mode media query", () => {
      const result = prepareHtml(lightEmail);
      assert.ok(!result.includes("prefers-color-scheme"), "should not inject dark override");
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

    it("still injects overflow:hidden", () => {
      const result = prepareHtml(darkEmail);
      assert.ok(result.includes("overflow:hidden"));
    });
  });
});
