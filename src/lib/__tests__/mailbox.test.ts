import assert from "node:assert/strict";
import test from "node:test";
import {
  getMailboxIds,
  getMailboxViewForEmail,
  getMailView,
  isMailViewActive,
  resolveMailboxes,
} from "../mailbox";
import type { Mailbox } from "../types";

function mailbox(
  id: string,
  name: string,
  role: string | null,
): Mailbox {
  return {
    id,
    name,
    role,
    totalEmails: 0,
    unreadEmails: 0,
    parentId: null,
    sortOrder: 0,
  };
}

test("resolves all system mailbox roles in one place", () => {
  const resolved = resolveMailboxes([
    mailbox("i", "Inbox", "inbox"),
    mailbox("d", "Drafts", "drafts"),
    mailbox("s", "Sent", "sent"),
    mailbox("a", "Archive", "archive"),
    mailbox("t", "Trash", "trash"),
    mailbox("j", "Junk Mail", "junk"),
  ]);

  assert.deepEqual(getMailboxIds(resolved), {
    inbox: "i",
    drafts: "d",
    sent: "s",
    archive: "a",
    trash: "t",
    spam: "j",
  });
});

test("falls back to a named Spam mailbox when the server omits its role", () => {
  const resolved = resolveMailboxes([
    mailbox("custom-spam", "Spam", null),
  ]);
  assert.equal(resolved.spam?.id, "custom-spam");
});

test("uses one view resolver for list, reader, and navigation routes", () => {
  assert.equal(getMailView("/thread/t1", "archive"), "archive");
  assert.equal(getMailView("/email/e1", "trash"), "trash");
  assert.equal(getMailView("/sent"), "sent");
  assert.equal(getMailView("/email/e1"), "inbox");
  assert.equal(isMailViewActive("inbox", "/thread/t1", null), true);
  assert.equal(isMailViewActive("inbox", "/thread/t1", "spam"), false);
  assert.equal(isMailViewActive("spam", "/thread/t1", "spam"), true);
});

test("maps an email back to its system view using the shared mailbox ids", () => {
  assert.equal(
    getMailboxViewForEmail(
      { "archive-id": true },
      { inbox: "inbox-id", archive: "archive-id" },
    ),
    "archive",
  );
});
