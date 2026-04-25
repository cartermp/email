import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sanitizeHtml, extractStyles, extractBodyContent, resolvePrintBody } from "../printHtml";
import type { Email } from "../types";

// ---------------------------------------------------------------------------
// sanitizeHtml
// ---------------------------------------------------------------------------

describe("sanitizeHtml", () => {
  it("removes a script tag and its content", () => {
    const result = sanitizeHtml('<p>hi</p><script>alert("xss")</script><p>bye</p>');
    assert.ok(!result.includes("<script>"), "script open tag should be removed");
    assert.ok(!result.includes("alert"), "script content should be removed");
    assert.ok(result.includes("<p>hi</p>"), "surrounding content should survive");
  });

  it("removes a script tag with type attribute", () => {
    const result = sanitizeHtml('<script type="text/javascript">var x = 1;</script>');
    assert.ok(!result.includes("var x"));
  });

  it("removes multiline script blocks", () => {
    const result = sanitizeHtml("<script>\nfunction evil() {\n  fetch('/steal');\n}\n</script>");
    assert.ok(!result.includes("evil"));
    assert.ok(!result.includes("fetch"));
  });

  it("removes double-quoted on* event handlers", () => {
    const result = sanitizeHtml('<a href="#" onclick="evil()">click</a>');
    assert.ok(!result.includes("onclick"), "onclick should be stripped");
    assert.ok(!result.includes("evil()"), "handler value should be stripped");
    assert.ok(result.includes("click"), "link text should survive");
  });

  it("removes single-quoted on* event handlers", () => {
    const result = sanitizeHtml("<img src='x.jpg' onerror='alert(1)'>");
    assert.ok(!result.includes("onerror"));
    assert.ok(!result.includes("alert(1)"));
  });

  it("removes all common on* prefixes", () => {
    const handlers = ["onload", "onmouseover", "onfocus", "onblur", "onsubmit"];
    for (const h of handlers) {
      const result = sanitizeHtml(`<div ${h}="bad()">text</div>`);
      assert.ok(!result.includes(h), `${h} should be removed`);
    }
  });

  it("rewrites javascript: href to #", () => {
    const result = sanitizeHtml('<a href="javascript:void(0)">click</a>');
    assert.ok(!result.includes("javascript:"), "javascript: URI should be removed");
    assert.ok(!result.includes('href="javascript:void(0)"'), "unsafe href should be removed");
  });

  it("removes blocked iframe tags entirely", () => {
    const result = sanitizeHtml('<iframe src="javascript:alert(1)"></iframe>');
    assert.ok(!result.includes("<iframe"));
  });

  it("removes unquoted event handlers", () => {
    const result = sanitizeHtml("<img src=x onerror=alert(1)>");
    assert.ok(!result.includes("onerror"));
    assert.ok(!result.includes("alert(1)"));
  });

  it("leaves normal https links untouched", () => {
    const input = '<a href="https://example.com">link</a>';
    assert.ok(sanitizeHtml(input).includes(input));
  });

  it("removes style tags from the sanitized body HTML", () => {
    const input = "<style>body { color: red; }</style><p>text</p>";
    const result = sanitizeHtml(input);
    assert.ok(!result.includes("<style>"));
    assert.ok(result.includes("<p>text</p>"));
  });

  it("preserves HTML with no dangerous content unchanged", () => {
    const input = '<p class="intro">Hello <strong>world</strong></p>';
    assert.ok(sanitizeHtml(input).includes(input));
  });

  it("preserves image src with normal URL", () => {
    const input = '<img src="https://example.com/img.png" alt="photo">';
    assert.ok(sanitizeHtml(input).includes('src="https://example.com/img.png"'));
  });
});

// ---------------------------------------------------------------------------
// extractStyles
// ---------------------------------------------------------------------------

describe("extractStyles", () => {
  it("returns empty string when there are no style blocks", () => {
    assert.equal(extractStyles("<p>hello</p>"), "");
  });

  it("extracts the content of a single style block", () => {
    const result = extractStyles("<style>body { margin: 0 }</style>");
    assert.ok(result.includes("body { margin: 0 }"));
  });

  it("does not include the style tag itself in the output", () => {
    const result = extractStyles("<style>p { color: green }</style>");
    assert.ok(!result.includes("<style>"));
    assert.ok(!result.includes("</style>"));
  });

  it("extracts and joins multiple style blocks", () => {
    const html = "<style>h1 { font-size: 2em }</style><style>p { margin: 0 }</style>";
    const result = extractStyles(html);
    assert.ok(result.includes("h1 { font-size: 2em }"));
    assert.ok(result.includes("p { margin: 0 }"));
  });

  it("handles style tag with type attribute", () => {
    const result = extractStyles('<style type="text/css">a { color: blue }</style>');
    assert.ok(result.includes("a { color: blue }"));
  });

  it("handles multiline style content", () => {
    const result = extractStyles("<style>\nbody {\n  color: red;\n}\n</style>");
    assert.ok(result.includes("color: red;"));
  });

  it("extracts styles from a full HTML document", () => {
    const html = "<html><head><style>.x { display: none }</style></head><body></body></html>";
    const result = extractStyles(html);
    assert.ok(result.includes(".x { display: none }"));
  });

  it("removes dangerous remote and executable CSS", () => {
    const result = extractStyles("<style>@import url(https://evil.test/x.css); .x{background:url(https://evil.test/i.png); width:expression(alert(1));}</style>");
    assert.ok(!result.includes("@import"));
    assert.ok(!result.includes("url("));
    assert.ok(!result.includes("expression("));
  });
});

// ---------------------------------------------------------------------------
// extractBodyContent
// ---------------------------------------------------------------------------

describe("extractBodyContent", () => {
  it("extracts content between <body> tags", () => {
    const result = extractBodyContent("<html><head></head><body><p>hello</p></body></html>");
    assert.equal(result, "<p>hello</p>");
  });

  it("handles body tag with class and other attributes", () => {
    const result = extractBodyContent('<html><body class="main" style="margin:0"><p>hi</p></body></html>');
    assert.equal(result, "<p>hi</p>");
  });

  it("handles multiline body content", () => {
    const html = "<html><body>\n<p>line one</p>\n<p>line two</p>\n</body></html>";
    const result = extractBodyContent(html);
    assert.ok(result.includes("<p>line one</p>"));
    assert.ok(result.includes("<p>line two</p>"));
  });

  it("strips doctype, html, and head wrappers when there is no body tag", () => {
    const html = "<!DOCTYPE html><html><head><title>T</title></head><p>bare content</p></html>";
    const result = extractBodyContent(html);
    assert.ok(result.includes("<p>bare content</p>"));
    assert.ok(!result.includes("<!DOCTYPE"), "doctype should be stripped");
    assert.ok(!result.includes("<html>"), "html tag should be stripped");
    assert.ok(!result.includes("<head>"), "head should be stripped");
  });

  it("returns an HTML fragment as-is when there is no body and no wrappers", () => {
    const result = extractBodyContent("<p>just a paragraph</p>");
    assert.ok(result.includes("<p>just a paragraph</p>"));
  });

  it("returns empty string for an empty body", () => {
    const result = extractBodyContent("<html><body></body></html>");
    assert.equal(result, "");
  });
});

// ---------------------------------------------------------------------------
// resolvePrintBody
// ---------------------------------------------------------------------------

describe("resolvePrintBody", () => {
  function makeEmail(overrides: Record<string, unknown> = {}) {
    return {
      id: "e1",
      threadId: "t1",
      mailboxIds: {},
      subject: "Test",
      from: null,
      to: null,
      cc: null,
      replyTo: null,
      receivedAt: "2024-01-01T00:00:00Z",
      preview: "",
      htmlBody: [],
      textBody: [],
      attachments: [],
      bodyValues: {},
      hasAttachment: false,
      keywords: {},
      size: 0,
      messageId: null,
      ...overrides,
    } as unknown as Email;
  }

  it("resolves html bodyType from htmlBody part", () => {
    const email = makeEmail({
      htmlBody: [{ partId: "p1", type: "text/html" }],
      bodyValues: { p1: { value: "<html><body><p>hello</p></body></html>", charset: "utf-8", isEncodingProblem: false, isTruncated: false } },
    });
    const { bodyType } = resolvePrintBody(email);
    assert.equal(bodyType, "html");
  });

  it("extracts body content from htmlBody HTML", () => {
    const email = makeEmail({
      htmlBody: [{ partId: "p1", type: "text/html" }],
      bodyValues: { p1: { value: "<html><body><p>hello</p></body></html>", charset: "utf-8", isEncodingProblem: false, isTruncated: false } },
    });
    const { bodyHtml } = resolvePrintBody(email);
    assert.equal(bodyHtml, "<p>hello</p>");
  });

  it("extracts styles from htmlBody HTML", () => {
    const email = makeEmail({
      htmlBody: [{ partId: "p1", type: "text/html" }],
      bodyValues: { p1: { value: "<html><head><style>.c{color:red}</style></head><body><p>hi</p></body></html>", charset: "utf-8", isEncodingProblem: false, isTruncated: false } },
    });
    const { emailStyles } = resolvePrintBody(email);
    assert.ok(emailStyles.includes(".c{color:red}"));
  });

  it("sanitizes script tags out of htmlBody", () => {
    const email = makeEmail({
      htmlBody: [{ partId: "p1", type: "text/html" }],
      bodyValues: { p1: { value: '<html><body><script>alert(1)</script><p>safe</p></body></html>', charset: "utf-8", isEncodingProblem: false, isTruncated: false } },
    });
    const { bodyHtml } = resolvePrintBody(email);
    assert.ok(!bodyHtml.includes("<script>"));
    assert.ok(!bodyHtml.includes("alert"));
    assert.ok(bodyHtml.includes("<p>safe</p>"));
  });

  it("sanitizes on* handlers out of htmlBody", () => {
    const email = makeEmail({
      htmlBody: [{ partId: "p1", type: "text/html" }],
      bodyValues: { p1: { value: '<html><body><div onclick="bad()">text</div></body></html>', charset: "utf-8", isEncodingProblem: false, isTruncated: false } },
    });
    const { bodyHtml } = resolvePrintBody(email);
    assert.ok(!bodyHtml.includes("onclick"));
  });

  it("sanitizes unquoted event handlers out of htmlBody", () => {
    const email = makeEmail({
      htmlBody: [{ partId: "p1", type: "text/html" }],
      bodyValues: { p1: { value: "<html><body><img src=x onerror=alert(1)></body></html>", charset: "utf-8", isEncodingProblem: false, isTruncated: false } },
    });
    const { bodyHtml } = resolvePrintBody(email);
    assert.ok(!bodyHtml.includes("onerror"));
    assert.ok(!bodyHtml.includes("alert(1)"));
  });

  it("drops dangerous CSS while preserving printable HTML", () => {
    const email = makeEmail({
      htmlBody: [{ partId: "p1", type: "text/html" }],
      bodyValues: {
        p1: {
          value: '<html><head><style>@import url(https://evil.test/x.css); .hero{background:url(https://evil.test/i.png)}</style></head><body><p class="hero">safe</p></body></html>',
          charset: "utf-8",
          isEncodingProblem: false,
          isTruncated: false,
        },
      },
    });
    const { bodyHtml, emailStyles } = resolvePrintBody(email);
    assert.ok(bodyHtml.includes("<p"));
    assert.ok(!emailStyles.includes("@import"));
    assert.ok(!emailStyles.includes("url("));
  });

  it("falls back to textBody when htmlBody is empty", () => {
    const email = makeEmail({
      textBody: [{ partId: "p1", type: "text/plain" }],
      bodyValues: { p1: { value: "plain text content", charset: "utf-8", isEncodingProblem: false, isTruncated: false } },
    });
    const { bodyType, bodyHtml } = resolvePrintBody(email);
    assert.equal(bodyType, "text");
    assert.ok(bodyHtml.includes("plain text content"));
  });

  it("HTML-escapes < > & in text body", () => {
    const email = makeEmail({
      textBody: [{ partId: "p1", type: "text/plain" }],
      bodyValues: { p1: { value: "<b>bold</b> & stuff", charset: "utf-8", isEncodingProblem: false, isTruncated: false } },
    });
    const { bodyHtml } = resolvePrintBody(email);
    assert.ok(bodyHtml.includes("&lt;b&gt;bold&lt;/b&gt;"));
    assert.ok(bodyHtml.includes("&amp;"));
    assert.ok(!bodyHtml.includes("<b>"));
  });

  it("returns empty emailStyles for text body", () => {
    const email = makeEmail({
      textBody: [{ partId: "p1", type: "text/plain" }],
      bodyValues: { p1: { value: "text", charset: "utf-8", isEncodingProblem: false, isTruncated: false } },
    });
    assert.equal(resolvePrintBody(email).emailStyles, "");
  });

  it("prefers htmlBody over textBody when both are present", () => {
    const email = makeEmail({
      htmlBody: [{ partId: "h1", type: "text/html" }],
      textBody: [{ partId: "t1", type: "text/plain" }],
      bodyValues: {
        h1: { value: "<html><body><p>html version</p></body></html>", charset: "utf-8", isEncodingProblem: false, isTruncated: false },
        t1: { value: "text version", charset: "utf-8", isEncodingProblem: false, isTruncated: false },
      },
    });
    const { bodyType, bodyHtml } = resolvePrintBody(email);
    assert.equal(bodyType, "html");
    assert.ok(bodyHtml.includes("html version"));
    assert.ok(!bodyHtml.includes("text version"));
  });

  it("returns empty strings when no body parts exist", () => {
    const email = makeEmail();
    const { bodyHtml, emailStyles } = resolvePrintBody(email);
    assert.equal(bodyHtml, "");
    assert.equal(emailStyles, "");
  });

  it("returns text bodyType when htmlBody part has no matching bodyValue", () => {
    const email = makeEmail({
      htmlBody: [{ partId: "missing", type: "text/html" }],
      bodyValues: {},
    });
    // Falls through to text path — both empty
    const { bodyHtml } = resolvePrintBody(email);
    assert.equal(bodyHtml, "");
  });
});
