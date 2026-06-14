"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { promoteNotSpamAction } from "@/app/(inbox)/email/[id]/actions";

interface Props {
  emailId: string;
  mailboxIds: Record<string, boolean>;
  inboxMailboxId: string;
}

export default function NotSpamButton({ emailId, mailboxIds, inboxMailboxId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      await promoteNotSpamAction(emailId, mailboxIds, inboxMailboxId);
      router.push("/spam");
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="whitespace-nowrap text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors disabled:opacity-50"
    >
      {isPending ? "Moving…" : "Not Spam"}
    </button>
  );
}
