"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUnreadCount } from "@/components/UnreadCountProvider";
import UnreadCountBadge from "@/components/UnreadCountBadge";

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

function SentIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12zm0 0h7.5" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

export default function MobileNav() {
  const pathname = usePathname();
  const unreadTotal = useUnreadCount();

  const tabs = [
    {
      href: "/",
      label: "Inbox",
      icon: <InboxIcon />,
      active:
        pathname === "/" ||
        pathname.startsWith("/email/") ||
        pathname.startsWith("/thread/") ||
        pathname.startsWith("/attachment/"),
      badge: unreadTotal,
    },
    {
      href: "/drafts",
      label: "Drafts",
      icon: <DraftsIcon />,
      active: pathname.startsWith("/drafts"),
      badge: 0,
    },
    {
      href: "/sent",
      label: "Sent",
      icon: <SentIcon />,
      active: pathname.startsWith("/sent"),
      badge: 0,
    },
    {
      href: "/compose",
      label: "Compose",
      icon: <ComposeIcon />,
      active: pathname.startsWith("/compose"),
      badge: 0,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: <SettingsIcon />,
      active: pathname.startsWith("/settings"),
      badge: 0,
    },
  ];

  return (
    <nav className="md:hidden shrink-0 flex border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950">
      {tabs.map(({ href, label, icon, active, badge }) => (
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
          <span className="relative inline-flex">
            {icon}
            {badge > 0 && (
              <UnreadCountBadge
                count={badge}
                className="absolute -right-3 -top-2 min-w-4 px-1 text-[9px]"
              />
            )}
          </span>
          {label}
        </Link>
      ))}
    </nav>
  );
}
