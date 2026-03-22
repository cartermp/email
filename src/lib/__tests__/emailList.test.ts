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

// ---------------------------------------------------------------------------
// Inbox display order: pinned → unread (not pinned) → read (not pinned)
// ---------------------------------------------------------------------------
// This mirrors the allInboxEmails memo in EmailListPanel so we can verify the
// ordering logic in isolation without a browser environment.

function buildInboxOrder(
  pinnedEmails: Email[],
  allUnreads: Email[],
  allReads: Email[]
): Email[] {
  const pinnedIds = new Set(pinnedEmails.map((e) => e.id));
  const seenIds = new Set<string>();
  const result: Email[] = [];
  const add = (e: Email) => {
    if (!seenIds.has(e.id)) {
      seenIds.add(e.id);
      result.push(e);
    }
  };
  pinnedEmails.forEach(add);
  allUnreads.filter((e) => !pinnedIds.has(e.id)).forEach(add);
  allReads.filter((e) => !pinnedIds.has(e.id)).forEach(add);
  return result;
}

describe("inbox display order (pinned → unread → read)", () => {
  it("places pinned emails first regardless of read state", () => {
    const pinned = makeEmail("p1", { keywords: { "$flagged": true, "$seen": true } });
    const unread = makeEmail("u1", { keywords: {} });
    const read = makeEmail("r1", { keywords: { "$seen": true } });
    const result = buildInboxOrder([pinned], [unread], [read]);
    assert.equal(result[0].id, "p1");
  });

  it("places unreads before reads when there are no pinned emails", () => {
    const u1 = makeEmail("u1", { keywords: {} });
    const u2 = makeEmail("u2", { keywords: {} });
    const r1 = makeEmail("r1", { keywords: { "$seen": true } });
    const result = buildInboxOrder([], [u1, u2], [r1]);
    assert.deepEqual(result.map((e) => e.id), ["u1", "u2", "r1"]);
  });

  it("excludes pinned emails from the unread and read sections", () => {
    const pinned = makeEmail("p1", { keywords: { "$flagged": true } });
    const result = buildInboxOrder([pinned], [pinned], []);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, "p1");
  });

  it("deduplicates emails that appear in multiple buckets", () => {
    const email = makeEmail("dup", { keywords: {} });
    const result = buildInboxOrder([], [email, email], []);
    assert.equal(result.length, 1);
  });

  it("preserves chronological order within the unread section", () => {
    // Server returns newest-first; verify relative order is preserved
    const u1 = makeEmail("u1", { receivedAt: "2024-03-01T00:00:00Z" });
    const u2 = makeEmail("u2", { receivedAt: "2024-02-01T00:00:00Z" });
    const result = buildInboxOrder([], [u1, u2], []);
    assert.deepEqual(result.map((e) => e.id), ["u1", "u2"]);
  });

  it("preserves chronological order within the read section", () => {
    const r1 = makeEmail("r1", { receivedAt: "2024-03-01T00:00:00Z", keywords: { "$seen": true } });
    const r2 = makeEmail("r2", { receivedAt: "2024-02-01T00:00:00Z", keywords: { "$seen": true } });
    const result = buildInboxOrder([], [], [r1, r2]);
    assert.deepEqual(result.map((e) => e.id), ["r1", "r2"]);
  });

  it("returns empty list when all buckets are empty", () => {
    const result = buildInboxOrder([], [], []);
    assert.deepEqual(result, []);
  });

  it("handles only reads with no unreads or pinned", () => {
    const r1 = makeEmail("r1", { keywords: { "$seen": true } });
    const result = buildInboxOrder([], [], [r1]);
    assert.deepEqual(result.map((e) => e.id), ["r1"]);
  });

  it("orders: pinned first, then unread, then read", () => {
    const pinned = makeEmail("p", { keywords: { "$flagged": true } });
    const unread = makeEmail("u", { keywords: {} });
    const read   = makeEmail("r", { keywords: { "$seen": true } });
    const result = buildInboxOrder([pinned], [unread], [read]);
    assert.deepEqual(result.map((e) => e.id), ["p", "u", "r"]);
  });
});
