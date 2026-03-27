import Link from "next/link";
import { formatAddressList, formatFullDate } from "@/lib/format";
import { Email } from "@/lib/types";
import EmailBody from "@/components/EmailBody";
import PinButton from "@/components/PinButton";
import CalendarEventCard from "@/components/CalendarEventCard";
import MarkUnreadButton from "@/components/MarkUnreadButton";
import AttachmentList from "@/components/AttachmentList";
import { resolveCalendarEvent } from "@/lib/calendarDetect";

interface Props {
  email: Email;
  downloadUrl: string;
  accountId: string;
}

export default async function EmailDetailView({ email, downloadUrl, accountId }: Props) {
  // ── Resolve body ──────────────────────────────────────────────
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

  // ── Detect calendar invite ────────────────────────────────────
  const calendarEvent = await resolveCalendarEvent(email, downloadUrl, accountId);

  const hasMultipleRecipients =
    (email.to?.length ?? 0) + (email.cc?.length ?? 0) > 1;

  return (
    <>
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
      <div className="flex flex-wrap items-center gap-2 mb-6 pb-6 border-b border-stone-200 dark:border-stone-700">
        <PinButton
          emailId={email.id}
          initiallyPinned={!!email.keywords?.["$flagged"]}
        />
        <MarkUnreadButton emailId={email.id} />
        <Link
          href={`/compose?mode=reply&id=${email.id}`}
          className="whitespace-nowrap text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        >
          Reply
        </Link>
        {hasMultipleRecipients && (
          <Link
            href={`/compose?mode=reply-all&id=${email.id}`}
            className="whitespace-nowrap text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          >
            Reply All
          </Link>
        )}
        <Link
          href={`/compose?mode=forward&id=${email.id}`}
          className="whitespace-nowrap text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        >
          Forward
        </Link>
        <Link
          href={`/print/${email.id}`}
          target="_blank"
          className="whitespace-nowrap text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
        >
          Print
        </Link>
      </div>

      {/* Calendar invite card */}
      {calendarEvent && <CalendarEventCard event={calendarEvent} />}

      {/* Body */}
      {body ? (
        <EmailBody body={body} type={bodyType} />
      ) : (
        <p className="text-stone-400 dark:text-stone-500 text-sm">
          No body content.
        </p>
      )}

      {/* Attachments */}
      {email.attachments?.length > 0 && (
        <AttachmentList attachments={email.attachments} />
      )}
    </>
  );
}
