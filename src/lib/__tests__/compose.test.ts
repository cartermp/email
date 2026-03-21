import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  reSubject,
  fwdSubject,
  buildReplyQuote,
  buildForwardQuote,
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
