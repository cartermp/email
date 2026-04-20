import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyUnreadCountChange,
  getReadEmailIds,
  getUnreadEmailIds,
  isEmailUnread,
} from "../unreadCount";
import { Email } from "../types";

function makeEmail(id: string, seen = false): Email {
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
    inReplyTo: null,
    receivedAt: "2024-01-01T00:00:00Z",
    preview: "",
    bodyValues: {},
    htmlBody: [],
    textBody: [],
    attachments: [],
    hasAttachment: false,
    keywords: seen ? { "$seen": true } : {},
    size: 0,
  };
}

describe("isEmailUnread", () => {
  it("respects optimistic read and unread overrides", () => {
    const email = makeEmail("a", true);

    assert.equal(isEmailUnread(email), false);
    assert.equal(isEmailUnread(email, new Set(), new Set(["a"])), true);
    assert.equal(isEmailUnread(makeEmail("b"), new Set(["b"])), false);
  });
});

describe("getUnreadEmailIds", () => {
  it("returns only emails that are currently unread", () => {
    const emails = [
      makeEmail("a"),
      makeEmail("b", true),
      makeEmail("c", true),
      makeEmail("a"),
    ];

    assert.deepEqual(
      getUnreadEmailIds(emails, new Set(["a"]), new Set(["c"])),
      ["c"]
    );
  });
});

describe("getReadEmailIds", () => {
  it("returns only emails that are currently read", () => {
    const emails = [
      makeEmail("a"),
      makeEmail("b", true),
      makeEmail("c", true),
    ];

    assert.deepEqual(
      getReadEmailIds(emails, new Set(["a"]), new Set(["c"])),
      ["a", "b"]
    );
  });
});

describe("applyUnreadCountChange", () => {
  it("increments and decrements with deduping and clamping", () => {
    assert.equal(applyUnreadCountChange(5, "read", ["a", "a", "b"]), 3);
    assert.equal(applyUnreadCountChange(5, "unread", ["a", "a", "b"]), 7);
    assert.equal(applyUnreadCountChange(1, "read", ["a", "b"]), 0);
  });
});
