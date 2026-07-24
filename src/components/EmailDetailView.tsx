import Link from "next/link";
import { formatAddress, formatAddressList, formatDate, formatFullDate } from "@/lib/format";
import { Email } from "@/lib/types";
import EmailBody from "@/components/EmailBody";
import PinButton from "@/components/PinButton";
import CalendarEventCard from "@/components/CalendarEventCard";
import MarkUnreadButton from "@/components/MarkUnreadButton";
import AttachmentList from "@/components/AttachmentList";
import { resolveCalendarEvent } from "@/lib/calendarDetect";
import NotSpamButton from "@/components/NotSpamButton";
import { getJmapMailboxContext } from "@/lib/jmapServer";
import SenderAvatar from "@/components/SenderAvatar";
import MailIcon from "@/components/MailIcon";
import Popover from "@/components/Popover";

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
      bodyType = part.type === "text/html" ? "html" : "text";
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
  const [calendarEvent, { mailboxes }] = await Promise.all([
    resolveCalendarEvent(email, downloadUrl, accountId),
    getJmapMailboxContext(),
  ]);

  // ── Detect spam/junk mailbox ────────────────────────────────────
  const spamMailbox = mailboxes.find(
    (m) =>
      m.role === "junk" ||
      m.name.toLowerCase() === "spam" ||
      m.name.toLowerCase() === "junk"
  );
  const inboxMailbox = mailboxes.find((m) => m.role === "inbox");
  const isSpam = !!(spamMailbox && email.mailboxIds[spamMailbox.id]);

  const hasMultipleRecipients =
    (email.to?.length ?? 0) + (email.cc?.length ?? 0) > 1;
  const sender = email.from?.[0];
  const senderLabel = sender ? formatAddress(sender) : "(no sender)";
  const recipientSummary =
    email.to?.length === 1
      ? `to ${formatAddress(email.to[0])}`
      : email.to?.length
        ? `to ${email.to.length} recipients`
        : "";

  return (
    <>
      {/* Subject */}
      <h1 className="mb-5 text-xl font-semibold leading-snug text-stone-900 dark:text-stone-100 sm:text-2xl">
        {email.subject || "(no subject)"}
      </h1>

      {/* Sender, metadata, and actions */}
      <div className="mb-6 rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800/50">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <SenderAvatar from={email.from} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-semibold text-stone-800 dark:text-stone-100">
                {senderLabel}
              </p>
              <time className="shrink-0 text-[11px] tabular-nums text-stone-400 dark:text-stone-500">
                <span className="sm:hidden">{formatDate(email.receivedAt)}</span>
                <span className="hidden sm:inline">{formatFullDate(email.receivedAt)}</span>
              </time>
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-xs text-stone-400 dark:text-stone-500">
              <span className="truncate">{recipientSummary}</span>
              <Popover
                label="Message details"
                role="dialog"
                align="left"
                trigger={<span>Details</span>}
                triggerClassName="rounded px-1 py-0.5 text-stone-500 hover:bg-stone-100 hover:text-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
                contentClassName="w-[min(28rem,calc(100vw-3rem))] rounded-lg border border-stone-200 bg-white p-3 text-xs shadow-lg dark:border-stone-700 dark:bg-stone-900"
              >
                <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-1.5">
                  <dt className="text-stone-400 dark:text-stone-500">From</dt>
                  <dd className="break-all text-stone-700 dark:text-stone-300">
                    {formatAddressList(email.from)}
                  </dd>
                  {email.replyTo?.length ? (
                    <>
                      <dt className="text-stone-400 dark:text-stone-500">Reply to</dt>
                      <dd className="break-all text-stone-700 dark:text-stone-300">
                        {formatAddressList(email.replyTo)}
                      </dd>
                    </>
                  ) : null}
                  {email.to?.length ? (
                    <>
                      <dt className="text-stone-400 dark:text-stone-500">To</dt>
                      <dd className="break-all text-stone-700 dark:text-stone-300">
                        {formatAddressList(email.to)}
                      </dd>
                    </>
                  ) : null}
                  {email.cc?.length ? (
                    <>
                      <dt className="text-stone-400 dark:text-stone-500">Cc</dt>
                      <dd className="break-all text-stone-700 dark:text-stone-300">
                        {formatAddressList(email.cc)}
                      </dd>
                    </>
                  ) : null}
                </dl>
              </Popover>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-stone-100 px-4 py-3 dark:border-stone-700/70">
          <Link
            href={`/compose?mode=reply${hasMultipleRecipients ? "-all" : ""}&id=${email.id}`}
            className="inline-flex min-h-10 items-center gap-2 whitespace-nowrap rounded-md bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            <MailIcon name="reply" className="h-4 w-4" />
            {hasMultipleRecipients ? "Reply all" : "Reply"}
          </Link>
          {hasMultipleRecipients && (
            <Link
              href={`/compose?mode=reply&id=${email.id}`}
              className="inline-flex min-h-10 items-center whitespace-nowrap rounded-md border border-stone-200 px-3 text-xs text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-100"
            >
              Reply
            </Link>
          )}
          {isSpam && inboxMailbox && (
            <NotSpamButton
              emailId={email.id}
              mailboxIds={email.mailboxIds}
              inboxMailboxId={inboxMailbox.id}
            />
          )}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <PinButton
              emailId={email.id}
              initiallyPinned={!!email.keywords?.["$flagged"]}
            />
            <MarkUnreadButton emailId={email.id} />
            <Popover
              label="More message actions"
              trigger={
                <>
                  More
                  <MailIcon name="chevronDown" className="h-3.5 w-3.5" />
                </>
              }
              triggerClassName="flex min-h-10 items-center gap-1 rounded-md border border-stone-200 px-3 text-xs text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-100"
              contentClassName="min-w-36 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 text-sm shadow-lg dark:border-stone-700 dark:bg-stone-900"
            >
                <Link
                  href={`/compose?mode=forward&id=${email.id}`}
                  role="menuitem"
                  className="block px-3 py-2.5 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Forward
                </Link>
                <Link
                  href={`/print/${email.id}`}
                  target="_blank"
                  role="menuitem"
                  className="block px-3 py-2.5 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Print
                </Link>
            </Popover>
          </div>
        </div>
      </div>

      {/* Calendar invite card */}
      {calendarEvent && <CalendarEventCard event={calendarEvent} />}

      {/* Body */}
      {body ? (
        <EmailBody
          body={body}
          type={bodyType}
          embeddedParts={email.attachments}
        />
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
