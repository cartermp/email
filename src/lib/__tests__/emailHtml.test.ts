import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { prepareHtml } from "../emailHtml";

describe("prepareHtml", () => {
  it("injects into existing <head>", () => {
    const result = prepareHtml("<html><head></head><body>hi</body></html>");
    // style and script should be inside <head>
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

  it("includes dark mode override for emails without native dark mode", () => {
    const result = prepareHtml("<html><head></head><body>plain</body></html>");
    assert.ok(result.includes("prefers-color-scheme:dark"));
    assert.ok(result.includes("#1c1917"));
  });

  it("omits dark mode override when email already has prefers-color-scheme: dark", () => {
    const html =
      "<html><head><style>@media (prefers-color-scheme: dark){body{background:#000}}</style></head><body></body></html>";
    const result = prepareHtml(html);
    // The injected style should not contain our override
    const injectedStyle = result.match(/<style>([^<]*)<\/style>/)?.[1] ?? "";
    assert.ok(!injectedStyle.includes("#1c1917"), `override should be absent, got: ${injectedStyle}`);
  });

  it("includes postMessage resize script", () => {
    const result = prepareHtml("<html><head></head><body></body></html>");
    assert.ok(result.includes("iframe-resize"));
    assert.ok(result.includes("postMessage"));
  });

  it("sets overflow:hidden to prevent iframe internal scrollbar", () => {
    const result = prepareHtml("<html><head></head><body>content</body></html>");
    assert.ok(result.includes("overflow:hidden"), `expected overflow:hidden in: ${result.slice(0, 300)}`);
  });

  it("handles uppercase HEAD tag", () => {
    const result = prepareHtml("<HTML><HEAD></HEAD><BODY>hi</BODY></HTML>");
    assert.ok(result.includes("<style>"), "should inject style into uppercase HEAD");
  });
});
