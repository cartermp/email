"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { promoteNotSpamAction } from "@/app/(inbox)/email/[id]/actions";
import { useToast } from "@/components/ToastProvider";

interface Props {
  emailId: string;
  mailboxIds: Record<string, boolean>;
  inboxMailboxId: string;
}

export default function NotSpamButton({ emailId, mailboxIds, inboxMailboxId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();

  function handleClick() {
    startTransition(async () => {
      try {
        await promoteNotSpamAction(emailId, mailboxIds, inboxMailboxId);
        showToast({ message: "Moved to Inbox" });
        router.push("/spam");
      } catch {
        showToast({
          message: "Couldn’t move this message to Inbox.",
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
      {isPending ? "Moving…" : "Not Spam"}
    </button>
  );
}
