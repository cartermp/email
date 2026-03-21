import Link from "next/link";
import { getSession, getAccountId, getEmail } from "@/lib/jmap";
import { formatAddressList, formatFullDate } from "@/lib/format";
import { notFound } from "next/navigation";
import EmailBody from "@/components/EmailBody";

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

  let body: string | null = null;
  let bodyType: "html" | "text" = "text";

  if (email.htmlBody?.length > 0) {
    const part = email.htmlBody[0];
    if (part.partId && email.bodyValues?.[part.partId]) {
      body = email.bodyValues[part.partId].value;
      bodyType = "html";
    }
  }

  if (!body && email.textBody?.length > 0) {
    const part = email.textBody[0];
    if (part.partId && email.bodyValues?.[part.partId]) {
      body = email.bodyValues[part.partId].value;
      bodyType = "text";
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-5 h-12 flex items-center">
        <Link
          href="/"
          className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
        >
          ← Inbox
        </Link>
      </div>

      <div className="max-w-3xl w-full mx-auto px-8 py-8">
        {/* Subject */}
        <h1 className="text-xl font-semibold text-gray-900 mb-5 leading-snug">
          {email.subject || "(no subject)"}
        </h1>

        {/* Header fields — grid keeps labels and values aligned */}
        <dl className="grid gap-x-4 gap-y-1 mb-6 pb-6 border-b border-gray-200 text-sm"
            style={{ gridTemplateColumns: "max-content 1fr" }}>
          <dt className="text-gray-400 text-right">From</dt>
          <dd className="text-gray-700">{formatAddressList(email.from)}</dd>

          {email.to && email.to.length > 0 && (
            <>
              <dt className="text-gray-400 text-right">To</dt>
              <dd className="text-gray-700">{formatAddressList(email.to)}</dd>
            </>
          )}
          {email.cc && email.cc.length > 0 && (
            <>
              <dt className="text-gray-400 text-right">Cc</dt>
              <dd className="text-gray-700">{formatAddressList(email.cc)}</dd>
            </>
          )}
          <dt className="text-gray-400 text-right">Date</dt>
          <dd className="text-gray-500">{formatFullDate(email.receivedAt)}</dd>
        </dl>

        {/* Body */}
        {body ? (
          <EmailBody body={body} type={bodyType} />
        ) : (
          <p className="text-gray-400 text-sm">No body content.</p>
        )}
      </div>
    </div>
  );
}
