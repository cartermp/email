import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatAddress, formatAddressRFC, formatAddressList } from "../format";

describe("formatAddress", () => {
  it("returns name when present", () => {
    assert.equal(formatAddress({ name: "Alice", email: "alice@example.com" }), "Alice");
  });

  it("falls back to email when name is absent", () => {
    assert.equal(formatAddress({ name: null, email: "alice@example.com" }), "alice@example.com");
  });
});

describe("formatAddressRFC", () => {
  it("produces Name <email> when name is present", () => {
    assert.equal(
      formatAddressRFC({ name: "Alice", email: "alice@example.com" }),
      "Alice <alice@example.com>"
    );
  });

  it("returns bare email when name is absent", () => {
    assert.equal(
      formatAddressRFC({ name: null, email: "alice@example.com" }),
      "alice@example.com"
    );
  });
});

describe("formatAddressList", () => {
  it("returns empty string for null", () => {
    assert.equal(formatAddressList(null), "");
  });

  it("returns empty string for empty array", () => {
    assert.equal(formatAddressList([]), "");
  });

  it("formats a single address", () => {
    assert.equal(
      formatAddressList([{ name: "Alice", email: "alice@example.com" }]),
      "Alice"
    );
  });

  it("joins multiple addresses with comma-space", () => {
    assert.equal(
      formatAddressList([
        { name: "Alice", email: "alice@example.com" },
        { name: null, email: "bob@example.com" },
      ]),
      "Alice, bob@example.com"
    );
  });
});
