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
  const session = await getSession();
  const accountId = getAccountId(session);
  const mailboxes = await getMailboxes(session.apiUrl, accountId);
  const inbox = mailboxes.find((m) => m.role === "inbox");
  const draftsMailbox = mailboxes.find((m) => m.role === "drafts");
  const sentMailbox = mailboxes.find((m) => m.role === "sent");
  const archiveMailbox = mailboxes.find((m) => m.role === "archive");
  const trashMailbox = mailboxes.find((m) => m.role === "trash");

  const [inbox_emails, drafts, pinned, sentResult] = await Promise.all([
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
