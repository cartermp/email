import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildForwardedHtml,
  combineEmailHtml,
  extractForwardedHtml,
  markQuotedReplyHtml,
  replaceCidReferences,
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

describe("forwarded draft HTML", () => {
  it("round-trips forwarded HTML through a saved draft", () => {
    const forwardedHtml = buildForwardedHtml(
      "<html><head><style>.brand{color:#123456}</style></head><body class=\"newsletter\"><p class=\"brand\">Original message</p></body></html>",
      {
        from: "Sender <sender@example.com>",
        to: "Reader <reader@example.com>",
        date: "July 31, 2026",
        subject: "Original subject",
      },
    );
    const draft = wrapEmailHtml(
      combineEmailHtml("<p>My note</p>", forwardedHtml),
    );
    assert.equal(extractForwardedHtml(draft), forwardedHtml);
    assert.ok(draft.includes(".brand{color:#123456}"));
    assert.ok(draft.includes('class="newsletter"'));
    assert.ok(draft.includes("Original subject"));
  });

  it("returns no forwarded body for an ordinary draft", () => {
    assert.equal(extractForwardedHtml(wrapEmailHtml("<p>Hello</p>")), undefined);
  });

  it("keeps authored styles from changing the preserved original layout", () => {
    const result = wrapEmailHtml(
      combineEmailHtml(
        "<p>My note</p>",
        "<table><tr><td>Original layout</td></tr></table>",
      ),
    );
    assert.ok(result.includes(".mail-authored-content td"));
    assert.ok(!result.includes(".mail-content td"));
  });

  it("rewrites embedded content IDs for the outgoing message and preview", () => {
    const outgoing = replaceCidReferences(
      '<img src="cid:hero@original"><div style="background:url(cid:bg@original)">',
      [
        { cid: "hero@original", url: "cid:forwarded-1@mail" },
        { cid: "bg@original", url: "/api/download?blobId=2" },
      ],
    );
    assert.ok(outgoing.includes('src="cid:forwarded-1@mail"'));
    assert.ok(outgoing.includes("url(/api/download?blobId=2)"));
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
