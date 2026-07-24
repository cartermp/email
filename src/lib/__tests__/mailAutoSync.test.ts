import assert from "node:assert/strict";
import test from "node:test";
import {
  canRunImmediateMailSync,
  getInboxSnapshot,
  getMailAutoSyncDelay,
  inboxSnapshotKey,
} from "../mailAutoSync";
import type { Email } from "../types";

function email(id: string, receivedAt: string): Email {
  return {
    id,
    messageId: [`${id}@example.test`],
    threadId: `thread-${id}`,
    mailboxIds: { inbox: true },
    subject: id,
    from: null,
    to: null,
    cc: null,
    replyTo: null,
    inReplyTo: null,
    receivedAt,
    preview: "",
    bodyValues: {},
    htmlBody: [],
    textBody: [],
    attachments: [],
    hasAttachment: false,
    keywords: {},
    size: 0,
  };
}

test("builds a stable inbox snapshot from the newest loaded email and totals", () => {
  const snapshot = getInboxSnapshot(
    [email("newest", "2026-07-24T18:00:00.000Z")],
    4,
    [email("older", "2026-07-24T17:00:00.000Z")],
    9,
  );

  assert.deepEqual(snapshot, { latestEmailId: "newest", total: 13 });
  assert.equal(inboxSnapshotKey(snapshot), "13:newest");
});

test("backs off failed background checks without exceeding two minutes", () => {
  assert.equal(getMailAutoSyncDelay(0, 15_000), 15_000);
  assert.equal(getMailAutoSyncDelay(1, 15_000), 30_000);
  assert.equal(getMailAutoSyncDelay(3, 15_000), 120_000);
  assert.equal(getMailAutoSyncDelay(20, 15_000), 120_000);
});

test("throttles immediate checks triggered by repeated focus events", () => {
  assert.equal(canRunImmediateMailSync(10_000, 14_999), false);
  assert.equal(canRunImmediateMailSync(10_000, 15_000), true);
});
