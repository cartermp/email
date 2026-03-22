import { getSession, getAccountId, getMailboxes, listEmails, listDrafts } from "@/lib/jmap";
import { Email } from "@/lib/types";
import EmailListPanel from "@/components/EmailListPanel";
import InboxPanelLayout from "@/components/InboxPanelLayout";

export const dynamic = "force-dynamic";

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const accountId = getAccountId(session);
  const mailboxes = await getMailboxes(session.apiUrl, accountId);
  const inbox = mailboxes.find((m) => m.role === "inbox");
  const draftsMailbox = mailboxes.find((m) => m.role === "drafts");

  const [{ emails, total }, drafts] = await Promise.all([
    inbox
      ? listEmails(session.apiUrl, accountId, inbox.id)
      : Promise.resolve({ emails: [] as Email[], total: 0 }),
    draftsMailbox
      ? listDrafts(session.apiUrl, accountId, draftsMailbox.id)
      : Promise.resolve([] as Email[]),
  ]);

  return (
    <InboxPanelLayout
      list={
        <EmailListPanel
          emails={emails}
          inboxId={inbox?.id ?? ""}
          initialTotal={total}
          unreadCount={inbox?.unreadEmails ?? 0}
          drafts={drafts}
        />
      }
    >
      {children}
    </InboxPanelLayout>
  );
}
