"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import MailIcon from "@/components/MailIcon";
import MarkUnreadButton from "@/components/MarkUnreadButton";
import NotSpamButton from "@/components/NotSpamButton";
import PinButton from "@/components/PinButton";
import Popover from "@/components/Popover";

interface Props {
  emailId: string;
  hasMultipleRecipients: boolean;
  initiallyPinned: boolean;
  isSpam: boolean;
  mailboxIds: Record<string, boolean>;
  inboxMailboxId?: string;
  className?: string;
}

function ActionSlot({
  columns,
  action,
  children,
}: {
  columns: "col-span-2" | "col-span-3";
  action: string;
  children: ReactNode;
}) {
  return (
    <div
      data-message-action={action}
      className={[
        columns,
        "min-w-0 [&>*]:min-h-11 [&>*]:w-full [&>*]:justify-center sm:[&>*]:min-h-10 sm:[&>*]:w-auto",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

export default function MessageActionBar({
  emailId,
  hasMultipleRecipients,
  initiallyPinned,
  isSpam,
  mailboxIds,
  inboxMailboxId,
  className = "",
}: Props) {
  const showNotSpam = isSpam && !!inboxMailboxId;
  const secondaryColumns = showNotSpam ? "col-span-3" : "col-span-2";

  return (
    <div
      data-message-action-bar
      className={[
        "grid grid-cols-6 items-center gap-2 px-4 py-3 sm:flex sm:flex-wrap",
        className,
      ].join(" ")}
    >
      <Link
        data-message-action="reply-primary"
        href={`/compose?mode=${hasMultipleRecipients ? "reply-all" : "reply"}&id=${emailId}`}
        className={[
          hasMultipleRecipients ? "col-span-4" : "col-span-6",
          "inline-flex min-h-11 w-full items-center justify-center gap-2 whitespace-nowrap rounded-md bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300 sm:min-h-10 sm:w-auto",
        ].join(" ")}
      >
        <MailIcon name="reply" className="h-4 w-4" />
        {hasMultipleRecipients ? "Reply all" : "Reply"}
      </Link>

      {hasMultipleRecipients && (
        <Link
          data-message-action="reply"
          href={`/compose?mode=reply&id=${emailId}`}
          className="col-span-2 inline-flex min-h-11 w-full items-center justify-center whitespace-nowrap rounded-md border border-stone-200 px-3 text-xs text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-100 sm:min-h-10 sm:w-auto"
        >
          Reply
        </Link>
      )}

      <div className="contents sm:ml-auto sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-2">
        {showNotSpam && (
          <ActionSlot columns={secondaryColumns} action="not-spam">
            <NotSpamButton
              emailId={emailId}
              mailboxIds={mailboxIds}
              inboxMailboxId={inboxMailboxId}
            />
          </ActionSlot>
        )}

        <ActionSlot columns={secondaryColumns} action="pin">
          <PinButton emailId={emailId} initiallyPinned={initiallyPinned} />
        </ActionSlot>

        <ActionSlot columns={secondaryColumns} action="mark-unread">
          <MarkUnreadButton emailId={emailId} />
        </ActionSlot>

        <ActionSlot columns={secondaryColumns} action="more">
          <Popover
            label="More message actions"
            trigger={
              <>
                More
                <MailIcon name="chevronDown" className="h-3.5 w-3.5" />
              </>
            }
            triggerClassName="flex min-h-11 w-full items-center justify-center gap-1 rounded-md border border-stone-200 px-3 text-xs text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-100 sm:min-h-10 sm:w-auto"
            contentClassName="min-w-36 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 text-sm shadow-lg dark:border-stone-700 dark:bg-stone-900"
          >
            <Link
              href={`/compose?mode=forward&id=${emailId}`}
              role="menuitem"
              className="block px-3 py-2.5 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Forward
            </Link>
            <Link
              href={`/print/${emailId}`}
              target="_blank"
              role="menuitem"
              className="block px-3 py-2.5 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Print
            </Link>
          </Popover>
        </ActionSlot>
      </div>
    </div>
  );
}
