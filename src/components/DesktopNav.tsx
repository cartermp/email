"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import LiveUnreadCountBadge from "@/components/LiveUnreadCountBadge";
import MailIcon, { type MailIconName } from "@/components/MailIcon";

interface NavItem {
  href: string;
  label: string;
  icon: MailIconName;
  badge?: "inbox" | "drafts" | "spam";
}

const mailboxItems: NavItem[] = [
  { href: "/", label: "Inbox", icon: "inbox", badge: "inbox" },
  { href: "/drafts", label: "Drafts", icon: "drafts", badge: "drafts" },
  { href: "/sent", label: "Sent", icon: "sent" },
  { href: "/spam", label: "Spam", icon: "spam", badge: "spam" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
];

function isActive(
  item: NavItem,
  pathname: string,
  from: string | null,
): boolean {
  if (item.href === "/") {
    return (
      (pathname === "/" ||
        pathname.startsWith("/email/") ||
        pathname.startsWith("/thread/") ||
        pathname.startsWith("/attachment/")) &&
      from !== "spam" &&
      from !== "sent"
    );
  }
  if (item.href === "/sent") {
    return pathname.startsWith("/sent") || from === "sent";
  }
  if (item.href === "/spam") {
    return pathname.startsWith("/spam") || from === "spam";
  }
  return pathname.startsWith(item.href);
}

function NavLink({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={[
        "group flex min-h-10 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
        active
          ? "bg-stone-100 font-medium text-stone-900 dark:bg-stone-800 dark:text-stone-100"
          : "text-stone-500 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100",
      ].join(" ")}
    >
      <MailIcon
        name={item.icon}
        className={[
          "h-[18px] w-[18px] shrink-0",
          active
            ? "text-blue-600 dark:text-blue-400"
            : "text-stone-400 group-hover:text-stone-600 dark:text-stone-500 dark:group-hover:text-stone-300",
        ].join(" ")}
      />
      <span className="flex-1">{item.label}</span>
      {item.badge && (
        <LiveUnreadCountBadge
          mailbox={item.badge === "inbox" ? undefined : item.badge}
          className="shrink-0"
        />
      )}
    </Link>
  );
}

export default function DesktopNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Link
        href="/compose"
        className={[
          "mb-5 flex min-h-11 items-center justify-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors",
          pathname.startsWith("/compose")
            ? "bg-blue-700 text-white dark:bg-blue-500 dark:text-stone-950"
            : "bg-stone-900 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300",
        ].join(" ")}
        aria-current={pathname.startsWith("/compose") ? "page" : undefined}
      >
        <MailIcon name="compose" className="h-[18px] w-[18px]" />
        Compose
      </Link>

      <div className="flex flex-col gap-1">
        {mailboxItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(item, pathname, from)}
          />
        ))}
      </div>

      <div className="mt-auto pt-4">
        <NavLink
          item={{ href: "/settings", label: "Settings", icon: "settings" }}
          active={pathname.startsWith("/settings")}
        />
      </div>
    </div>
  );
}
