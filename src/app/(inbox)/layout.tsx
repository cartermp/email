import { Suspense } from "react";
import { getSession, getAccountId, getMailboxes, listInboxEmails, listDrafts, listPinnedEmails, listSentEmails } from "@/lib/jmap";
import { log } from "@/lib/logger";
import EmailListPanel from "@/components/EmailListPanel";
import InboxPanelLayout from "@/components/InboxPanelLayout";

export const dynamic = "force-dynamic";

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = Date.now();

  let session, accountId, mailboxes;
  try {
    session = await getSession();
    accountId = getAccountId(session);
    mailboxes = await getMailboxes(session.apiUrl, accountId);
  } catch (err) {
    log.error({ err, duration_ms: Date.now() - t }, "layout.inbox.session_error");
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50 dark:bg-stone-900">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Unable to connect to mail server
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Check your connection and refresh to try again.
          </p>
        </div>
      </div>
    );
  }

  const inbox = mailboxes.find((m) => m.role === "inbox");
  const draftsMailbox = mailboxes.find((m) => m.role === "drafts");
  const sentMailbox = mailboxes.find((m) => m.role === "sent");
  const archiveMailbox = mailboxes.find((m) => m.role === "archive");
  const trashMailbox = mailboxes.find((m) => m.role === "trash");

  let inbox_emails = { unreads: [] as Awaited<ReturnType<typeof listInboxEmails>>["unreads"], unreadTotal: 0, reads: [] as Awaited<ReturnType<typeof listInboxEmails>>["reads"], readTotal: 0 };
  let drafts: Awaited<ReturnType<typeof listDrafts>> = [];
  let pinned: Awaited<ReturnType<typeof listPinnedEmails>> = [];
  let sentResult: Awaited<ReturnType<typeof listSentEmails>> = { emails: [], total: 0 };

  try {
    [inbox_emails, drafts, pinned, sentResult] = await Promise.all([
      inbox
        ? listInboxEmails(session.apiUrl, accountId, inbox.id)
        : Promise.resolve({ unreads: [], unreadTotal: 0, reads: [], readTotal: 0 }),
      draftsMailbox
        ? listDrafts(session.apiUrl, accountId, draftsMailbox.id)
        : Promise.resolve([]),
      listPinnedEmails(session.apiUrl, accountId),
      sentMailbox
        ? listSentEmails(session.apiUrl, accountId, sentMailbox.id)
        : Promise.resolve({ emails: [], total: 0 }),
    ]);
  } catch (err) {
    log.error({ err, duration_ms: Date.now() - t }, "layout.inbox.fetch_error");
    // Fall through with empty data — the panel will render with a refresh prompt
  }

  const { unreads, unreadTotal, reads, readTotal } = inbox_emails;

  log.info({
    unread_count: unreads.length,
    unread_total: unreadTotal,
    read_count: reads.length,
    read_total: readTotal,
    draft_count: drafts.length,
    pinned_count: pinned.length,
    sent_count: sentResult.emails.length,
    sent_total: sentResult.total,
    has_drafts_mailbox: !!draftsMailbox,
    has_sent_mailbox: !!sentMailbox,
    duration_ms: Date.now() - t,
  }, "layout.inbox.load");

  return (
    <InboxPanelLayout
      list={
        <Suspense>
          <EmailListPanel
            unreads={unreads}
            unreadTotal={unreadTotal}
            reads={reads}
            readTotal={readTotal}
            inboxId={inbox?.id ?? ""}
            drafts={drafts}
            sentEmails={sentResult.emails}
            pinnedEmails={pinned}
            archiveMailboxId={archiveMailbox?.id}
            trashMailboxId={trashMailbox?.id}
          />
        </Suspense>
      }
    >
      {children}
    </InboxPanelLayout>
  );
}
