import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isPinned, sortEmailsByPin, mergeEmailUpdates } from "../emailList";
import { Email } from "../types";

function makeEmail(id: string, overrides: Partial<Email> = {}): Email {
  return {
    id,
    messageId: null,
    threadId: `t-${id}`,
    mailboxIds: {},
    subject: `Subject ${id}`,
    from: null,
    to: null,
    cc: null,
    replyTo: null,
    receivedAt: "2024-01-01T00:00:00Z",
    preview: "",
    bodyValues: {},
    htmlBody: [],
    textBody: [],
    attachments: [],
    hasAttachment: false,
    keywords: {},
    size: 0,
    ...overrides,
  };
}

describe("isPinned", () => {
  it("returns true when $flagged keyword is set", () => {
    const email = makeEmail("1", { keywords: { "$flagged": true } });
    assert.equal(isPinned(email), true);
  });

  it("returns false when $flagged is absent", () => {
    const email = makeEmail("1", { keywords: {} });
    assert.equal(isPinned(email), false);
  });

  it("returns false when keywords is empty", () => {
    const email = makeEmail("1");
    assert.equal(isPinned(email), false);
  });

  it("returns false when keywords is undefined", () => {
    const email = makeEmail("1", { keywords: undefined as unknown as Record<string, boolean> });
    assert.equal(isPinned(email), false);
  });
});

describe("sortEmailsByPin", () => {
  it("places pinned emails before unpinned", () => {
    const a = makeEmail("a", { keywords: {} });
    const b = makeEmail("b", { keywords: { "$flagged": true } });
    const c = makeEmail("c", { keywords: {} });
    const result = sortEmailsByPin([a, b, c]);
    assert.equal(result[0].id, "b");
  });

  it("preserves relative order within the pinned group", () => {
    const a = makeEmail("a", { keywords: { "$flagged": true } });
    const b = makeEmail("b", { keywords: { "$flagged": true } });
    const result = sortEmailsByPin([a, b]);
    assert.equal(result[0].id, "a");
    assert.equal(result[1].id, "b");
  });

  it("preserves relative order within the unpinned group", () => {
    const a = makeEmail("a");
    const b = makeEmail("b");
    const result = sortEmailsByPin([a, b]);
    assert.equal(result[0].id, "a");
    assert.equal(result[1].id, "b");
  });

  it("does not mutate the input array", () => {
    const emails = [makeEmail("a"), makeEmail("b", { keywords: { "$flagged": true } })];
    sortEmailsByPin(emails);
    assert.equal(emails[0].id, "a");
  });

  it("handles an empty list", () => {
    assert.deepEqual(sortEmailsByPin([]), []);
  });

  it("handles a list with no pinned emails", () => {
    const emails = [makeEmail("a"), makeEmail("b")];
    const result = sortEmailsByPin(emails);
    assert.deepEqual(result.map((e) => e.id), ["a", "b"]);
  });

  it("handles a list where all emails are pinned", () => {
    const emails = [
      makeEmail("a", { keywords: { "$flagged": true } }),
      makeEmail("b", { keywords: { "$flagged": true } }),
    ];
    const result = sortEmailsByPin(emails);
    assert.deepEqual(result.map((e) => e.id), ["a", "b"]);
  });
});

describe("mergeEmailUpdates", () => {
  it("replaces emails present in fresh with updated versions", () => {
    const prev = [makeEmail("1", { subject: "old" }), makeEmail("2")];
    const fresh = [makeEmail("1", { subject: "new" })];
    const result = mergeEmailUpdates(prev, fresh);
    assert.equal(result[0].subject, "new");
    assert.equal(result[1].id, "2");
  });

  it("keeps emails not in fresh unchanged", () => {
    const prev = [makeEmail("1"), makeEmail("2")];
    const fresh = [makeEmail("1")];
    const result = mergeEmailUpdates(prev, fresh);
    assert.equal(result.length, 2);
    assert.equal(result[1].id, "2");
  });

  it("does not add emails from fresh that are not in prev", () => {
    const prev = [makeEmail("1")];
    const fresh = [makeEmail("1"), makeEmail("2")];
    const result = mergeEmailUpdates(prev, fresh);
    assert.equal(result.length, 1);
  });

  it("updates keywords on merge (pin state propagates)", () => {
    const prev = [makeEmail("1", { keywords: {} })];
    const fresh = [makeEmail("1", { keywords: { "$flagged": true } })];
    const result = mergeEmailUpdates(prev, fresh);
    assert.equal(isPinned(result[0]), true);
  });

  it("removes keywords on merge (unpin state propagates)", () => {
    const prev = [makeEmail("1", { keywords: { "$flagged": true } })];
    const fresh = [makeEmail("1", { keywords: {} })];
    const result = mergeEmailUpdates(prev, fresh);
    assert.equal(isPinned(result[0]), false);
  });

  it("handles empty prev", () => {
    assert.deepEqual(mergeEmailUpdates([], [makeEmail("1")]), []);
  });

  it("handles empty fresh", () => {
    const prev = [makeEmail("1")];
    const result = mergeEmailUpdates(prev, []);
    assert.equal(result.length, 1);
  });
});
