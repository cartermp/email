import { getSession, getAccountId, getEmail } from "@/lib/jmap";
import { notFound } from "next/navigation";
import EmailDetailView from "@/components/EmailDetailView";
import MobileBackButton from "@/components/MobileBackButton";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EmailPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  const accountId = getAccountId(session);
  const email = await getEmail(session.apiUrl, accountId, id);

  if (!email) return notFound();

  return (
    <div className="overflow-y-auto h-full bg-stone-50 dark:bg-stone-900">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <MobileBackButton label="Inbox" />
        <EmailDetailView
          email={email}
          downloadUrl={session.downloadUrl}
          accountId={accountId}
        />
      </div>
    </div>
  );
}
