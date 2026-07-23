import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  markQuotedReplyHtml,
  wrapComposePreviewHtml,
  wrapEmailHtml,
} from "../composeHtml";

describe("wrapEmailHtml", () => {
  it("creates a neutral, responsive outgoing email document", () => {
    const result = wrapEmailHtml("<p>Hello</p>");
    assert.ok(result.startsWith("<!DOCTYPE html>"));
    assert.ok(result.includes('name="viewport"'));
    assert.ok(result.includes('class="mail-content"'));
    assert.ok(result.includes("max-width:680px"));
    assert.ok(result.includes("BlinkMacSystemFont"));
    assert.ok(!result.includes("Share Tech Mono"));
  });

  it("keeps images proportional and code blocks readable", () => {
    const result = wrapEmailHtml("<p>Hello</p>");
    assert.ok(result.includes("max-width: 100%; height: auto"));
    assert.ok(result.includes("white-space: pre-wrap"));
  });
});

describe("markQuotedReplyHtml", () => {
  it("marks only the final blockquote as standard cited history", () => {
    const result = markQuotedReplyHtml(
      "<blockquote><p>A deliberate quote</p></blockquote><p>Reply</p><blockquote><p>Previous message</p></blockquote>",
    );
    assert.equal((result.match(/type="cite"/g) ?? []).length, 1);
    assert.ok(
      result.endsWith(
        '<blockquote type="cite" class="email-client-quoted-reply" data-quoted-reply="true"><p>Previous message</p></blockquote>',
      ),
    );
  });

  it("leaves content without a quote untouched", () => {
    assert.equal(markQuotedReplyHtml("<p>Hello</p>"), "<p>Hello</p>");
  });
});

describe("wrapComposePreviewHtml", () => {
  it("uses the same message content styles on a quiet preview canvas", () => {
    const result = wrapComposePreviewHtml("<p>Hello</p>");
    assert.ok(result.includes('class="preview-surface"'));
    assert.ok(result.includes('class="mail-content"'));
    assert.ok(result.includes("--canvas: #f8fafc"));
    assert.ok(!result.includes("Share Tech Mono"));
    assert.ok(!result.includes("#060e06"));
  });
});
