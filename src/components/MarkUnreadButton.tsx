"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { markEmailAsUnread } from "@/app/(inbox)/email/[id]/actions";

interface Props {
  emailId: string;
}

export default function MarkUnreadButton({ emailId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await markEmailAsUnread(emailId);
      // Signal EmailListPanel to remove this email from its optimistic-read set
      window.dispatchEvent(new CustomEvent("email-mark-unread", { detail: emailId }));
      router.push("/");
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors disabled:opacity-50"
    >
      {isPending ? "Marking…" : "Mark as unread"}
    </button>
  );
}
