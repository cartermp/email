import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import SenderAvatar from "../../components/SenderAvatar";
import {
  avatarDomainCandidates,
  colorFor,
  initialsFor,
  normalizeAvatarDomain,
  PALETTE,
  senderAvatarDomain,
  senderAvatarUrl,
} from "../senderAvatar";
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

describe("sender artwork", () => {
  it("extracts a normalized sender domain", () => {
    assert.equal(
      senderAvatarDomain("updates@MAIL.GitHub.com"),
      "mail.github.com",
    );
  });

  it("does not use mailbox-provider branding for a person", () => {
    assert.equal(senderAvatarDomain("person@gmail.com"), null);
    assert.equal(senderAvatarDomain("person@fastmail.com"), null);
    assert.equal(senderAvatarUrl([addr("person@yahoo.com")]), null);
  });

  it("rejects malformed, private, and reserved domains", () => {
    assert.equal(normalizeAvatarDomain("localhost"), null);
    assert.equal(normalizeAvatarDomain("127.0.0.1"), null);
    assert.equal(normalizeAvatarDomain("mail.example.test"), null);
    assert.equal(normalizeAvatarDomain("bad_domain.com"), null);
  });

  it("tries a sender subdomain before its organization domain", () => {
    assert.deepEqual(avatarDomainCandidates("tracking.usps.com"), [
      "tracking.usps.com",
      "usps.com",
    ]);
    assert.deepEqual(avatarDomainCandidates("alerts.company.co.uk"), [
      "alerts.company.co.uk",
      "company.co.uk",
    ]);
    assert.deepEqual(avatarDomainCandidates("github.com"), ["github.com"]);
  });
});

describe("SenderAvatar", () => {
  it("renders initials beneath a same-origin sender image", () => {
    const from = [addr("octocat@github.com", "GitHub Octocat")];
    const first = renderToStaticMarkup(
      createElement(SenderAvatar, { from, size: 36 }),
    );
    const second = renderToStaticMarkup(
      createElement(SenderAvatar, { from, size: 36 }),
    );

    assert.equal(first, second);
    assert.match(first, />GO</);
    assert.match(first, /<img/);
    assert.match(first, /src="\/api\/avatar\?domain=github\.com&amp;v=3"/);
    assert.ok(!first.includes("http://"));
    assert.ok(!first.includes("https://"));
  });

  it("renders only initials when a sender has no representative artwork", () => {
    const markup = renderToStaticMarkup(
      createElement(SenderAvatar, {
        from: [addr("phillip@gmail.com", "Phillip Carter")],
        size: 36,
      }),
    );

    assert.match(markup, />PC</);
    assert.ok(!markup.includes("<img"));
    assert.match(markup, /data-avatar-state="failed"/);
  });
});
