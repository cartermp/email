import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { wrapComposePreviewHtml, wrapEmailHtml } from "../composeHtml";

describe("wrapEmailHtml", () => {
  it("keeps the outgoing email wrapper on a plain white background", () => {
    const result = wrapEmailHtml("<p>Hello</p>");
    assert.ok(result.includes("color: #1a1a1a"), "outgoing email text should stay neutral");
    assert.ok(result.includes("background: #f4f4f5"), "outgoing email code blocks should keep the light email styling");
  });
});

describe("wrapComposePreviewHtml", () => {
  it("wraps preview content in the themed preview shell", () => {
    const result = wrapComposePreviewHtml("<p>Hello</p>");
    assert.ok(result.includes('class="preview-shell"'), "preview should render inside the themed shell");
    assert.ok(result.includes("--preview-bg: #060e06"), "preview should include the app dark background color");
    assert.ok(result.includes("font-family: 'Share Tech Mono', monospace"), "preview should use the app font");
  });

  it("styles forwarded-email blocks with the preview theme override hook", () => {
    const result = wrapComposePreviewHtml('<div data-forwarded-email="true">Forwarded</div>');
    assert.ok(result.includes('[data-forwarded-email="true"]'), "preview should override forwarded content styling");
  });
});
