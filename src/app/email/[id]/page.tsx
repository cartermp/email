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

  // Prefer HTML body, fall back to text
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
    <div className="max-w-3xl mx-auto px-6 py-6">
      {/* Back */}
      <Link
        href="/"
        className="text-xs text-zinc-400 hover:text-zinc-600 mb-6 inline-block"
      >
        ← Inbox
      </Link>

      {/* Subject */}
      <h1 className="text-xl font-semibold text-zinc-900 mb-4">
        {email.subject || "(no subject)"}
      </h1>

      {/* Headers */}
      <div className="text-sm text-zinc-600 space-y-1 mb-6 pb-6 border-b border-zinc-200">
        <div>
          <span className="text-zinc-400 w-10 inline-block">From</span>
          {formatAddressList(email.from)}
        </div>
        {email.to && email.to.length > 0 && (
          <div>
            <span className="text-zinc-400 w-10 inline-block">To</span>
            {formatAddressList(email.to)}
          </div>
        )}
        {email.cc && email.cc.length > 0 && (
          <div>
            <span className="text-zinc-400 w-10 inline-block">Cc</span>
            {formatAddressList(email.cc)}
          </div>
        )}
        <div>
          <span className="text-zinc-400 w-10 inline-block">Date</span>
          {formatFullDate(email.receivedAt)}
        </div>
      </div>

      {/* Body */}
      {body ? (
        <EmailBody body={body} type={bodyType} />
      ) : (
        <p className="text-zinc-400 text-sm">No body content.</p>
      )}
    </div>
  );
}
