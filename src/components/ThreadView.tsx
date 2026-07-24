"use client";

import { useState } from "react";
import Link from "next/link";
import SenderAvatar from "@/components/SenderAvatar";
import EmailBody from "@/components/EmailBody";
import PinButton from "@/components/PinButton";
import CalendarEventCard, { CalendarEventData, CalendarResponse } from "@/components/CalendarEventCard";
import AttachmentList from "@/components/AttachmentList";
import MailIcon from "@/components/MailIcon";
import MarkUnreadButton from "@/components/MarkUnreadButton";
import { Email } from "@/lib/types";
import { formatAddressList, formatFullDate } from "@/lib/format";
import NotSpamButton from "@/components/NotSpamButton";
import { visibleAttachments } from "@/lib/attachments";
import Popover from "@/components/Popover";

// ---------------------------------------------------------------------------
// Body resolution (mirrors email/[id]/page.tsx logic)
// ---------------------------------------------------------------------------

function resolveBody(email: Email): { body: string; type: "html" | "text" } | null {
  if (email.htmlBody?.length > 0) {
    const part = email.htmlBody[0];
    if (part.partId && email.bodyValues?.[part.partId]) {
      return { body: email.bodyValues[part.partId].value, type: "html" };
    }
  }
  if (email.textBody?.length > 0) {
    const part = email.textBody[0];
    if (part.partId && email.bodyValues?.[part.partId]) {
      const raw = email.bodyValues[part.partId].value;
      // Skip text/plain parts that are actually raw HTML source
      if (!/^\s*</i.test(raw)) {
        return { body: raw, type: "text" };
      }
    }
  }
  if (email.preview) return { body: email.preview, type: "text" };
  return null;
}

// ---------------------------------------------------------------------------
// Single stacked email item
// ---------------------------------------------------------------------------

interface ItemProps {
  email: Email;
  calendarEvent: CalendarEventData | null;
  persistedResponse: CalendarResponse | null | undefined;
  onResponseSent: (r: CalendarResponse) => void;
  expanded: boolean;
  onToggle: () => void;
  spamMailboxId?: string;
  inboxMailboxId?: string;
}

function EmailStackItem({
  email,
  calendarEvent,
  persistedResponse,
  onResponseSent,
  expanded,
  onToggle,
  spamMailboxId,
  inboxMailboxId,
}: ItemProps) {
  const isUnread = !email.keywords?.["$seen"];
  const resolved = resolveBody(email);
  const isSpam = !!(spamMailboxId && email.mailboxIds[spamMailboxId]);
  const downloadableAttachments = visibleAttachments(email.attachments);
  const hasMultipleRecipients =
    (email.to?.length ?? 0) + (email.cc?.length ?? 0) > 1;

  return (
    <div
      className={[
        "rounded-xl border overflow-hidden bg-white dark:bg-stone-800/50 transition-shadow",
        expanded
          ? "border-stone-300 dark:border-stone-600 shadow-sm"
          : "border-stone-200 dark:border-stone-700",
      ].join(" ")}
    >
      {/* Header — always visible, tap to expand/collapse */}
      <button
        onClick={onToggle}
        aria-expanded={expanded}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800/80 transition-colors"
      >
        <div className="shrink-0">
          <SenderAvatar from={email.from} size={32} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={[
                "text-sm truncate",
                isUnread
                  ? "font-semibold text-stone-900 dark:text-stone-100"
                  : "text-stone-700 dark:text-stone-300",
              ].join(" ")}
            >
              {formatAddressList(email.from) || "(no sender)"}
            </span>
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
              {downloadableAttachments.length > 0 && (
                <span
                  title={`${downloadableAttachments.length} attachment${downloadableAttachments.length === 1 ? "" : "s"}`}
                  aria-label={`${downloadableAttachments.length} attachment${downloadableAttachments.length === 1 ? "" : "s"}`}
                  className="inline-flex items-center gap-0.5"
                >
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                    aria-hidden="true"
                  >
                    <path d="M15.621 3.379a3 3 0 0 0-4.242 0L4.257 10.5a4.25 4.25 0 1 0 6.01 6.01l6.365-6.364a.75.75 0 1 0-1.061-1.06L9.207 15.45a2.75 2.75 0 0 1-3.89-3.89l7.122-7.12a1.5 1.5 0 0 1 2.121 2.12l-7.07 7.072a.75.75 0 1 0 1.06 1.06l7.071-7.07a3 3 0 0 0 0-4.243Z" />
                  </svg>
                  {downloadableAttachments.length > 1 &&
                    downloadableAttachments.length}
                </span>
              )}
              {formatFullDate(email.receivedAt)}
            </span>
          </div>
          {!expanded && email.preview && (
            <p className="text-xs text-stone-400 dark:text-stone-500 truncate mt-0.5">
              {email.preview}
            </p>
          )}
        </div>

        {/* Chevron */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={[
            "w-4 h-4 shrink-0 text-stone-400 dark:text-stone-500 transition-transform duration-200",
            expanded ? "rotate-180" : "",
          ].join(" ")}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-stone-200 dark:border-stone-700">
          {/* To / Cc metadata */}
          <div className="px-4 py-2.5 text-xs text-stone-500 dark:text-stone-400 space-y-0.5 border-b border-stone-100 dark:border-stone-700/50">
            {email.to && email.to.length > 0 && (
              <div>
                <span className="text-stone-400 dark:text-stone-500">To </span>
                {formatAddressList(email.to)}
              </div>
            )}
            {email.cc && email.cc.length > 0 && (
              <div>
                <span className="text-stone-400 dark:text-stone-500">Cc </span>
                {formatAddressList(email.cc)}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2 border-b border-stone-100 px-4 py-3 dark:border-stone-700/50">
            <Link
              href={`/compose?mode=${hasMultipleRecipients ? "reply-all" : "reply"}&id=${email.id}`}
              className="inline-flex min-h-10 items-center gap-2 rounded-md bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
            >
              <MailIcon name="reply" className="h-4 w-4" />
              {hasMultipleRecipients ? "Reply all" : "Reply"}
            </Link>
            {hasMultipleRecipients && (
              <Link
                href={`/compose?mode=reply&id=${email.id}`}
                className="inline-flex min-h-10 items-center rounded-md border border-stone-200 px-3 text-xs text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-100"
              >
                Reply
              </Link>
            )}
            {isSpam && inboxMailboxId && (
              <NotSpamButton
                emailId={email.id}
                mailboxIds={email.mailboxIds}
                inboxMailboxId={inboxMailboxId}
              />
            )}
            <PinButton emailId={email.id} initiallyPinned={!!email.keywords?.["$flagged"]} />
            <MarkUnreadButton emailId={email.id} />
            <span className="ml-auto">
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
            </span>
          </div>

          {/* Calendar invite */}
          {calendarEvent && (
            <div className="px-4 pt-4">
              <CalendarEventCard
                event={calendarEvent}
                persistedResponse={persistedResponse}
                onResponseSent={onResponseSent}
              />
            </div>
          )}

          {/* Body */}
          {resolved ? (
            <EmailBody
              body={resolved.body}
              type={resolved.type}
              stripQuotes
              embeddedParts={email.attachments}
            />
          ) : (
            <p className="px-4 py-6 text-sm text-stone-400 dark:text-stone-500">
              No content.
            </p>
          )}

          {/* Attachments */}
          {downloadableAttachments.length > 0 && (
            <div className="px-4">
              <AttachmentList attachments={downloadableAttachments} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thread view — the full stacked list
// ---------------------------------------------------------------------------

interface Props {
  emails: Email[]; // sorted oldest → newest
  calendarEvents: (CalendarEventData | null)[];
  spamMailboxId?: string;
  inboxMailboxId?: string;
}

export default function ThreadView({ emails, calendarEvents, spamMailboxId, inboxMailboxId }: Props) {
  // Start with the most recent email expanded
  const lastId = emails[emails.length - 1]?.id;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(lastId ? [lastId] : [])
  );

  // Persists RSVP responses across collapse/expand so CalendarEventCard
  // doesn't lose its confirmed state when it unmounts and remounts.
  const [rsvpResponses, setRsvpResponses] = useState<Record<string, CalendarResponse>>({});

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-2 pb-8">
      {emails.map((email, i) => (
        <EmailStackItem
          key={email.id}
          email={email}
          calendarEvent={calendarEvents[i] ?? null}
          persistedResponse={rsvpResponses[email.id]}
          onResponseSent={(r) => setRsvpResponses((prev) => ({ ...prev, [email.id]: r }))}
          expanded={expandedIds.has(email.id)}
          onToggle={() => toggle(email.id)}
          spamMailboxId={spamMailboxId}
          inboxMailboxId={inboxMailboxId}
        />
      ))}
    </div>
  );
}
