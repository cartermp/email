import { getSession, getAccountId, getEmail } from "@/lib/jmap";
import { formatAddressList, formatFullDate } from "@/lib/format";
import { notFound } from "next/navigation";
import PrintControls from "@/components/PrintControls";
import { resolvePrintBody } from "@/lib/printHtml";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function PrintPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  const accountId = getAccountId(session);
  const email = await getEmail(session.apiUrl, accountId, id);
  if (!email) return notFound();

  const { bodyHtml, emailStyles, bodyType } = resolvePrintBody(email);
  const subject = email.subject || "(no subject)";

  return (
    <div className="flex flex-col min-h-full bg-white">
      <PrintControls subject={subject} />

      <div className="max-w-3xl mx-auto w-full px-8 py-8">
        <h1 className="text-2xl font-semibold text-stone-900 mb-5 leading-snug">
          {subject}
        </h1>

        <dl
          className="grid gap-x-4 gap-y-1 mb-8 text-sm border-b border-stone-200 pb-6"
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

        {emailStyles && <style dangerouslySetInnerHTML={{ __html: emailStyles }} />}

        {bodyHtml ? (
          <div
            className={bodyType === "text" ? "text-sm text-stone-800 whitespace-pre-wrap font-mono leading-relaxed" : "text-sm text-stone-800"}
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        ) : (
          <p className="text-stone-400 text-sm">(no body)</p>
        )}
      </div>
    </div>
  );
}
