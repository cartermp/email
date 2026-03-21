import { getSession, getAccountId, getMailboxes, listEmails } from "@/lib/jmap";
import EmailListPanel from "@/components/EmailListPanel";

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
  const { emails, total } = inbox
    ? await listEmails(session.apiUrl, accountId, inbox.id)
    : { emails: [], total: 0 };

  return (
    <div className="flex h-full">
      <EmailListPanel
        emails={emails}
        inboxId={inbox?.id ?? ""}
        initialTotal={total}
        unreadCount={inbox?.unreadEmails ?? 0}
      />
      <div className="flex-1 overflow-hidden min-w-0 h-full">{children}</div>
    </div>
  );
}
