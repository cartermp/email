"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Email } from "@/lib/types";
import { formatAddressList, formatDate } from "@/lib/format";
import { markEmailAsRead } from "@/app/(inbox)/email/[id]/actions";
import { loadMoreEmails, searchEmailsAction } from "@/app/(inbox)/actions";

interface Props {
  emails: Email[];
  inboxId: string;
  initialTotal: number;
  unreadCount?: number;
}

export default function EmailListPanel({
  emails,
  inboxId,
  initialTotal,
  unreadCount = 0,
}: Props) {
  const pathname = usePathname();
  const selectedId = pathname.startsWith("/email/")
    ? pathname.slice("/email/".length)
    : undefined;

  const [clientReadIds, setClientReadIds] = useState(new Set<string>());

  // Inbox list + pagination
  const [inboxEmails, setInboxEmails] = useState(emails);
  const [total, setTotal] = useState(initialTotal);
  const [loadingMore, setLoadingMore] = useState(false);

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Email[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const isInSearchMode = searchQuery.trim().length > 0;
  const visibleEmails = isInSearchMode ? searchResults : inboxEmails;
  const hasMore = !isInSearchMode && inboxEmails.length < total;

  // Debounced search
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchEmailsAction(q);
        setSearchResults(results);
      } finally {
        setIsSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Mark as read
  useEffect(() => {
    if (!selectedId) return;
    const email = visibleEmails.find((e) => e.id === selectedId);
    if (!email) return;
    const alreadyRead = !!email.keywords?.["$seen"] || clientReadIds.has(selectedId);
    if (!alreadyRead) {
      setClientReadIds((prev) => new Set([...prev, selectedId]));
      markEmailAsRead(selectedId);
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      const { emails: more, total: newTotal } = await loadMoreEmails(
        inboxId,
        inboxEmails.length
      );
      setInboxEmails((prev) => [...prev, ...more]);
      setTotal(newTotal);
    } finally {
      setLoadingMore(false);
    }
  }

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

      {/* Search input */}
      <div className="relative px-3 py-2 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 shrink-0">
        <input
          ref={searchInputRef}
          type="search"
          placeholder="Search all mail…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          className="w-full text-sm rounded-md px-2.5 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 border border-transparent focus:border-stone-300 dark:focus:border-stone-600 focus:outline-none"
        />
        {searchFocused && (
          <div className="absolute left-3 right-3 top-full mt-1 z-10 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-lg text-xs overflow-hidden">
            <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800 text-stone-400 dark:text-stone-500 font-medium uppercase tracking-wide text-[10px]">
              Search syntax
            </div>
            {(
              [
                ["from:", "sender"],
                ["to:", "recipient"],
                ["cc:", "CC'd"],
                ["subject:", "subject line"],
              ] as [string, string][]
            ).map(([prefix, desc]) => (
              <button
                key={prefix}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // keep input focused
                  setSearchQuery((q) => {
                    const trimmed = q.trimEnd();
                    return trimmed ? trimmed + " " + prefix : prefix;
                  });
                  searchInputRef.current?.focus();
                }}
                className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 text-left cursor-pointer"
              >
                <code className="text-stone-700 dark:text-stone-300 font-mono">{prefix}<span className="text-stone-400 dark:text-stone-500">…</span></code>
                <span className="text-stone-400 dark:text-stone-500">{desc}</span>
              </button>
            ))}
            <div className="px-3 py-1.5 text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-stone-800">
              Combine: <code className="font-mono text-stone-600 dark:text-stone-400">from:alice invoice</code>
            </div>
          </div>
        )}
      </div>

      {/* Email list */}
      <div className="overflow-y-auto flex-1 bg-stone-50 dark:bg-stone-900">
        {isSearching && (
          <p className="p-4 text-sm text-stone-400 dark:text-stone-500">Searching…</p>
        )}
        {!isSearching && visibleEmails.length === 0 && (
          <p className="p-6 text-sm text-stone-400 dark:text-stone-500">
            {isInSearchMode ? "No results." : "No emails."}
          </p>
        )}
        {!isSearching &&
          visibleEmails.map((email) => {
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

        {hasMore && (
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="w-full py-3 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
          >
            {loadingMore ? "Loading…" : `Load more (${inboxEmails.length} of ${total})`}
          </button>
        )}
      </div>
    </div>
  );
}
