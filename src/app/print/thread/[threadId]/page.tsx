import { getSession, getAccountId, getThreadEmails } from "@/lib/jmap";
import { formatAddressList, formatFullDate } from "@/lib/format";
import { notFound } from "next/navigation";
import PrintControls from "@/components/PrintControls";
import { resolvePrintBody } from "@/lib/printHtml";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ threadId: string }>;
}

export default async function PrintThreadPage({ params }: Props) {
  const { threadId } = await params;
  const session = await getSession();
  const accountId = getAccountId(session);
  const emails = await getThreadEmails(session.apiUrl, accountId, threadId);
  if (!emails.length) return notFound();

  const subject = emails[emails.length - 1].subject || "(no subject)";

  // Collect all unique email styles up front so we can inject once
  const allStyles = emails
    .map((e) => resolvePrintBody(e).emailStyles)
    .filter(Boolean)
    .join("\n");

  return (
    <div className="flex flex-col min-h-full bg-white">
      <PrintControls subject={subject} />

      <div className="max-w-3xl mx-auto w-full px-8 py-8">
        <h1 className="text-2xl font-semibold text-stone-900 mb-8 leading-snug">
          {subject}
        </h1>

        {allStyles && <style dangerouslySetInnerHTML={{ __html: allStyles }} />}

        {emails.map((email, i) => {
          const { bodyHtml, bodyType } = resolvePrintBody(email);
          return (
            <div key={email.id}>
              {/* Per-message metadata */}
              <dl
                className="grid gap-x-4 gap-y-1 mb-4 text-sm"
                style={{ gridTemplateColumns: "max-content 1fr" }}
              >
                <dt className="text-stone-400 text-right">From</dt>
                <dd className="text-stone-700">{formatAddressList(email.from)}</dd>
                {email.to && email.to.length > 0 && (
                  <>
                    <dt className="text-stone-400 text-right">To</dt>
                    <dd className="text-stone-700">{formatAddressList(email.to)}</dd>
                  </>
                )}
                {email.cc && email.cc.length > 0 && (
                  <>
                    <dt className="text-stone-400 text-right">Cc</dt>
                    <dd className="text-stone-700">{formatAddressList(email.cc)}</dd>
                  </>
                )}
                <dt className="text-stone-400 text-right">Date</dt>
                <dd className="text-stone-500">{formatFullDate(email.receivedAt)}</dd>
              </dl>

              {/* Body */}
              {bodyHtml ? (
                <div
                  className={bodyType === "text" ? "text-sm text-stone-800 whitespace-pre-wrap font-mono leading-relaxed" : "text-sm text-stone-800"}
                  dangerouslySetInnerHTML={{ __html: bodyHtml }}
                />
              ) : (
                <p className="text-stone-400 text-sm">(no body)</p>
              )}

              {/* Divider between messages */}
              {i < emails.length - 1 && (
                <hr className="my-8 border-stone-300" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
