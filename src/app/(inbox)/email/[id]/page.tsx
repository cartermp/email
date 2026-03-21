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

  // Resolve body
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

  const hasMultipleRecipients =
    (email.to?.length ?? 0) + (email.cc?.length ?? 0) > 1;

  return (
    <div className="overflow-y-auto h-full bg-stone-50 dark:bg-stone-900">
      <div className="max-w-3xl mx-auto px-8 py-8">
        {/* Subject */}
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-5 leading-snug">
          {email.subject || "(no subject)"}
        </h1>

        {/* Metadata */}
        <dl
          className="grid gap-x-4 gap-y-1 mb-4 text-sm"
          style={{ gridTemplateColumns: "max-content 1fr" }}
        >
          <dt className="text-stone-400 dark:text-stone-500 text-right">From</dt>
          <dd className="text-stone-700 dark:text-stone-300">
            {formatAddressList(email.from)}
          </dd>

          {email.to && email.to.length > 0 && (
            <>
              <dt className="text-stone-400 dark:text-stone-500 text-right">To</dt>
              <dd className="text-stone-700 dark:text-stone-300">
                {formatAddressList(email.to)}
              </dd>
            </>
          )}
          {email.cc && email.cc.length > 0 && (
            <>
              <dt className="text-stone-400 dark:text-stone-500 text-right">Cc</dt>
              <dd className="text-stone-700 dark:text-stone-300">
                {formatAddressList(email.cc)}
              </dd>
            </>
          )}
          <dt className="text-stone-400 dark:text-stone-500 text-right">Date</dt>
          <dd className="text-stone-500 dark:text-stone-400">
            {formatFullDate(email.receivedAt)}
          </dd>
        </dl>

        {/* Action buttons */}
        <div className="flex items-center gap-2 mb-6 pb-6 border-b border-stone-200 dark:border-stone-700">
          <Link
            href={`/compose?mode=reply&id=${email.id}`}
            className="text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            Reply
          </Link>
          {hasMultipleRecipients && (
            <Link
              href={`/compose?mode=reply-all&id=${email.id}`}
              className="text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Reply All
            </Link>
          )}
          <Link
            href={`/compose?mode=forward&id=${email.id}`}
            className="text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            Forward
          </Link>
        </div>

        {/* Body */}
        {body ? (
          <EmailBody body={body} type={bodyType} />
        ) : (
          <p className="text-stone-400 dark:text-stone-500 text-sm">
            No body content.
          </p>
        )}
      </div>
    </div>
  );
}
