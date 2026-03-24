import { getSession, getAccountId, getThreadEmails } from "@/lib/jmap";
import { notFound } from "next/navigation";
import MobileBackButton from "@/components/MobileBackButton";
import EmailDetailView from "@/components/EmailDetailView";
import ThreadView from "@/components/ThreadView";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ threadId: string }>;
}

export default async function ThreadPage({ params }: Props) {
  const { threadId } = await params;
  const session = await getSession();
  const accountId = getAccountId(session);
  const emails = await getThreadEmails(session.apiUrl, accountId, threadId);

  if (!emails.length) return notFound();

  // Single-email thread: render the email detail directly — no redirect,
  // which avoids RSC soft-navigation failures when the client follows a
  // server-side redirect() inside an RSC payload.
  if (emails.length === 1) {
    return (
      <div className="overflow-y-auto h-full bg-stone-50 dark:bg-stone-900">
        <div className="max-w-3xl mx-auto px-8 py-8">
          <MobileBackButton label="Inbox" />
          <EmailDetailView
            email={emails[0]}
            downloadUrl={session.downloadUrl}
            accountId={accountId}
          />
        </div>
      </div>
    );
  }

  const subject = emails[emails.length - 1].subject ?? "(no subject)";

  return (
    <div className="overflow-y-auto h-full bg-stone-50 dark:bg-stone-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8">
        <MobileBackButton label="Inbox" />
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-6 leading-snug">
          {subject}
        </h1>
        <ThreadView emails={emails} />
      </div>
    </div>
  );
}
