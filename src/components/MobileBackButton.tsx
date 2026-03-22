"use client";

import { useRouter } from "next/navigation";

export default function MobileBackButton({ label = "Back" }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="md:hidden flex items-center gap-1 text-sm text-stone-500 dark:text-stone-400 active:text-stone-900 dark:active:text-stone-100 mb-4"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
        <path d="M15 18l-6-6 6-6" />
      </svg>
      {label}
    </button>
  );
}
