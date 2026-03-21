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
    return <div className="p-8 text-gray-400 text-sm">No inbox found.</div>;
  }

  const emails = await listEmails(session.apiUrl, accountId, inbox.id);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 h-12 flex items-center justify-between">
        <h1 className="text-sm font-semibold text-gray-900">
          Inbox
          {inbox.unreadEmails > 0 && (
            <span className="ml-2 font-normal text-gray-400">
              {inbox.unreadEmails}
            </span>
          )}
        </h1>
        <Link
          href="/compose"
          className="text-xs font-medium bg-gray-900 text-white px-3 py-1.5 rounded-md hover:bg-gray-700 transition-colors"
        >
          Compose
        </Link>
      </div>

      {/* Email list */}
      <div className="divide-y divide-gray-100">
        {emails.length === 0 && (
          <div className="p-8 text-gray-400 text-sm">No emails.</div>
        )}
        {emails.map((email) => {
          const isUnread = !email.keywords?.["$seen"];
          return (
            <Link
              key={email.id}
              href={`/email/${email.id}`}
              className="group flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              {/* Unread dot */}
              <div className="w-1.5 shrink-0">
                {isUnread && (
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                )}
              </div>

              {/* From */}
              <span
                className={`w-44 shrink-0 text-sm truncate ${
                  isUnread ? "font-semibold text-gray-900" : "text-gray-500"
                }`}
              >
                {formatAddressList(email.from) || "(no sender)"}
              </span>

              {/* Subject + preview */}
              <span className="flex-1 min-w-0 text-sm truncate">
                <span
                  className={
                    isUnread ? "font-semibold text-gray-900" : "text-gray-700"
                  }
                >
                  {email.subject || "(no subject)"}
                </span>
                {email.preview && (
                  <span className="text-gray-400 font-normal">
                    {" — "}
                    {email.preview}
                  </span>
                )}
              </span>

              {/* Date */}
              <span className="shrink-0 text-xs text-gray-400 tabular-nums">
                {formatDate(email.receivedAt)}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
