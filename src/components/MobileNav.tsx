"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function InboxIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5" aria-hidden="true">
      <path d="M4 4h16v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4z" />
      <path d="M4 13h4l2 3h4l2-3h4" />
    </svg>
  );
}

function DraftsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function ComposeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

export default function MobileNav() {
  const pathname = usePathname();

  const tabs = [
    {
      href: "/",
      label: "Inbox",
      icon: <InboxIcon />,
      active: pathname === "/" || pathname.startsWith("/email/"),
    },
    {
      href: "/drafts",
      label: "Drafts",
      icon: <DraftsIcon />,
      active: pathname.startsWith("/drafts"),
    },
    {
      href: "/compose",
      label: "Compose",
      icon: <ComposeIcon />,
      active: pathname.startsWith("/compose"),
    },
  ];

  return (
    <nav className="md:hidden shrink-0 flex border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
      {tabs.map(({ href, label, icon, active }) => (
        <Link
          key={href}
          href={href}
          className={[
            "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-[11px] transition-colors",
            active
              ? "text-stone-900 dark:text-stone-100"
              : "text-stone-400 dark:text-stone-600",
          ].join(" ")}
        >
          {icon}
          {label}
        </Link>
      ))}
    </nav>
  );
}
