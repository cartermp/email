"use server";

import { getSession, getAccountId, listEmails, loadMoreEmailsFiltered, searchEmails, setPin, setKeywordsOnMany, moveEmailsToMailbox } from "@/lib/jmap";
import { parseSearchQuery, buildJmapFilter } from "@/lib/search";
import { Email } from "@/lib/types";

export async function loadMoreEmails(
  inboxId: string,
  position: number
): Promise<{ emails: Email[]; total: number }> {
  const session = await getSession();
  const accountId = getAccountId(session);
  return listEmails(session.apiUrl, accountId, inboxId, 50, position);
}

export async function loadMoreUnreads(
  inboxId: string,
  position: number
): Promise<{ emails: Email[]; total: number }> {
  const session = await getSession();
  const accountId = getAccountId(session);
  return loadMoreEmailsFiltered(session.apiUrl, accountId, inboxId, "unread", position);
}

export async function loadMoreReads(
  inboxId: string,
  position: number
): Promise<{ emails: Email[]; total: number }> {
  const session = await getSession();
  const accountId = getAccountId(session);
  return loadMoreEmailsFiltered(session.apiUrl, accountId, inboxId, "read", position);
}

export async function searchEmailsAction(query: string): Promise<Email[]> {
  const session = await getSession();
  const accountId = getAccountId(session);
  const filter = buildJmapFilter(parseSearchQuery(query));
  return searchEmails(session.apiUrl, accountId, filter);
}

export async function togglePinAction(
  emailId: string,
  pin: boolean
): Promise<void> {
  const session = await getSession();
  const accountId = getAccountId(session);
  await setPin(session.apiUrl, accountId, emailId, pin);
}

export async function bulkMarkAsRead(emailIds: string[]): Promise<void> {
  const session = await getSession();
  const accountId = getAccountId(session);
  await setKeywordsOnMany(session.apiUrl, accountId, emailIds, { "keywords/$seen": true });
}

export async function bulkMarkAsUnread(emailIds: string[]): Promise<void> {
  const session = await getSession();
  const accountId = getAccountId(session);
  await setKeywordsOnMany(session.apiUrl, accountId, emailIds, { "keywords/$seen": null });
}

export async function bulkSetPin(emailIds: string[], pin: boolean): Promise<void> {
  const session = await getSession();
  const accountId = getAccountId(session);
  await setKeywordsOnMany(session.apiUrl, accountId, emailIds, {
    "keywords/$flagged": pin ? true : null,
  });
}

export async function bulkMoveToMailbox(
  emails: { id: string; mailboxIds: Record<string, boolean> }[],
  targetMailboxId: string
): Promise<void> {
  const session = await getSession();
  const accountId = getAccountId(session);
  await moveEmailsToMailbox(session.apiUrl, accountId, emails, targetMailboxId);
}
