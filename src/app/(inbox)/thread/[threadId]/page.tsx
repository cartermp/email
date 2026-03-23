import { getSession, getAccountId, getThreadEmails } from "@/lib/jmap";
import { notFound } from "next/navigation";
import MobileBackButton from "@/components/MobileBackButton";
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

  // Subject from the most recent email in the thread
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
