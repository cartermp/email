"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  list: React.ReactNode;
  children: React.ReactNode;
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

export default function InboxPanelLayout({ list, children }: Props) {
  const pathname = usePathname();
  const showDetail =
    pathname.startsWith("/email/") ||
    pathname.startsWith("/thread/") ||
    pathname.startsWith("/settings");

  return (
    <div className="flex h-full w-full">
      {/* List panel */}
      <div
        className={[
          "flex-col border-r border-stone-200 dark:border-stone-700 h-full overflow-hidden",
          "md:flex md:w-72 md:shrink-0",
          showDetail ? "hidden" : "flex w-full",
        ].join(" ")}
      >
        <div className="flex-1 min-h-0 overflow-hidden">
          {list}
        </div>
        {/* Settings link */}
        <div className="shrink-0 border-t border-stone-200 dark:border-stone-700">
          <Link
            href="/settings"
            className={[
              "flex items-center gap-2 px-4 py-3 text-xs transition-colors",
              pathname.startsWith("/settings")
                ? "text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800"
                : "text-stone-400 dark:text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50",
            ].join(" ")}
          >
            <SettingsIcon />
            Settings
          </Link>
        </div>
      </div>

      {/* Detail panel */}
      <div
        className={[
          "flex-1 overflow-hidden min-w-0 h-full",
          showDetail ? "flex flex-col" : "hidden md:flex md:flex-col",
        ].join(" ")}
      >
        {children}
      </div>
    </div>
  );
}
