"use client";

import { useRouter } from "next/navigation";

export default function MobileBackButton({
  label = "Back",
  compact = false,
}: {
  label?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push("/");
      }}
      className={[
        "lg:hidden min-h-10 items-center gap-1 text-sm text-stone-500 dark:text-stone-400 active:text-stone-900 dark:active:text-stone-100 touch-manipulation",
        compact ? "flex" : "mb-4 flex",
      ].join(" ")}
      aria-label={label ? `Back to ${label}` : "Go back"}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}
