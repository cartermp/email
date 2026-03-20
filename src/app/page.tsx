import Link from "next/link";
import { getSession, getAccountId, getMailboxes, listEmails } from "@/lib/jmap";
import { formatAddressList, formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const session = await getSession();
  const accountId = getAccountId(session);
  const mailboxes = await getMailboxes(session.apiUrl, accountId);

  const inbox = mailboxes.find((m) => m.role === "inbox");
  if (!inbox) {
    return (
      <div className="p-8 text-zinc-500">No inbox found.</div>
    );
  }

  const emails = await listEmails(session.apiUrl, accountId, inbox.id);

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-zinc-900">
          Inbox
          {inbox.unreadEmails > 0 && (
            <span className="ml-2 text-xs font-normal text-zinc-500">
              {inbox.unreadEmails} unread
            </span>
          )}
        </h1>
        <Link
          href="/compose"
          className="text-xs bg-zinc-900 text-white px-3 py-1.5 rounded hover:bg-zinc-700 transition-colors"
        >
          Compose
        </Link>
      </div>

      <div className="divide-y divide-zinc-100">
        {emails.length === 0 && (
          <div className="p-8 text-zinc-400 text-sm">No emails.</div>
        )}
        {emails.map((email) => {
          const isUnread = !email.keywords?.["$seen"];
          return (
            <Link
              key={email.id}
              href={`/email/${email.id}`}
              className="flex items-baseline gap-4 px-6 py-3 hover:bg-zinc-50 transition-colors"
            >
              {/* From */}
              <span
                className={`w-44 shrink-0 text-sm truncate ${isUnread ? "font-semibold text-zinc-900" : "text-zinc-600"}`}
              >
                {formatAddressList(email.from) || "(no sender)"}
              </span>

              {/* Subject + preview */}
              <span className="flex-1 min-w-0 text-sm truncate">
                <span
                  className={isUnread ? "font-semibold text-zinc-900" : "text-zinc-700"}
                >
                  {email.subject || "(no subject)"}
                </span>
                {email.preview && (
                  <span className="text-zinc-400 font-normal">
                    {" — "}
                    {email.preview}
                  </span>
                )}
              </span>

              {/* Date */}
              <span className="shrink-0 text-xs text-zinc-400">
                {formatDate(email.receivedAt)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
