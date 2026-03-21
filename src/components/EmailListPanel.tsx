"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Email } from "@/lib/types";
import { isPinned, sortEmailsByPin, mergeEmailUpdates } from "@/lib/emailList";
import { formatAddressList, formatDate } from "@/lib/format";
import { markEmailAsRead } from "@/app/(inbox)/email/[id]/actions";
import { loadMoreEmails, searchEmailsAction } from "@/app/(inbox)/actions";

interface Props {
  emails: Email[];
  inboxId: string;
  initialTotal: number;
  unreadCount?: number;
  drafts?: Email[];
}

type View = "inbox" | "drafts";

export default function EmailListPanel({
  emails,
  inboxId,
  initialTotal,
  unreadCount = 0,
  drafts = [],
}: Props) {
  const pathname = usePathname();
  const selectedId = pathname.startsWith("/email/")
    ? pathname.slice("/email/".length)
    : undefined;

  const view: View = pathname.startsWith("/drafts") ? "drafts" : "inbox";
  const [clientReadIds, setClientReadIds] = useState(new Set<string>());

  const [extraEmails, setExtraEmails] = useState<Email[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setExtraEmails((prev) => mergeEmailUpdates(prev, emails));
  }, [emails]); // eslint-disable-line react-hooks/exhaustive-deps

  // Search (inbox only)
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Email[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === "drafts") setSearchQuery("");
  }, [view]);

  const isInSearchMode = searchQuery.trim().length > 0;

  const allInboxEmails = useMemo(() => {
    const propIds = new Set(emails.map((e) => e.id));
    return [...emails, ...extraEmails.filter((e) => !propIds.has(e.id))];
  }, [emails, extraEmails]);

  const sortedInboxEmails = useMemo(
    () => sortEmailsByPin(allInboxEmails),
    [allInboxEmails]
  );

  const visibleEmails = isInSearchMode ? searchResults : sortedInboxEmails;
  const hasMore = !isInSearchMode && allInboxEmails.length < initialTotal;
  const pinnedCount = isInSearchMode
    ? 0
    : sortedInboxEmails.filter(isPinned).length;

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
      const { emails: more } = await loadMoreEmails(inboxId, allInboxEmails.length);
      setExtraEmails((prev) => [...prev, ...more]);
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="w-72 shrink-0 flex flex-col border-r border-stone-200 dark:border-stone-700 h-full overflow-hidden">

      {/* Compose button */}
      <div className="shrink-0 px-3 pt-3 pb-2 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900">
        <Link
          href="/compose"
          className="flex items-center justify-center text-xs font-medium py-1.5 rounded-md bg-stone-900 dark:bg-stone-100 text-stone-50 dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
        >
          Compose
        </Link>
      </div>

      {/* Search (inbox only) */}
      {view === "inbox" && (
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
                    e.preventDefault();
                    setSearchQuery((q) => {
                      const trimmed = q.trimEnd();
                      return trimmed ? trimmed + " " + prefix : prefix;
                    });
                    searchInputRef.current?.focus();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 text-left cursor-pointer"
                >
                  <code className="text-stone-700 dark:text-stone-300 font-mono">
                    {prefix}
                    <span className="text-stone-400 dark:text-stone-500">…</span>
                  </code>
                  <span className="text-stone-400 dark:text-stone-500">{desc}</span>
                </button>
              ))}
              <div className="px-3 py-1.5 text-stone-400 dark:text-stone-500 border-t border-stone-100 dark:border-stone-800">
                Combine:{" "}
                <code className="font-mono text-stone-600 dark:text-stone-400">
                  from:alice invoice
                </code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inbox list */}
      {view === "inbox" && (
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
            visibleEmails.map((email, idx) => {
              const isSelected = email.id === selectedId;
              const pinned = isPinned(email);
              const isUnread =
                !email.keywords?.["$seen"] &&
                !clientReadIds.has(email.id) &&
                email.id !== selectedId;

              const showPinnedDivider = !isInSearchMode && pinnedCount > 0 && idx === 0;
              const showRestDivider =
                !isInSearchMode && pinnedCount > 0 && idx === pinnedCount;

              return (
                <div key={email.id}>
                  {showPinnedDivider && (
                    <div className="px-4 py-1 text-[10px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-700">
                      Pinned
                    </div>
                  )}
                  {showRestDivider && (
                    <div className="px-4 py-1 text-[10px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-stone-800/60 border-b border-stone-200 dark:border-stone-700">
                      All mail
                    </div>
                  )}
                  <Link
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
                      <div className="w-3 shrink-0 flex justify-center">
                        {pinned ? (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-amber-500">
                            <path d="M12 2C7.58 2 4 5.58 4 10c0 5.25 8 12 8 12s8-6.75 8-12C20 5.58 16.42 2 12 2z" />
                          </svg>
                        ) : isUnread ? (
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        ) : null}
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
                    <div className="pl-5 text-xs truncate">
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
                </div>
              );
            })}

          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loadingMore}
              className="w-full py-3 text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              {loadingMore
                ? "Loading…"
                : `Load more (${allInboxEmails.length} of ${initialTotal})`}
            </button>
          )}
        </div>
      )}

      {/* Drafts list */}
      {view === "drafts" && (
        <div className="overflow-y-auto flex-1 bg-stone-50 dark:bg-stone-900">
          {drafts.length === 0 ? (
            <p className="p-6 text-sm text-stone-400 dark:text-stone-500">No drafts.</p>
          ) : (
            drafts.map((draft) => (
              <Link
                key={draft.id}
                href={`/compose?draftId=${draft.id}`}
                className="flex flex-col gap-0.5 px-4 py-2.5 border-b border-stone-100 dark:border-stone-700/60 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm truncate text-stone-500 dark:text-stone-400">
                    {draft.to?.map((a) => a.name ?? a.email).join(", ") || "(no recipient)"}
                  </span>
                  <span className="shrink-0 text-xs text-stone-400 dark:text-stone-500 tabular-nums">
                    {formatDate(draft.receivedAt)}
                  </span>
                </div>
                <div className="text-xs truncate text-stone-500 dark:text-stone-400">
                  {draft.subject || "(no subject)"}
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
