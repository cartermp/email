"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { togglePinAction } from "@/app/(inbox)/actions";

interface Props {
  emailId: string;
  initiallyPinned: boolean;
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 12 8 12s8-6.75 8-12C20 5.58 16.42 2 12 2z" />
    </svg>
  );
}

export default function PinButton({ emailId, initiallyPinned }: Props) {
  const router = useRouter();
  const [pinned, setPinned] = useState(initiallyPinned);
  const [pending, setPending] = useState(false);

  async function handleClick() {
    const next = !pinned;
    setPinned(next);
    setPending(true);
    try {
      await togglePinAction(emailId, next);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className={[
        "inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50",
        pinned
          ? "border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-950/60"
          : "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100",
      ].join(" ")}
    >
      <PinIcon className="w-3 h-3" />
      {pinned ? "Pinned" : "Pin"}
    </button>
  );
}
