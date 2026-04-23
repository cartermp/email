"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import SenderAvatar from "@/components/SenderAvatar";
import { useUnreadCount } from "@/components/UnreadCountProvider";
import UnreadCountBadge from "@/components/UnreadCountBadge";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Email } from "@/lib/types";
import { isPinned, mergeEmailUpdates, groupIntoThreads } from "@/lib/emailList";
import { formatDate } from "@/lib/format";
import { loadMoreUnreads, loadMoreReads, searchEmailsAction, bulkMarkAsRead, bulkMarkAsUnread, bulkSetPin, bulkMoveToMailbox } from "@/app/(inbox)/actions";
import { deleteDraftAction } from "@/app/compose/actions";
import { dispatchUnreadCountEvent, getReadEmailIds, getUnreadEmailIds, isEmailUnread } from "@/lib/unreadCount";

interface Props {
  unreads: Email[];
  unreadTotal: number;
  reads: Email[];
  readTotal: number;
  inboxId: string;
  drafts?: Email[];
  sentEmails?: Email[];
  pinnedEmails?: Email[];
  archiveMailboxId?: string;
  trashMailboxId?: string;
}

type View = "inbox" | "drafts" | "sent";

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function IconDot() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="5" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z" />
    </svg>
  );
}

function IconUnpin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0zM3 3l18 18" />
    </svg>
  );
}

function IconArchive() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}

function IconRefresh({ spinning = false }: { spinning?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      className={["w-4 h-4", spinning ? "animate-spin" : ""].join(" ")}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992V4.356" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.49 9A9 9 0 0 0 5.64 5.64L3 8.28" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.977 14.652H2.985v4.992" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.51 15A9 9 0 0 0 18.36 18.36L21 15.72" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function EmailListPanel({
  unreads,
  unreadTotal,
  reads,
  readTotal,
  inboxId,
  drafts = [],
  sentEmails = [],
  pinnedEmails = [],
  archiveMailboxId,
  trashMailboxId,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedThreadId = pathname.startsWith("/thread/")
    ? pathname.slice("/thread/".length)
    : undefined;
  // Single-email threads navigate to /email/[id]; resolve the threadId so
  // the list row stays highlighted correctly for both URL shapes.
  const selectedEmailId = pathname.startsWith("/email/")
    ? pathname.slice("/email/".length)
    : undefined;

  const view: View = pathname.startsWith("/drafts")
    ? "drafts"
    : pathname.startsWith("/sent") || searchParams.get("from") === "sent"
    ? "sent"
    : "inbox";

  // -------------------------------------------------------------------------
  // Read / unread client-side overrides
  // -------------------------------------------------------------------------
  const [clientReadIds, setClientReadIds] = useState(new Set<string>());
  const [clientUnreadIds, setClientUnreadIds] = useState(new Set<string>());

  useEffect(() => {
    function onMarkUnread(e: Event) {
      const id = (e as CustomEvent<string>).detail;
      setClientReadIds((prev) => { const next = new Set(prev); next.delete(id); return next; });
      setClientUnreadIds((prev) => new Set([...prev, id]));
    }
    function onPinChanged(e: Event) {
      const { id, pinned } = (e as CustomEvent<{ id: string; pinned: boolean }>).detail;
      const applyPin = (list: Email[]) =>
        list.map((email) => {
          if (email.id !== id) return email;
          const keywords = { ...email.keywords };
          if (pinned) { keywords["$flagged"] = true; } else { delete keywords["$flagged"]; }
          return { ...email, keywords };
        });
      setExtraUnreads(applyPin);
      setExtraReads(applyPin);
      setSearchResults(applyPin);
    }
    window.addEventListener("email-mark-unread", onMarkUnread);
    window.addEventListener("email-pin-changed", onPinChanged);
    return () => {
      window.removeEventListener("email-mark-unread", onMarkUnread);
      window.removeEventListener("email-pin-changed", onPinChanged);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Extra emails loaded via "load more"
  // -------------------------------------------------------------------------
  const [extraUnreads, setExtraUnreads] = useState<Email[]>([]);
  const [extraReads, setExtraReads] = useState<Email[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    const fresh = [...unreads, ...reads, ...pinnedEmails];
    setExtraUnreads((prev) => mergeEmailUpdates(prev, fresh));
    setExtraReads((prev) => mergeEmailUpdates(prev, fresh));
    // Server state is authoritative after a refresh; clear optimistic removals
    setArchivedIds(new Set());
  }, [unreads, reads, pinnedEmails]);

  // -------------------------------------------------------------------------
  // Drafts — local copy for optimistic deletion
  // -------------------------------------------------------------------------
  const [draftsList, setDraftsList] = useState<Email[]>(drafts);
  useEffect(() => { setDraftsList(drafts); }, [drafts]);

  // -------------------------------------------------------------------------
  // Selection state
  // -------------------------------------------------------------------------
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [selectionMode, setSelectionMode] = useState(false);
  const [archivedIds, setArchivedIds] = useState(new Set<string>());

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActive = useRef(false);
  const longPressPos = useRef({ x: 0, y: 0 });

  // -------------------------------------------------------------------------
  // Refresh state
  // -------------------------------------------------------------------------
  const [refreshPhase, setRefreshPhase] = useState<"idle" | "loading" | "success" | "fading">("idle");
  const [isPending, startTransition] = useTransition();
  const refreshTimer1 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refreshTimer2 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }

  function startLongPress(e: React.PointerEvent, emailId: string) {
    longPressPos.current = { x: e.clientX, y: e.clientY };
    longPressActive.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressActive.current = true;
      if ("vibrate" in navigator) navigator.vibrate(50);
      setSelectionMode(true);
      setSelectedIds(new Set([emailId]));
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function checkLongPressMove(e: React.PointerEvent) {
    const dx = e.clientX - longPressPos.current.x;
    const dy = e.clientY - longPressPos.current.y;
    if (Math.abs(dx) > 8 || Math.abs(dy) > 8) cancelLongPress();
  }

  // -------------------------------------------------------------------------
  // Search (inbox only)
  // -------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Email[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (view === "drafts" || view === "sent") setSearchQuery("");
  }, [view]);

  const isInSearchMode = searchQuery.trim().length > 0;

  // -------------------------------------------------------------------------
  // Merged email lists
  // -------------------------------------------------------------------------
  const allUnreads = useMemo(() => {
    const propIds = new Set(unreads.map((e) => e.id));
    return [...unreads, ...extraUnreads.filter((e) => !propIds.has(e.id))];
  }, [unreads, extraUnreads]);

  const allReads = useMemo(() => {
    const propIds = new Set(reads.map((e) => e.id));
    return [...reads, ...extraReads.filter((e) => !propIds.has(e.id))];
  }, [reads, extraReads]);

  // Display order: pinned → unread (not pinned) → read (not pinned), deduped
  const allInboxEmails = useMemo(() => {
    const pinnedIds = new Set(pinnedEmails.map((e) => e.id));
    const seenIds = new Set<string>();
    const result: Email[] = [];
    const add = (e: Email) => { if (!seenIds.has(e.id)) { seenIds.add(e.id); result.push(e); } };
    pinnedEmails.forEach(add);
    allUnreads.filter((e) => !pinnedIds.has(e.id)).forEach(add);
    allReads.filter((e) => !pinnedIds.has(e.id)).forEach(add);
    return result;
  }, [pinnedEmails, allUnreads, allReads]);

  const visibleEmails = useMemo(() => {
    const base = isInSearchMode ? searchResults : allInboxEmails;
    if (!archivedIds.size) return base;
    return base.filter((e) => !archivedIds.has(e.id));
  }, [isInSearchMode, searchResults, allInboxEmails, archivedIds]);

  // Group emails into thread summaries for the list view.
  // Search results are also grouped so every row navigates to the thread view.
  const visibleThreads = useMemo(
    () => groupIntoThreads(visibleEmails),
    [visibleEmails]
  );

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------
  const loadedUnreads = unreads.length + extraUnreads.length;
  const loadedReads = reads.length + extraReads.length;
  const hasMoreUnreads = loadedUnreads < unreadTotal;
  const hasMoreReads = loadedReads < readTotal;
  const hasMore = !isInSearchMode && (hasMoreUnreads || hasMoreReads);

  const unreadCount = useUnreadCount();
  const draftCount = draftsList.length;
  const pinnedThreadCount = isInSearchMode
    ? 0
    : visibleThreads.filter((t) => t.isPinned).length;

  // -------------------------------------------------------------------------
  // Debounced search
  // -------------------------------------------------------------------------
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setSearchResults([]); setIsSearching(false); return; }
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

  // -------------------------------------------------------------------------
  // Auto-mark as read when navigating to a thread
  // -------------------------------------------------------------------------
  useEffect(() => {
    const thread = selectedThreadId
      ? visibleThreads.find((t) => t.threadId === selectedThreadId)
      : selectedEmailId
      ? visibleThreads.find((t) => t.latestEmail.id === selectedEmailId)
      : undefined;
    if (!thread) return;
    const unreadIds = getUnreadEmailIds(
      thread.allEmails,
      clientReadIds,
      clientUnreadIds
    );
    if (unreadIds.length > 0) {
      setClientReadIds((prev) => new Set([...prev, ...unreadIds]));
      setClientUnreadIds((prev) => {
        const next = new Set(prev);
        unreadIds.forEach((id) => next.delete(id));
        return next;
      });
      dispatchUnreadCountEvent("read", unreadIds);
      bulkMarkAsRead(unreadIds);
    }
  }, [selectedThreadId, selectedEmailId]); // eslint-disable-line react-hooks/exhaustive-deps

  // -------------------------------------------------------------------------
  // Load more
  // -------------------------------------------------------------------------
  async function handleLoadMore() {
    setLoadingMore(true);
    try {
      if (hasMoreUnreads) {
        const { emails: more } = await loadMoreUnreads(inboxId, loadedUnreads);
        setExtraUnreads((prev) => [...prev, ...more]);
      } else {
        const { emails: more } = await loadMoreReads(inboxId, loadedReads);
        setExtraReads((prev) => [...prev, ...more]);
      }
    } finally {
      setLoadingMore(false);
    }
  }

  // -------------------------------------------------------------------------
  // Refresh effects
  // -------------------------------------------------------------------------

  // When server re-render finishes, transition to success then idle.
  // Timers are kept in refs so React's effect cleanup can't cancel them when
  // setRefreshPhase("success") causes a re-render and re-runs this effect.
  useEffect(() => {
    if (!isPending && refreshPhase === "loading") {
      setRefreshPhase("success");
      clearTimeout(refreshTimer1.current);
      clearTimeout(refreshTimer2.current);
      refreshTimer1.current = setTimeout(() => setRefreshPhase("fading"), 1400);
      refreshTimer2.current = setTimeout(() => setRefreshPhase("idle"), 2000);
    }
  }, [isPending, refreshPhase]);

  useEffect(() => {
    return () => {
      clearTimeout(refreshTimer1.current);
      clearTimeout(refreshTimer2.current);
    };
  }, []);

  function handleRefresh() {
    if (refreshPhase === "loading" || isPending) return;
    clearTimeout(refreshTimer1.current);
    clearTimeout(refreshTimer2.current);
    setRefreshPhase("loading");
    startTransition(() => router.refresh());
  }

  // -------------------------------------------------------------------------
  // Bulk actions
  // -------------------------------------------------------------------------
  const allSelectedPinned = useMemo(
    () => [...selectedIds].every((id) => {
      const email = visibleEmails.find((e) => e.id === id);
      return email ? isPinned(email) : false;
    }),
    [selectedIds, visibleEmails]
  );

  async function handleBulkMarkRead() {
    const selectedEmails = visibleEmails.filter((email) => selectedIds.has(email.id));
    const ids = getUnreadEmailIds(selectedEmails, clientReadIds, clientUnreadIds);
    clearSelection();
    if (ids.length === 0) return;
    setClientReadIds((prev) => new Set([...prev, ...ids]));
    setClientUnreadIds((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
    dispatchUnreadCountEvent("read", ids);
    await bulkMarkAsRead(ids);
    router.refresh();
  }

  async function handleBulkMarkUnread() {
    const selectedEmails = visibleEmails.filter((email) => selectedIds.has(email.id));
    const ids = getReadEmailIds(selectedEmails, clientReadIds, clientUnreadIds);
    clearSelection();
    if (ids.length === 0) return;
    setClientUnreadIds((prev) => new Set([...prev, ...ids]));
    setClientReadIds((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
    dispatchUnreadCountEvent("unread", ids);
    await bulkMarkAsUnread(ids);
    router.refresh();
  }

  async function handleBulkPin() {
    const ids = [...selectedIds];
    const pin = !allSelectedPinned;
    clearSelection();
    ids.forEach((id) =>
      window.dispatchEvent(new CustomEvent("email-pin-changed", { detail: { id, pinned: pin } }))
    );
    await bulkSetPin(ids, pin);
    router.refresh();
  }

  async function handleBulkMove(targetMailboxId: string) {
    const emails = visibleEmails.filter((e) => selectedIds.has(e.id));
    const ids = emails.map((e) => e.id);
    setArchivedIds((prev) => new Set([...prev, ...ids]));
    clearSelection();
    await bulkMoveToMailbox(
      emails.map((e) => ({ id: e.id, mailboxIds: e.mailboxIds })),
      targetMailboxId
    );
    router.refresh();
  }

  const actionBtnCls =
    "p-1.5 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 transition-colors shrink-0";

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="flex flex-col h-full overflow-hidden w-full">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-stone-700 dark:text-stone-300 capitalize">
            {view === "inbox" ? "Inbox" : view === "drafts" ? "Drafts" : "Sent"}
          </span>
          {view === "inbox" && (
            <UnreadCountBadge count={unreadCount} showZero className="shrink-0" />
          )}
          {view === "drafts" && (
            <UnreadCountBadge count={draftCount} showZero className="shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {view === "inbox" && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshPhase === "loading" || isPending}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-stone-500 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors disabled:opacity-60 disabled:hover:bg-transparent disabled:cursor-default"
              title="Refresh mail"
            >
              <IconRefresh spinning={refreshPhase === "loading"} />
              Refresh
            </button>
          )}
          <Link
            href="/compose"
            className="p-1.5 rounded-md text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
            title="Compose"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
            </svg>
          </Link>
        </div>
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
            onKeyDown={(e) => {
              if (e.key === "Escape" || e.key === "Enter") {
                setSearchFocused(false);
                searchInputRef.current?.blur();
              }
            }}
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

      {/* Bulk action bar */}
      {view === "inbox" && selectionMode && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800 shrink-0">
          <button onClick={clearSelection} className={actionBtnCls} title="Cancel selection">
            <IconX />
          </button>
          <button
            onClick={() => {
              const allSelected = visibleEmails.every((e) => selectedIds.has(e.id));
              setSelectedIds(allSelected ? new Set() : new Set(visibleEmails.map((e) => e.id)));
            }}
            className="text-sm font-medium text-blue-700 dark:text-blue-300 flex-1 text-left px-1.5 py-1 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors truncate"
          >
            {selectedIds.size} selected
          </button>
          <button onClick={handleBulkMarkRead} className={actionBtnCls} title="Mark as read">
            <IconCheck />
          </button>
          <button onClick={handleBulkMarkUnread} className={actionBtnCls} title="Mark as unread">
            <IconDot />
          </button>
          <button
            onClick={handleBulkPin}
            className={actionBtnCls}
            title={allSelectedPinned ? "Unpin" : "Pin"}
          >
            {allSelectedPinned ? <IconUnpin /> : <IconPin />}
          </button>
          {archiveMailboxId && (
            <button onClick={() => handleBulkMove(archiveMailboxId)} className={actionBtnCls} title="Archive">
              <IconArchive />
            </button>
          )}
          {trashMailboxId && (
            <button onClick={() => handleBulkMove(trashMailboxId)} className={actionBtnCls} title="Delete">
              <IconTrash />
            </button>
          )}
        </div>
      )}

      {/* Inbox list */}
      {view === "inbox" && (
        <div className="relative flex-1 overflow-hidden bg-stone-50 dark:bg-stone-900">

          {/* "Up to date" success pill — floats over the list after refresh */}
          {(refreshPhase === "success" || refreshPhase === "fading") && (
            <div className={[
              "absolute inset-x-0 top-3 z-20 flex justify-center pointer-events-none transition-opacity duration-500",
              refreshPhase === "fading" ? "opacity-0" : "opacity-100",
            ].join(" ")}>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-800 dark:bg-stone-100 text-stone-100 dark:text-stone-800 text-xs font-medium shadow-md">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Up to date
              </div>
            </div>
          )}

          <div className="absolute inset-0 overflow-y-auto">
          {isSearching && (
            <p className="p-4 text-sm text-stone-400 dark:text-stone-500">Searching…</p>
          )}
          {!isSearching && visibleEmails.length === 0 && (
            <p className="p-6 text-sm text-stone-400 dark:text-stone-500">
              {isInSearchMode ? "No results." : "No emails."}
            </p>
          )}
          {!isSearching &&
            visibleThreads.map((thread, idx) => {
              const { latestEmail, senders } = thread;
              const threadHref = `/thread/${thread.threadId}`;
              const isRouteSelected =
                thread.threadId === selectedThreadId ||
                thread.latestEmail.id === selectedEmailId;
              const isChecked = thread.allEmails.some((e) => selectedIds.has(e.id));
              const isUnread =
                thread.allEmails.some((email) =>
                  isEmailUnread(email, clientReadIds, clientUnreadIds)
                ) && !isRouteSelected;

              const showPinnedDivider =
                !isInSearchMode && pinnedThreadCount > 0 && idx === 0;
              const showRestDivider =
                !isInSearchMode && pinnedThreadCount > 0 && idx === pinnedThreadCount;

              // Sender display: comma-separated unique names, truncated to 3
              const senderLabel =
                senders
                  .slice(0, 3)
                  .map((s) => s.name ?? s.email.split("@")[0])
                  .join(", ") || "(no sender)";

              return (
                <div key={thread.threadId}>
                  {showPinnedDivider && (
                    <div className="px-4 py-1 text-[10px] tracking-widest text-stone-400 dark:text-stone-400 border-y border-stone-300 dark:border-stone-500">
                      {"// pinned"}
                    </div>
                  )}
                  {showRestDivider && (
                    <div className="px-4 py-1 text-[10px] tracking-widest text-stone-400 dark:text-stone-400 border-y border-stone-300 dark:border-stone-500">
                      {"// all mail"}
                    </div>
                  )}

                  {/* Thread row */}
                  <div
                    className={[
                      "group flex items-center gap-2.5 px-3 py-2.5 border-b border-stone-100 dark:border-stone-700/60 select-none transition-colors",
                      isChecked
                        ? "bg-blue-50 dark:bg-blue-950/25"
                        : isRouteSelected
                          ? "bg-stone-200 dark:bg-stone-800"
                          : "hover:bg-stone-100 dark:hover:bg-stone-900",
                    ].join(" ")}
                    onPointerDown={(e) => startLongPress(e, latestEmail.id)}
                    onPointerMove={checkLongPressMove}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                  >
                    {/* Unread / pin indicator */}
                    <div className="w-2 shrink-0 flex items-center justify-center">
                      {!selectionMode && isUnread && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>

                    {/* Avatar — morphs to checkbox on hover / in selection mode */}
                    <div
                      className="relative w-9 h-9 shrink-0 rounded-full cursor-pointer"
                      onClick={() => {
                        if (!selectionMode) setSelectionMode(true);
                        // Toggle all emails in this thread
                        const allIds = thread.allEmails.map((e) => e.id);
                        setSelectedIds((prev) => {
                          const next = new Set(prev);
                          const allChecked = allIds.every((id) => prev.has(id));
                          allIds.forEach((id) =>
                            allChecked ? next.delete(id) : next.add(id)
                          );
                          return next;
                        });
                      }}
                    >
                      <div className={[
                        "absolute inset-0 transition-opacity duration-150",
                        selectionMode ? "opacity-0" : "opacity-100 group-hover:opacity-0",
                      ].join(" ")}>
                        <SenderAvatar from={latestEmail.from} size={36} />
                      </div>
                      <div className={[
                        "absolute inset-0 rounded-full flex items-center justify-center transition-opacity duration-150 text-white",
                        selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                        isChecked
                          ? "bg-blue-500"
                          : "border-2 border-stone-300 dark:border-stone-500 bg-stone-100 dark:bg-stone-800",
                      ].join(" ")}>
                        {isChecked && <IconCheck />}
                      </div>
                    </div>

                    {/* Text content */}
                    <Link
                      href={threadHref}
                      onClick={(e) => {
                        if (selectionMode) {
                          e.preventDefault();
                          const allIds = thread.allEmails.map((em) => em.id);
                          setSelectedIds((prev) => {
                            const next = new Set(prev);
                            const allChecked = allIds.every((id) => prev.has(id));
                            allIds.forEach((id) =>
                              allChecked ? next.delete(id) : next.add(id)
                            );
                            return next;
                          });
                          return;
                        }
                        if (longPressActive.current) {
                          e.preventDefault();
                          longPressActive.current = false;
                        }
                      }}
                      className="flex flex-col gap-0.5 flex-1 min-w-0"
                    >
                      {/* Senders + date */}
                      <div className="flex items-baseline justify-between gap-1.5">
                        <span className={[
                          "text-sm truncate",
                          isUnread
                            ? "font-semibold text-stone-900 dark:text-stone-100"
                            : "text-stone-600 dark:text-stone-300",
                        ].join(" ")}>
                          {senderLabel}
                        </span>
                        <span className="shrink-0 text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
                          {formatDate(latestEmail.receivedAt)}
                        </span>
                      </div>
                      {/* Subject + thread count */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={[
                          "text-xs truncate flex-1",
                          isUnread
                            ? "font-semibold text-stone-800 dark:text-stone-200"
                            : "text-stone-500 dark:text-stone-400",
                        ].join(" ")}>
                          {latestEmail.subject || "(no subject)"}
                        </span>
                        {thread.count > 1 && (
                          <span className="shrink-0 text-[10px] tabular-nums px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400">
                            {thread.count}
                          </span>
                        )}
                      </div>
                      {/* Preview */}
                      {latestEmail.preview && (
                        <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                          {latestEmail.preview}
                        </p>
                      )}
                    </Link>

                    {/* Quick-pin button — shown on hover or when already pinned */}
                    {!selectionMode && (
                      <button
                        title={thread.isPinned ? "Unpin" : "Pin"}
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const ids = thread.allEmails.map((em) => em.id);
                          const next = !thread.isPinned;
                          ids.forEach((id) =>
                            window.dispatchEvent(
                              new CustomEvent("email-pin-changed", { detail: { id, pinned: next } })
                            )
                          );
                          await bulkSetPin(ids, next);
                          router.refresh();
                        }}
                        className={[
                          "shrink-0 p-1 rounded transition-all",
                          thread.isPinned
                            ? "opacity-100 text-amber-400 hover:text-amber-500"
                            : "opacity-0 group-hover:opacity-100 text-stone-300 dark:text-stone-600 hover:text-amber-400",
                        ].join(" ")}
                      >
                        <IconPin />
                      </button>
                    )}
                  </div>
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
                : hasMoreUnreads
                  ? `Load more unread (${loadedUnreads} of ${unreadTotal})`
                  : `Load more (${loadedUnreads + loadedReads} of ${unreadTotal + readTotal})`}
            </button>
          )}
          </div>
        </div>
      )}

      {/* Drafts list */}
      {view === "drafts" && (
        <div className="overflow-y-auto flex-1 bg-stone-50 dark:bg-stone-900">
          {draftsList.length === 0 ? (
            <p className="p-6 text-sm text-stone-400 dark:text-stone-500">No drafts.</p>
          ) : (
            draftsList.map((draft) => (
              <div
                key={draft.id}
                className="group relative flex items-center border-b border-stone-100 dark:border-stone-700/60 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
              >
                <Link
                  href={`/compose?draftId=${draft.id}`}
                  className="flex flex-col gap-0.5 px-4 py-2.5 flex-1 min-w-0"
                >
                  <div className="flex items-center gap-2 pr-6">
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
                <button
                  title="Delete draft"
                  onClick={async (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDraftsList((prev) => prev.filter((d) => d.id !== draft.id));
                    await deleteDraftAction(draft.id);
                    router.refresh();
                  }}
                  className="absolute right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded text-stone-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                >
                  <IconTrash />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Sent list */}
      {view === "sent" && (
        <div className="overflow-y-auto flex-1 bg-stone-50 dark:bg-stone-900">
          {sentEmails.length === 0 ? (
            <p className="p-6 text-sm text-stone-400 dark:text-stone-500">No sent emails.</p>
          ) : (
            sentEmails.map((email) => (
              <Link
                key={email.id}
                href={`/email/${email.id}?from=sent`}
                className={[
                  "flex flex-col gap-0.5 px-4 py-2.5 border-b border-stone-100 dark:border-stone-700/60 transition-colors",
                  email.id === selectedEmailId
                    ? "bg-stone-200 dark:bg-stone-800"
                    : "hover:bg-stone-100 dark:hover:bg-stone-900",
                ].join(" ")}
              >
                <div className="flex items-baseline gap-2">
                  <span className="flex-1 text-sm truncate text-stone-600 dark:text-stone-400">
                    {email.to?.map((a) => a.name ?? a.email).join(", ") || "(no recipient)"}
                  </span>
                  <span className="shrink-0 text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
                    {formatDate(email.receivedAt)}
                  </span>
                </div>
                <div className="text-xs truncate text-stone-500 dark:text-stone-400">
                  {email.subject || "(no subject)"}
                </div>
                {email.preview && (
                  <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                    {email.preview}
                  </p>
                )}
              </Link>
            ))
          )}
        </div>
      )}

      {/* Unread badge (hidden, kept for potential use) */}
      <span className="sr-only">{unreadCount} unread</span>
    </div>
  );
}
