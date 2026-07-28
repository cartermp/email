"use server";

import { auth } from "@/auth";
import { getSession, getAccountId, getMailboxes, listEmails, loadMoreEmailsFiltered, searchEmails, setPin, setKeywordsOnMany, moveEmailsToMailbox, getInboxSnapshot, destroyAllEmailsInMailbox, destroyEmails, getEmailMailboxIds } from "@/lib/jmap";
import { parseSearchQuery, buildJmapFilter } from "@/lib/search";
import { log } from "@/lib/logger";
import { Email } from "@/lib/types";
import type { InboxSnapshot } from "@/lib/mailAutoSync";

async function requireAuthedJmap() {
  const sessionData = await auth();
  if (!sessionData?.user) throw new Error("Unauthorized");
  const session = await getSession();
  return { session, accountId: getAccountId(session) };
}

export async function loadMoreEmails(
  inboxId: string,
  position: number
): Promise<{ emails: Email[]; total: number }> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  const result = await listEmails(session.apiUrl, accountId, inboxId, 50, position);
  log.info({ mailbox_id: inboxId, position, limit: 50, returned: result.emails.length, total: result.total, duration_ms: Date.now() - t }, "action.load_more");
  return result;
}

export async function checkInboxForNewMail(
  inboxId: string,
): Promise<InboxSnapshot> {
  if (!inboxId) return { latestEmailId: null, total: 0 };
  const { session, accountId } = await requireAuthedJmap();
  return getInboxSnapshot(session.apiUrl, accountId, inboxId);
}

export async function loadMoreUnreads(
  inboxId: string,
  position: number
): Promise<{ emails: Email[]; total: number }> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  const result = await loadMoreEmailsFiltered(session.apiUrl, accountId, inboxId, "unread", position);
  log.info({ mailbox_id: inboxId, filter: "unread", position, limit: 50, returned: result.emails.length, total: result.total, duration_ms: Date.now() - t }, "action.load_more");
  return result;
}

export async function loadMoreReads(
  inboxId: string,
  position: number
): Promise<{ emails: Email[]; total: number }> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  const result = await loadMoreEmailsFiltered(session.apiUrl, accountId, inboxId, "read", position);
  log.info({ mailbox_id: inboxId, filter: "read", position, limit: 50, returned: result.emails.length, total: result.total, duration_ms: Date.now() - t }, "action.load_more");
  return result;
}

export async function searchEmailsAction(query: string): Promise<Email[]> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  const parsed = parseSearchQuery(query);
  const filter = buildJmapFilter(parsed);
  const results = await searchEmails(session.apiUrl, accountId, filter);
  log.info({ query_len: query.length, results: results.length, duration_ms: Date.now() - t }, "action.search");
  return results;
}

export async function togglePinAction(
  emailId: string,
  pin: boolean
): Promise<void> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  await setPin(session.apiUrl, accountId, emailId, pin);
  log.info({ email_id: emailId, pin, duration_ms: Date.now() - t }, "action.toggle_pin");
}

export async function bulkMarkAsRead(emailIds: string[]): Promise<void> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  await setKeywordsOnMany(session.apiUrl, accountId, emailIds, { "keywords/$seen": true });
  log.info({ count: emailIds.length, duration_ms: Date.now() - t }, "action.mark_read");
}

export async function bulkMarkAsUnread(emailIds: string[]): Promise<void> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  await setKeywordsOnMany(session.apiUrl, accountId, emailIds, { "keywords/$seen": null });
  log.info({ count: emailIds.length, duration_ms: Date.now() - t }, "action.mark_unread");
}

export async function bulkSetPin(emailIds: string[], pin: boolean): Promise<void> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  await setKeywordsOnMany(session.apiUrl, accountId, emailIds, {
    "keywords/$flagged": pin ? true : null,
  });
  log.info({ count: emailIds.length, pin, duration_ms: Date.now() - t }, "action.bulk_pin");
}

export async function bulkMoveToMailbox(
  emails: { id: string; mailboxIds: Record<string, boolean> }[],
  targetMailboxId: string
): Promise<void> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  const mailboxes = await getMailboxes(session.apiUrl, accountId);
  if (!mailboxes.some((mailbox) => mailbox.id === targetMailboxId)) {
    throw new Error("Invalid mailbox");
  }
  await moveEmailsToMailbox(session.apiUrl, accountId, emails, targetMailboxId);
  log.info({ count: emails.length, target_mailbox_id: targetMailboxId, duration_ms: Date.now() - t }, "action.move_emails");
}

async function requireTrashMailbox(
  apiUrl: string,
  accountId: string,
  trashMailboxId: string,
) {
  const mailboxes = await getMailboxes(apiUrl, accountId);
  const trash = mailboxes.find(
    (mailbox) =>
      mailbox.id === trashMailboxId && mailbox.role === "trash",
  );
  if (!trash) throw new Error("Invalid trash mailbox");
  return trash;
}

export async function permanentlyDeleteEmailsAction(
  emailIds: string[],
  trashMailboxId: string,
): Promise<void> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  if (!Array.isArray(emailIds) || typeof trashMailboxId !== "string") {
    throw new Error("Invalid permanent delete request");
  }
  const ids = [
    ...new Set(
      emailIds
        .slice(0, 500)
        .filter((emailId): emailId is string => typeof emailId === "string" && !!emailId),
    ),
  ];
  if (!ids.length) return;
  await requireTrashMailbox(session.apiUrl, accountId, trashMailboxId);
  const emails = await getEmailMailboxIds(session.apiUrl, accountId, ids);
  if (
    emails.length !== ids.length ||
    emails.some((email) => !email.mailboxIds[trashMailboxId])
  ) {
    throw new Error("Only messages in Trash can be permanently deleted");
  }
  await destroyEmails(session.apiUrl, accountId, ids);
  log.info(
    { count: ids.length, duration_ms: Date.now() - t },
    "action.destroy_emails",
  );
}

export async function emptyTrashAction(
  trashMailboxId: string,
): Promise<{ destroyed: number }> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  if (typeof trashMailboxId !== "string" || !trashMailboxId) {
    throw new Error("Invalid trash mailbox");
  }
  await requireTrashMailbox(session.apiUrl, accountId, trashMailboxId);
  const destroyed = await destroyAllEmailsInMailbox(
    session.apiUrl,
    accountId,
    trashMailboxId,
  );
  log.info(
    { count: destroyed, duration_ms: Date.now() - t },
    "action.empty_trash",
  );
  return { destroyed };
}
