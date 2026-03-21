import { getSession, getAccountId, getMailboxes, listEmails } from "@/lib/jmap";
import EmailListPanel from "@/components/EmailListPanel";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await getSession();
  const accountId = getAccountId(session);
  const mailboxes = await getMailboxes(session.apiUrl, accountId);
  const inbox = mailboxes.find((m) => m.role === "inbox");

  if (!inbox) {
    return (
      <div className="flex items-center justify-center h-full text-sm text-stone-400 dark:text-stone-500">
        No inbox found.
      </div>
    );
  }

  const emails = await listEmails(session.apiUrl, accountId, inbox.id);

  return (
    <div className="flex h-full">
      <EmailListPanel emails={emails} unreadCount={inbox.unreadEmails} />
      <div className="flex-1 flex items-center justify-center bg-stone-50 dark:bg-stone-900">
        <p className="text-sm text-stone-300 dark:text-stone-600">
          Select an email to read
        </p>
      </div>
    </div>
  );
}
