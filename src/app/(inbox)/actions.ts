"use server";

import { auth } from "@/auth";
import { getSession, getAccountId, getMailboxes, listEmails, loadMoreEmailsFiltered, searchEmails, setPin, setKeywordsOnMany, moveEmailsToMailbox, getEmailState, destroyAllEmailsInMailbox, destroyEmails, getEmailMailboxIds, type EmailPage } from "@/lib/jmap";
import { parseSearchQuery, buildJmapFilter } from "@/lib/search";
import { log } from "@/lib/logger";
import type { MailSyncSnapshot } from "@/lib/mailAutoSync";

async function requireAuthedJmap() {
  const sessionData = await auth();
  if (!sessionData?.user) throw new Error("Unauthorized");
  const session = await getSession();
  return { session, accountId: getAccountId(session) };
}

export async function loadMailboxPageAction(
  mailboxId: string,
  filter: "all" | "unread" | "read",
  position: number,
): Promise<EmailPage> {
  if (
    typeof mailboxId !== "string" ||
    !mailboxId ||
    !["all", "unread", "read"].includes(filter) ||
    !Number.isInteger(position) ||
    position < 0
  ) {
    throw new Error("Invalid mailbox page request");
  }
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  const result =
    filter === "all"
      ? await listEmails(session.apiUrl, accountId, mailboxId, 50, position)
      : await loadMoreEmailsFiltered(
          session.apiUrl,
          accountId,
          mailboxId,
          filter,
          position,
        );
  log.info({ mailbox_id: mailboxId, filter, position, limit: 50, returned: result.emails.length, total: result.total, duration_ms: Date.now() - t }, "action.load_more");
  return result;
}

export async function checkMailForUpdates(): Promise<MailSyncSnapshot> {
  const { session, accountId } = await requireAuthedJmap();
  return { emailState: await getEmailState(session.apiUrl, accountId) };
}

export async function searchEmailsAction(
  query: string,
  position = 0,
): Promise<EmailPage> {
  if (
    typeof query !== "string" ||
    !Number.isInteger(position) ||
    position < 0
  ) {
    throw new Error("Invalid search request");
  }
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  const parsed = parseSearchQuery(query);
  const filter = buildJmapFilter(parsed);
  const result = await searchEmails(
    session.apiUrl,
    accountId,
    filter,
    50,
    position,
  );
  log.info({ query_len: query.length, position, results: result.emails.length, total: result.total, duration_ms: Date.now() - t }, "action.search");
  return result;
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
