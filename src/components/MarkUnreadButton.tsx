"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markEmailAsUnread } from "@/app/(inbox)/email/[id]/actions";
import { dispatchUnreadCountEvent } from "@/lib/unreadCount";
import { useToast } from "@/components/ToastProvider";

interface Props {
  emailId: string;
}

export default function MarkUnreadButton({ emailId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleClick() {
    startTransition(async () => {
      try {
        await markEmailAsUnread(emailId);
        // Signal EmailListPanel to remove this email from its optimistic-read set
        window.dispatchEvent(new CustomEvent("email-mark-unread", { detail: emailId }));
        dispatchUnreadCountEvent("unread", [emailId]);
        showToast({ message: "Marked as unread" });
        router.push("/");
      } catch {
        showToast({
          message: "Couldn’t mark this message as unread.",
          tone: "error",
        });
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="min-h-10 whitespace-nowrap rounded-md border border-stone-200 px-3 text-xs text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 disabled:opacity-50 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
    >
      {isPending ? "Marking…" : "Mark as unread"}
    </button>
  );
}
