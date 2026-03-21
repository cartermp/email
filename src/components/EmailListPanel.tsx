"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Email } from "@/lib/types";
import { formatAddressList, formatDate } from "@/lib/format";
import { markEmailAsRead } from "@/app/(inbox)/email/[id]/actions";

interface Props {
  emails: Email[];
  unreadCount?: number;
}

export default function EmailListPanel({ emails, unreadCount = 0 }: Props) {
  const pathname = usePathname();
  const selectedId = pathname.startsWith("/email/")
    ? pathname.slice("/email/".length)
    : undefined;

  // Track emails marked read this session so the list stays accurate
  // even though the layout's server data is only fetched once.
  const [clientReadIds, setClientReadIds] = useState(new Set<string>());

  useEffect(() => {
    if (!selectedId) return;
    const email = emails.find((e) => e.id === selectedId);
    if (!email) return;
    const alreadyRead = !!email.keywords?.["$seen"] || clientReadIds.has(selectedId);
    if (!alreadyRead) {
      setClientReadIds((prev) => new Set([...prev, selectedId]));
      markEmailAsRead(selectedId);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="w-72 shrink-0 flex flex-col border-r border-stone-200 dark:border-stone-700 h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 h-12 flex items-center justify-between border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 shrink-0">
        <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          Inbox
          {unreadCount > 0 && (
            <span className="ml-2 font-normal text-stone-400 dark:text-stone-500">
              {unreadCount}
            </span>
          )}
        </span>
        <Link
          href="/compose"
          className="text-xs font-medium px-2.5 py-1 rounded-md bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
        >
          Compose
        </Link>
      </div>

      {/* Email list */}
      <div className="overflow-y-auto flex-1 bg-stone-50 dark:bg-stone-900">
        {emails.length === 0 && (
          <p className="p-6 text-sm text-stone-400 dark:text-stone-500">No emails.</p>
        )}
        {emails.map((email) => {
          const isSelected = email.id === selectedId;
          const isUnread =
            !email.keywords?.["$seen"] &&
            !clientReadIds.has(email.id) &&
            email.id !== selectedId;

          return (
            <Link
              key={email.id}
              href={`/email/${email.id}`}
              className={[
                "flex flex-col gap-0.5 px-4 py-2.5 border-b transition-colors",
                "border-stone-100 dark:border-stone-700/60",
                isSelected
                  ? "bg-stone-200 dark:bg-stone-800"
                  : "hover:bg-stone-100 dark:hover:bg-stone-900",
              ].join(" ")}
            >
              <div className="flex items-center gap-2">
                <div className="w-1.5 shrink-0">
                  {isUnread && (
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  )}
                </div>
                <span
                  className={[
                    "flex-1 text-sm truncate",
                    isUnread
                      ? "font-semibold text-stone-900 dark:text-stone-100"
                      : "text-stone-500 dark:text-stone-400",
                  ].join(" ")}
                >
                  {formatAddressList(email.from) || "(no sender)"}
                </span>
                <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500 tabular-nums">
                  {formatDate(email.receivedAt)}
                </span>
              </div>
              <div className="pl-3.5 text-xs truncate">
                <span
                  className={
                    isUnread
                      ? "font-semibold text-stone-800 dark:text-stone-200"
                      : "text-stone-500 dark:text-stone-400"
                  }
                >
                  {email.subject || "(no subject)"}
                </span>
                {email.preview && (
                  <span className="text-stone-400 dark:text-stone-600">
                    {" — "}
                    {email.preview}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
