"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  bulkMoveToMailbox,
  permanentlyDeleteEmailsAction,
} from "@/app/(inbox)/actions";
import MailIcon from "@/components/MailIcon";
import MarkUnreadButton from "@/components/MarkUnreadButton";
import NotSpamButton from "@/components/NotSpamButton";
import PinButton from "@/components/PinButton";
import Popover from "@/components/Popover";
import { useToast } from "@/components/ToastProvider";

interface Props {
  emailId: string;
  hasMultipleRecipients: boolean;
  initiallyPinned: boolean;
  isSpam: boolean;
  mailboxIds: Record<string, boolean>;
  inboxMailboxId?: string;
  archiveMailboxId?: string;
  trashMailboxId?: string;
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
  archiveMailboxId,
  trashMailboxId,
  className = "",
}: Props) {
  const router = useRouter();
  const showToast = useToast();
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const showNotSpam = isSpam && !!inboxMailboxId;
  const secondaryColumns = showNotSpam ? "col-span-3" : "col-span-2";
  const isInbox = !!(inboxMailboxId && mailboxIds[inboxMailboxId]);
  const isArchive = !!(archiveMailboxId && mailboxIds[archiveMailboxId]);
  const isTrash = !!(trashMailboxId && mailboxIds[trashMailboxId]);
  const sourceMailboxId = isTrash
    ? trashMailboxId
    : isArchive
      ? archiveMailboxId
      : isInbox
        ? inboxMailboxId
        : Object.keys(mailboxIds)[0];
  const sourcePath = isTrash
    ? "/trash"
    : isArchive
      ? "/archive"
      : isSpam
        ? "/spam"
        : "/";

  async function moveMessage(
    targetMailboxId: string,
    successMessage: string,
  ) {
    if (!sourceMailboxId || busyAction) return;
    setBusyAction(targetMailboxId);
    const movePromise = bulkMoveToMailbox(
      [{ id: emailId, mailboxIds }],
      targetMailboxId,
    );
    showToast({
      message: successMessage,
      actionLabel: "Undo",
      onAction: async () => {
        await movePromise;
        await bulkMoveToMailbox(
          [{ id: emailId, mailboxIds: { [targetMailboxId]: true } }],
          sourceMailboxId,
        );
        router.refresh();
      },
    });
    try {
      await movePromise;
      router.replace(sourcePath);
      router.refresh();
    } catch {
      showToast({ message: "Could not move this message.", tone: "error" });
    } finally {
      setBusyAction(null);
    }
  }

  async function permanentlyDeleteMessage() {
    if (!trashMailboxId || busyAction) return;
    if (
      !window.confirm(
        "Permanently delete this message? This cannot be undone.",
      )
    ) {
      return;
    }

    setBusyAction("delete");
    try {
      await permanentlyDeleteEmailsAction([emailId], trashMailboxId);
      showToast({ message: "Message permanently deleted" });
      router.replace("/trash");
      router.refresh();
    } catch {
      showToast({
        message: "Could not permanently delete this message.",
        tone: "error",
      });
    } finally {
      setBusyAction(null);
    }
  }

  const menuButtonClass =
    "block w-full px-3 py-2.5 text-left text-stone-600 hover:bg-stone-100 disabled:cursor-wait disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-800";

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
            {isInbox && archiveMailboxId && (
              <button
                type="button"
                role="menuitem"
                disabled={!!busyAction}
                onClick={() => void moveMessage(archiveMailboxId, "Archived")}
                className={menuButtonClass}
              >
                Archive
              </button>
            )}
            {(isArchive || isTrash) && inboxMailboxId && (
              <button
                type="button"
                role="menuitem"
                disabled={!!busyAction}
                onClick={() =>
                  void moveMessage(inboxMailboxId, "Restored to Inbox")
                }
                className={menuButtonClass}
              >
                Restore to Inbox
              </button>
            )}
            {!isTrash &&
              trashMailboxId &&
              (isInbox || isArchive || isSpam) && (
                <button
                  type="button"
                  role="menuitem"
                  disabled={!!busyAction}
                  onClick={() =>
                    void moveMessage(trashMailboxId, "Moved to Trash")
                  }
                  className={menuButtonClass}
                >
                  Move to Trash
                </button>
              )}
            {isTrash && trashMailboxId && (
              <button
                type="button"
                role="menuitem"
                disabled={!!busyAction}
                onClick={() => void permanentlyDeleteMessage()}
                className={[
                  menuButtonClass,
                  "text-red-600 dark:text-red-400",
                ].join(" ")}
              >
                Delete forever
              </button>
            )}
          </Popover>
        </ActionSlot>
      </div>
    </div>
  );
}
