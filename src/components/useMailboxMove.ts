"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { bulkMoveToMailbox } from "@/app/(inbox)/actions";
import { useToast } from "@/components/ToastProvider";

interface MoveEmail {
  id: string;
  mailboxIds: Record<string, boolean>;
}

interface MoveOptions {
  emails: MoveEmail[];
  sourceMailboxId: string;
  targetMailboxId: string;
  successMessage: string;
  failureMessage?: string;
  navigateTo?: string;
  onOptimistic?: () => void;
  onRevert?: () => void;
}

/**
 * One move/undo implementation for list, thread, and opened-message actions.
 */
export default function useMailboxMove() {
  const router = useRouter();
  const showToast = useToast();
  const [movingTo, setMovingTo] = useState<string | null>(null);

  const moveEmails = useCallback(
    async ({
      emails,
      sourceMailboxId,
      targetMailboxId,
      successMessage,
      failureMessage = "Could not move those messages.",
      navigateTo,
      onOptimistic,
      onRevert,
    }: MoveOptions) => {
      if (!emails.length || movingTo) return false;

      setMovingTo(targetMailboxId);
      onOptimistic?.();
      const movePromise = bulkMoveToMailbox(emails, targetMailboxId);

      showToast({
        message: successMessage,
        actionLabel: "Undo",
        onAction: async () => {
          try {
            await movePromise;
            await bulkMoveToMailbox(
              emails.map((email) => ({
                id: email.id,
                mailboxIds: { [targetMailboxId]: true },
              })),
              sourceMailboxId,
            );
            onRevert?.();
            router.refresh();
          } catch {
            showToast({
              message: "Could not undo that move.",
              tone: "error",
            });
          }
        },
      });

      try {
        await movePromise;
        if (navigateTo) router.replace(navigateTo);
        router.refresh();
        return true;
      } catch {
        onRevert?.();
        showToast({ message: failureMessage, tone: "error" });
        return false;
      } finally {
        setMovingTo(null);
      }
    },
    [movingTo, router, showToast],
  );

  return { moveEmails, movingTo };
}
