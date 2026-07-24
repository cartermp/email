"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import MailIcon, { type MailIconName } from "@/components/MailIcon";
import { useMailboxCounts } from "@/components/UnreadCountProvider";
import UnreadCountBadge from "@/components/UnreadCountBadge";
import useModalDialog from "@/components/useModalDialog";

interface Destination {
  href: string;
  label: string;
  icon: MailIconName;
  badge?: number;
}

function destinationActive(
  href: string,
  pathname: string,
  from: string | null,
): boolean {
  if (href === "/") {
    return (
      (pathname === "/" ||
        pathname.startsWith("/email/") ||
        pathname.startsWith("/thread/") ||
        pathname.startsWith("/attachment/")) &&
      from !== "spam" &&
      from !== "sent"
    );
  }
  if (href === "/sent") return pathname.startsWith("/sent") || from === "sent";
  if (href === "/spam") return pathname.startsWith("/spam") || from === "spam";
  return pathname.startsWith(href);
}

function DestinationLink({
  item,
  active,
  compact = false,
  onNavigate,
}: {
  item: Destination;
  active: boolean;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  if (compact) {
    return (
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? "page" : undefined}
        className={[
          "flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm transition-colors",
          active
            ? "bg-stone-100 font-medium text-stone-900 dark:bg-stone-800 dark:text-stone-100"
            : "text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800",
        ].join(" ")}
      >
        <MailIcon
          name={item.icon}
          className={[
            "h-5 w-5",
            active
              ? "text-blue-600 dark:text-blue-400"
              : "text-stone-400 dark:text-stone-500",
          ].join(" ")}
        />
        <span className="flex-1">{item.label}</span>
        {!!item.badge && <UnreadCountBadge count={item.badge} />}
      </Link>
    );
  }

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={[
        "relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium touch-manipulation transition-colors",
        active
          ? "text-blue-600 dark:text-blue-400"
          : "text-stone-500 dark:text-stone-400",
      ].join(" ")}
    >
      <span className="relative inline-flex">
        <MailIcon name={item.icon} className="h-5 w-5" />
        {!!item.badge && (
          <UnreadCountBadge
            count={item.badge}
            className="absolute -right-3 -top-2 min-w-4 px-1 text-[9px]"
          />
        )}
      </span>
      {item.label}
      {active && (
        <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-blue-500" />
      )}
    </Link>
  );
}

export default function MobileNav() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const counts = useMailboxCounts();
  const [moreOpen, setMoreOpen] = useState(false);
  const closeMore = () => setMoreOpen(false);
  const dialogRef = useModalDialog(closeMore, moreOpen);

  const primary: Destination[] = [
    { href: "/", label: "Inbox", icon: "inbox", badge: counts.inbox },
    { href: "/calendar", label: "Calendar", icon: "calendar" },
    { href: "/compose", label: "Compose", icon: "compose" },
  ];

  const secondary: Destination[] = [
    { href: "/drafts", label: "Drafts", icon: "drafts", badge: counts.drafts },
    { href: "/sent", label: "Sent", icon: "sent" },
    { href: "/spam", label: "Spam", icon: "spam", badge: counts.spam },
    { href: "/settings", label: "Settings", icon: "settings" },
  ];

  const secondaryActive = secondary.some((item) =>
    destinationActive(item.href, pathname, from),
  );

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            onClick={closeMore}
            aria-label="Close more navigation"
          />
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="more-navigation-title"
            tabIndex={-1}
            className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-stone-200 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 shadow-2xl dark:border-stone-700 dark:bg-stone-950"
          >
            <div className="mb-3 flex items-center justify-between px-2">
              <h2
                id="more-navigation-title"
                className="text-sm font-semibold text-stone-800 dark:text-stone-200"
              >
                Mailboxes
              </h2>
              <button
                type="button"
                onClick={closeMore}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                aria-label="Close"
              >
                <MailIcon name="x" className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-1">
              {secondary.map((item) => (
                <DestinationLink
                  key={item.href}
                  item={item}
                  active={destinationActive(item.href, pathname, from)}
                  compact
                  onNavigate={closeMore}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      <nav
        className="relative z-40 flex shrink-0 border-t border-stone-200 bg-white pb-[env(safe-area-inset-bottom)] dark:border-stone-800 dark:bg-stone-950 lg:hidden"
        aria-label="Primary navigation"
      >
        {primary.map((item) => (
          <DestinationLink
            key={item.href}
            item={item}
            active={destinationActive(item.href, pathname, from)}
          />
        ))}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          className={[
            "relative flex min-h-[58px] flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium touch-manipulation transition-colors",
            secondaryActive || moreOpen
              ? "text-blue-600 dark:text-blue-400"
              : "text-stone-500 dark:text-stone-400",
          ].join(" ")}
        >
          <MailIcon name="more" className="h-5 w-5" />
          More
          {secondaryActive && (
            <span className="absolute inset-x-5 bottom-0 h-0.5 rounded-full bg-blue-500" />
          )}
        </button>
      </nav>
    </>
  );
}
