"use client";

import { usePathname } from "next/navigation";

interface Props {
  list: React.ReactNode;
  children: React.ReactNode;
}

export default function InboxPanelLayout({ list, children }: Props) {
  const pathname = usePathname();
  // On mobile, show the detail panel when viewing an email or thread
  const showDetail =
    pathname.startsWith("/email/") || pathname.startsWith("/thread/");

  return (
    <div className="flex h-full w-full">
      {/* List panel: fixed-width sidebar on desktop, full-screen on mobile when not viewing detail */}
      <div
        className={[
          "flex-col border-r border-stone-200 dark:border-stone-700 h-full overflow-hidden",
          "md:flex md:w-72 md:shrink-0",
          showDetail ? "hidden" : "flex w-full",
        ].join(" ")}
      >
        {list}
      </div>

      {/* Detail panel: flex-1 on desktop, full-screen on mobile when viewing detail */}
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
