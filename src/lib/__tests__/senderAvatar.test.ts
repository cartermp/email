import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { colorFor, initialsFor, PALETTE, WEBMAIL_DOMAINS } from "../senderAvatar";
import { EmailAddress } from "../types";

function addr(email: string, name?: string): EmailAddress {
  return { email, name: name ?? null };
}

// ---------------------------------------------------------------------------
// colorFor
// ---------------------------------------------------------------------------

describe("colorFor", () => {
  it("returns a value from the palette", () => {
    const c = colorFor("alice@example.com");
    assert.ok(PALETTE.includes(c), `${c} not in palette`);
  });

  it("returns the same color for the same input (deterministic)", () => {
    assert.equal(colorFor("bob@example.com"), colorFor("bob@example.com"));
  });

  it("returns a string for the empty seed", () => {
    const c = colorFor("");
    assert.ok(PALETTE.includes(c));
  });

  it("returns distinct colors for most different inputs", () => {
    // Not guaranteed for all pairs, but these specific values should differ
    // because the palette is 12-wide and inputs hash to different buckets.
    const colors = new Set(["alice@a.com", "bob@b.com", "carol@c.com", "dan@d.com"].map(colorFor));
    assert.ok(colors.size > 1, "expected at least two distinct colors across four senders");
  });

  it("is consistent across calls within the same process", () => {
    const seed = "test@example.com";
    const results = Array.from({ length: 5 }, () => colorFor(seed));
    assert.ok(results.every((c) => c === results[0]));
  });
});

// ---------------------------------------------------------------------------
// initialsFor
// ---------------------------------------------------------------------------

describe("initialsFor", () => {
  it("returns ? for null from", () => {
    assert.equal(initialsFor(null), "?");
  });

  it("returns ? for empty array", () => {
    assert.equal(initialsFor([]), "?");
  });

  it("uses first and last initial for a two-word name", () => {
    assert.equal(initialsFor([addr("a@b.com", "Alice Smith")]), "AS");
  });

  it("uses first and last initial for a three-word name", () => {
    assert.equal(initialsFor([addr("a@b.com", "Mary Jo Baker")]), "MB");
  });

  it("uses first two characters for a single-word name", () => {
    assert.equal(initialsFor([addr("a@b.com", "Prince")]), "PR");
  });

  it("uppercases the result", () => {
    assert.equal(initialsFor([addr("a@b.com", "alice smith")]), "AS");
  });

  it("falls back to first two chars of email when name is absent", () => {
    assert.equal(initialsFor([addr("bob@example.com")]), "BO");
  });

  it("falls back to email when name is an empty string", () => {
    assert.equal(initialsFor([addr("charlie@example.com", "")]), "CH");
  });

  it("falls back to email when name is only whitespace", () => {
    assert.equal(initialsFor([addr("dave@example.com", "   ")]), "DA");
  });

  it("only uses the first sender", () => {
    assert.equal(
      initialsFor([addr("a@b.com", "Alice Smith"), addr("x@y.com", "Xavier Young")]),
      "AS"
    );
  });
});

// ---------------------------------------------------------------------------
// WEBMAIL_DOMAINS
// ---------------------------------------------------------------------------

describe("WEBMAIL_DOMAINS", () => {
  it("includes common webmail providers", () => {
    for (const domain of ["gmail.com", "outlook.com", "icloud.com", "proton.me", "fastmail.com"]) {
      assert.ok(WEBMAIL_DOMAINS.has(domain), `expected ${domain} to be in WEBMAIL_DOMAINS`);
    }
  });

  it("does not include company domains", () => {
    for (const domain of ["example.com", "acme.io", "stripe.com", "github.com"]) {
      assert.ok(!WEBMAIL_DOMAINS.has(domain), `${domain} should not be in WEBMAIL_DOMAINS`);
    }
  });

  it("is case-sensitive (domains are stored lowercase)", () => {
    assert.ok(!WEBMAIL_DOMAINS.has("Gmail.com"));
    assert.ok(WEBMAIL_DOMAINS.has("gmail.com"));
  });
});
