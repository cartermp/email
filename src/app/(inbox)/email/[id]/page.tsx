import { getEmail } from "@/lib/jmap";
import { notFound } from "next/navigation";
import EmailDetailView from "@/components/EmailDetailView";
import MobileBackButton from "@/components/MobileBackButton";
import { getJmapContext } from "@/lib/jmapServer";

interface Props {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ from?: string }>;
}

export default async function EmailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const from = resolvedSearchParams.from;
  const backLabel = from === "spam" ? "Spam" : from === "sent" ? "Sent" : "Inbox";

  const { session, accountId } = await getJmapContext();
  const email = await getEmail(session.apiUrl, accountId, id);

  if (!email) return notFound();

  return (
    <div className="overflow-y-auto h-full bg-stone-50 dark:bg-stone-900">
      <div className="mail-reader-container mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
        <MobileBackButton label={backLabel} />
        <EmailDetailView
          email={email}
          downloadUrl={session.downloadUrl}
          accountId={accountId}
        />
      </div>
    </div>
  );
}
