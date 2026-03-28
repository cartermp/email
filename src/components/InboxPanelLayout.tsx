"use client";

import { usePathname } from "next/navigation";

interface Props {
  list: React.ReactNode;
  children: React.ReactNode;
}

export default function InboxPanelLayout({ list, children }: Props) {
  const pathname = usePathname();
  const showDetail =
    pathname.startsWith("/email/") ||
    pathname.startsWith("/thread/") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/sent");

  return (
    <div className="flex h-full w-full">
      {/* List panel */}
      <div
        className={[
          "flex-col border-r border-stone-200 dark:border-stone-500 h-full overflow-hidden",
          "md:flex md:w-96 md:shrink-0",
          showDetail ? "hidden" : "flex w-full",
        ].join(" ")}
      >
        <div className="flex-1 min-h-0 overflow-hidden">
          {list}
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
