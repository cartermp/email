"use server";

import { getSession, getAccountId, listEmails, loadMoreEmailsFiltered, searchEmails, setPin, setKeywordsOnMany, moveEmailsToMailbox } from "@/lib/jmap";
import { parseSearchQuery, buildJmapFilter } from "@/lib/search";
import { log } from "@/lib/logger";
import { Email } from "@/lib/types";

export async function loadMoreEmails(
  inboxId: string,
  position: number
): Promise<{ emails: Email[]; total: number }> {
  const t = Date.now();
  const session = await getSession();
  const accountId = getAccountId(session);
  const result = await listEmails(session.apiUrl, accountId, inboxId, 50, position);
  log.info({ mailbox_id: inboxId, position, limit: 50, returned: result.emails.length, total: result.total, duration_ms: Date.now() - t }, "action.load_more");
  return result;
}

export async function loadMoreUnreads(
  inboxId: string,
  position: number
): Promise<{ emails: Email[]; total: number }> {
  const t = Date.now();
  const session = await getSession();
  const accountId = getAccountId(session);
  const result = await loadMoreEmailsFiltered(session.apiUrl, accountId, inboxId, "unread", position);
  log.info({ mailbox_id: inboxId, filter: "unread", position, limit: 50, returned: result.emails.length, total: result.total, duration_ms: Date.now() - t }, "action.load_more");
  return result;
}

export async function loadMoreReads(
  inboxId: string,
  position: number
): Promise<{ emails: Email[]; total: number }> {
  const t = Date.now();
  const session = await getSession();
  const accountId = getAccountId(session);
  const result = await loadMoreEmailsFiltered(session.apiUrl, accountId, inboxId, "read", position);
  log.info({ mailbox_id: inboxId, filter: "read", position, limit: 50, returned: result.emails.length, total: result.total, duration_ms: Date.now() - t }, "action.load_more");
  return result;
}

export async function searchEmailsAction(query: string): Promise<Email[]> {
  const t = Date.now();
  const session = await getSession();
  const accountId = getAccountId(session);
  const parsed = parseSearchQuery(query);
  const filter = buildJmapFilter(parsed);
  const results = await searchEmails(session.apiUrl, accountId, filter);
  log.info({ query, filter, results: results.length, duration_ms: Date.now() - t }, "action.search");
  return results;
}

export async function togglePinAction(
  emailId: string,
  pin: boolean
): Promise<void> {
  const t = Date.now();
  const session = await getSession();
  const accountId = getAccountId(session);
  await setPin(session.apiUrl, accountId, emailId, pin);
  log.info({ email_id: emailId, pin, duration_ms: Date.now() - t }, "action.toggle_pin");
}

export async function bulkMarkAsRead(emailIds: string[]): Promise<void> {
  const t = Date.now();
  const session = await getSession();
  const accountId = getAccountId(session);
  await setKeywordsOnMany(session.apiUrl, accountId, emailIds, { "keywords/$seen": true });
  log.info({ email_ids: emailIds, count: emailIds.length, duration_ms: Date.now() - t }, "action.mark_read");
}

export async function bulkMarkAsUnread(emailIds: string[]): Promise<void> {
  const t = Date.now();
  const session = await getSession();
  const accountId = getAccountId(session);
  await setKeywordsOnMany(session.apiUrl, accountId, emailIds, { "keywords/$seen": null });
  log.info({ email_ids: emailIds, count: emailIds.length, duration_ms: Date.now() - t }, "action.mark_unread");
}

export async function bulkSetPin(emailIds: string[], pin: boolean): Promise<void> {
  const t = Date.now();
  const session = await getSession();
  const accountId = getAccountId(session);
  await setKeywordsOnMany(session.apiUrl, accountId, emailIds, {
    "keywords/$flagged": pin ? true : null,
  });
  log.info({ email_ids: emailIds, count: emailIds.length, pin, duration_ms: Date.now() - t }, "action.bulk_pin");
}

export async function bulkMoveToMailbox(
  emails: { id: string; mailboxIds: Record<string, boolean> }[],
  targetMailboxId: string
): Promise<void> {
  const t = Date.now();
  const session = await getSession();
  const accountId = getAccountId(session);
  await moveEmailsToMailbox(session.apiUrl, accountId, emails, targetMailboxId);
  log.info({ email_ids: emails.map((e) => e.id), count: emails.length, target_mailbox_id: targetMailboxId, duration_ms: Date.now() - t }, "action.move_emails");
}
