import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  reSubject,
  fwdSubject,
  addrList,
  buildReplyQuote,
  buildForwardQuote,
  htmlToPlainText,
  normalizeComposeMarkdown,
  stripSignatureSeparator,
} from "../compose";

describe("reSubject", () => {
  it("prefixes plain subjects", () => {
    assert.equal(reSubject("Hello"), "Re: Hello");
  });

  it("does not double-prefix", () => {
    assert.equal(reSubject("Re: Hello"), "Re: Hello");
  });

  it("is case-insensitive", () => {
    assert.equal(reSubject("RE: Hello"), "RE: Hello");
    assert.equal(reSubject("re: Hello"), "re: Hello");
  });

  it("handles null subject", () => {
    assert.equal(reSubject(null), "Re: ");
  });
});

describe("fwdSubject", () => {
  it("prefixes plain subjects", () => {
    assert.equal(fwdSubject("Hello"), "Fwd: Hello");
  });

  it("does not double-prefix Fwd:", () => {
    assert.equal(fwdSubject("Fwd: Hello"), "Fwd: Hello");
  });

  it("does not double-prefix Fw:", () => {
    assert.equal(fwdSubject("Fw: Hello"), "Fw: Hello");
  });

  it("is case-insensitive", () => {
    assert.equal(fwdSubject("FWD: Hello"), "FWD: Hello");
  });

  it("handles null subject", () => {
    assert.equal(fwdSubject(null), "Fwd: ");
  });
});

describe("addrList", () => {
  it("returns empty string for null", () => {
    assert.equal(addrList(null), "");
  });

  it("returns empty string for empty array", () => {
    assert.equal(addrList([]), "");
  });

  it("formats a named address as Name <email>", () => {
    assert.equal(
      addrList([{ name: "Alice", email: "alice@example.com" }]),
      "Alice <alice@example.com>"
    );
  });

  it("joins multiple addresses with comma-space", () => {
    assert.equal(
      addrList([
        { name: "Alice", email: "alice@example.com" },
        { name: null, email: "bob@example.com" },
      ]),
      "Alice <alice@example.com>, bob@example.com"
    );
  });
});

describe("buildReplyQuote", () => {
  it("quotes each body line with >", () => {
    const result = buildReplyQuote("Mon Jan 1", "alice@example.com", "line1\nline2");
    assert.ok(result.includes("> line1\n> line2"), `got: ${result}`);
  });

  it("includes the attribution line", () => {
    const result = buildReplyQuote("Mon Jan 1", "Alice <alice@example.com>", "body");
    assert.ok(result.includes("On Mon Jan 1, Alice <alice@example.com> wrote:"));
  });

  it("trims trailing newlines from body before quoting", () => {
    const result = buildReplyQuote("date", "from", "body\n\n");
    // trailing blank lines should not produce empty quoted lines at the end
    assert.ok(!result.endsWith("> \n> "), `unexpected trailing quoted blanks: ${result}`);
  });
});

describe("htmlToPlainText", () => {
  it("converts <br> to newlines", () => {
    assert.equal(htmlToPlainText("line1<br>line2"), "line1\nline2");
    assert.equal(htmlToPlainText("line1<br/>line2"), "line1\nline2");
  });

  it("converts block elements to newlines", () => {
    const result = htmlToPlainText("<p>para one</p><p>para two</p>");
    assert.ok(result.includes("para one"));
    assert.ok(result.includes("para two"));
    assert.ok(result.includes("\n"));
  });

  it("strips tags", () => {
    assert.equal(htmlToPlainText("<b>bold</b> and <i>italic</i>"), "bold and italic");
  });

  it("decodes common HTML entities", () => {
    assert.equal(htmlToPlainText("a &amp; b &lt;c&gt; &quot;d&quot; &nbsp;e"), 'a & b <c> "d"  e');
  });

  it("collapses more than two consecutive newlines", () => {
    const result = htmlToPlainText("<p>a</p><p></p><p></p><p>b</p>");
    assert.ok(!result.includes("\n\n\n"), `got: ${JSON.stringify(result)}`);
  });

  it("trims leading and trailing whitespace", () => {
    assert.equal(htmlToPlainText("  <p>hello</p>  "), "hello");
  });

  it("handles uppercase tags", () => {
    assert.equal(htmlToPlainText("<B>bold</B> text<BR>next"), "bold text\nnext");
  });

  it("decodes &#39; and &apos; as apostrophe", () => {
    assert.equal(htmlToPlainText("it&#39;s &apos;fine&apos;"), "it's 'fine'");
  });

  it("returns empty string for empty input", () => {
    assert.equal(htmlToPlainText(""), "");
  });
});

describe("buildForwardQuote", () => {
  it("includes all header fields", () => {
    const result = buildForwardQuote({
      from: "Alice <alice@example.com>",
      to: "Bob <bob@example.com>",
      date: "Mon Jan 1",
      subject: "Hello",
      body: "original body",
    });
    assert.ok(result.includes("**From:** Alice <alice@example.com>"));
    assert.ok(result.includes("**To:** Bob <bob@example.com>"));
    assert.ok(result.includes("**Date:** Mon Jan 1"));
    assert.ok(result.includes("**Subject:** Hello"));
    assert.ok(result.includes("original body"));
  });
});

describe("stripSignatureSeparator", () => {
  it("strips a single `-- \\n` prefix", () => {
    assert.equal(stripSignatureSeparator("-- \nPhillip\nhttps://example.com"), "Phillip\nhttps://example.com");
  });

  it("strips multiple stacked `-- \\n` prefixes (regression: double-separator bug)", () => {
    // Fastmail stores `-- \n` + content; if content itself starts with `-- \n`
    // (e.g. user saved the separator as part of their signature), stripping
    // must remove all leading occurrences, not just one.
    assert.equal(
      stripSignatureSeparator("-- \n-- \nPhillip\nhttps://example.com"),
      "Phillip\nhttps://example.com"
    );
  });

  it("strips `--\\n` without trailing space", () => {
    assert.equal(stripSignatureSeparator("--\nPhillip"), "Phillip");
  });

  it("strips `--\\t\\n` with a tab", () => {
    assert.equal(stripSignatureSeparator("--\t\nPhillip"), "Phillip");
  });

  it("strips CRLF variant `-- \\r\\n`", () => {
    assert.equal(stripSignatureSeparator("-- \r\nPhillip"), "Phillip");
  });

  it("leaves content alone when there is no separator prefix", () => {
    assert.equal(stripSignatureSeparator("Phillip\nhttps://example.com"), "Phillip\nhttps://example.com");
  });

  it("returns empty string for empty input", () => {
    assert.equal(stripSignatureSeparator(""), "");
  });

  it("trims leading whitespace after stripping the separator", () => {
    assert.equal(stripSignatureSeparator("-- \n  Phillip"), "Phillip");
  });
});

describe("normalizeComposeMarkdown", () => {
  it("escapes standalone signature separator lines", () => {
    assert.equal(
      normalizeComposeMarkdown("Hello\n-- \nPhillip"),
      "Hello\n&#45;&#45;\nPhillip"
    );
  });

  it("escapes signature separators without trailing spaces", () => {
    assert.equal(
      normalizeComposeMarkdown("Hello\n--\nPhillip"),
      "Hello\n&#45;&#45;\nPhillip"
    );
  });

  it("does not alter other markdown content", () => {
    assert.equal(
      normalizeComposeMarkdown("## Heading\n\n---\n\nvalue -- detail"),
      "## Heading\n\n---\n\nvalue -- detail"
    );
  });
});
