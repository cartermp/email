import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseSearchQuery, buildJmapFilter } from "../search";

describe("parseSearchQuery", () => {
  it("returns plain text as-is", () => {
    assert.deepEqual(parseSearchQuery("hello world"), { text: "hello world" });
  });

  it("extracts from: prefix", () => {
    assert.deepEqual(parseSearchQuery("from:alice@example.com"), {
      from: "alice@example.com",
    });
  });

  it("extracts to: prefix", () => {
    assert.deepEqual(parseSearchQuery("to:bob"), { to: "bob" });
  });

  it("extracts cc: prefix", () => {
    assert.deepEqual(parseSearchQuery("cc:carol"), { cc: "carol" });
  });

  it("extracts subject: prefix", () => {
    assert.deepEqual(parseSearchQuery("subject:invoice"), { subject: "invoice" });
  });

  it("combines a prefix with remaining text", () => {
    assert.deepEqual(parseSearchQuery("from:alice hello world"), {
      from: "alice",
      text: "hello world",
    });
  });

  it("combines multiple prefixes", () => {
    assert.deepEqual(parseSearchQuery("from:alice to:bob"), {
      from: "alice",
      to: "bob",
    });
  });

  it("combines multiple prefixes with remaining text", () => {
    const result = parseSearchQuery("from:alice to:bob invoices");
    assert.equal(result.from, "alice");
    assert.equal(result.to, "bob");
    assert.equal(result.text, "invoices");
  });

  it("handles quoted values", () => {
    assert.deepEqual(parseSearchQuery('subject:"quarterly report"'), {
      subject: "quarterly report",
    });
  });

  it("is case-insensitive for prefixes", () => {
    const result = parseSearchQuery("FROM:alice");
    assert.equal(result.from, "alice");
  });

  it("returns empty object for empty string", () => {
    assert.deepEqual(parseSearchQuery(""), {});
  });

  it("returns empty object for whitespace-only string", () => {
    assert.deepEqual(parseSearchQuery("   "), {});
  });
});

describe("buildJmapFilter", () => {
  it("returns a single condition without AND wrapper", () => {
    const filter = buildJmapFilter({ text: "hello" });
    assert.deepEqual(filter, { text: "hello" });
  });

  it("wraps multiple conditions in AND", () => {
    const filter = buildJmapFilter({ from: "alice", text: "hello" });
    assert.deepEqual(filter, {
      operator: "AND",
      conditions: [{ from: "alice" }, { text: "hello" }],
    });
  });

  it("returns empty object when nothing is set", () => {
    assert.deepEqual(buildJmapFilter({}), {});
  });

  it("includes all supported fields", () => {
    const filter = buildJmapFilter({
      from: "a",
      to: "b",
      cc: "c",
      subject: "d",
      text: "e",
    });
    assert.equal((filter as { operator: string }).operator, "AND");
    const conds = (filter as { conditions: unknown[] }).conditions;
    assert.equal(conds.length, 5);
  });
});
