"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import SenderAvatar from "@/components/SenderAvatar";
import { usePathname, useRouter } from "next/navigation";
import { Email } from "@/lib/types";
import { isPinned, mergeEmailUpdates } from "@/lib/emailList";
import { formatAddressList, formatDate } from "@/lib/format";
import { markEmailAsRead } from "@/app/(inbox)/email/[id]/actions";
import { loadMoreUnreads, loadMoreReads, searchEmailsAction, bulkMarkAsRead, bulkMarkAsUnread, bulkSetPin, bulkMoveToMailbox } from "@/app/(inbox)/actions";

interface Props {
  unreads: Email[];
  unreadTotal: number;
  reads: Email[];
  readTotal: number;
  inboxId: string;
  drafts?: Email[];
  pinnedEmails?: Email[];
  archiveMailboxId?: string;
  trashMailboxId?: string;
}

type View = "inbox" | "drafts";

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
  pinnedEmails = [],
  archiveMailboxId,
  trashMailboxId,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const selectedId = pathname.startsWith("/email/")
    ? pathname.slice("/email/".length)
    : undefined;

  const view: View = pathname.startsWith("/drafts") ? "drafts" : "inbox";

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
  }, [unreads, reads, pinnedEmails]); // eslint-disable-line react-hooks/exhaustive-deps

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
  // Pull-to-refresh
  // -------------------------------------------------------------------------
  const PTR_POCKET = 56;
  const PTR_TRIGGER = 48;

  const [pullY, setPullY] = useState(0);
  const [activePull, setActivePull] = useState(false);
  const [refreshPhase, setRefreshPhase] = useState<"idle" | "loading" | "success" | "fading">("idle");
  const [isPending, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement>(null);
  const ptrActive = useRef(false);
  const ptrStartY = useRef(0);
  const ptrCurrentY = useRef(0);
  const ptrTriggerRef = useRef<() => void>(() => {});

  function toggleSelection(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

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
    if (view === "drafts") setSearchQuery("");
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

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------
  const loadedUnreads = unreads.length + extraUnreads.length;
  const loadedReads = reads.length + extraReads.length;
  const hasMoreUnreads = loadedUnreads < unreadTotal;
  const hasMoreReads = loadedReads < readTotal;
  const hasMore = !isInSearchMode && (hasMoreUnreads || hasMoreReads);

  const unreadCount = unreadTotal;
  const pinnedCount = isInSearchMode ? 0 : pinnedEmails.length;

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
  // Auto-mark as read when navigating to an email
  // -------------------------------------------------------------------------
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
  // PTR effects
  // -------------------------------------------------------------------------

  // Keep trigger callback current without stale closures in the touch handler
  useEffect(() => {
    ptrTriggerRef.current = () => {
      setPullY(PTR_POCKET);
      setActivePull(false);
      setRefreshPhase("loading");
      startTransition(() => router.refresh());
    };
  });

  // When server re-render finishes, transition to success then idle
  useEffect(() => {
    if (!isPending && refreshPhase === "loading") {
      setPullY(0);
      setRefreshPhase("success");
      const t1 = setTimeout(() => setRefreshPhase("fading"), 1400);
      const t2 = setTimeout(() => setRefreshPhase("idle"), 2000);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isPending, refreshPhase]);

  // Non-passive touch listeners so we can call preventDefault during pull
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      if (el!.scrollTop === 0 && e.touches.length === 1) {
        ptrStartY.current = e.touches[0].clientY;
      }
    }

    function onTouchMove(e: TouchEvent) {
      const dy = e.touches[0].clientY - ptrStartY.current;
      if (el!.scrollTop === 0 && dy > 4) {
        e.preventDefault();
        ptrActive.current = true;
        const resistance = Math.min(dy * 0.45, PTR_POCKET + 12);
        ptrCurrentY.current = resistance;
        setPullY(resistance);
        setActivePull(true);
      }
    }

    function onTouchEnd() {
      if (!ptrActive.current) return;
      ptrActive.current = false;
      setActivePull(false);
      if (ptrCurrentY.current >= PTR_TRIGGER) {
        ptrTriggerRef.current();
      } else {
        setPullY(0);
      }
      ptrCurrentY.current = 0;
    }

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    el.addEventListener("touchcancel", onTouchEnd);
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
      el.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []); // mount-only: handlers use refs for all mutable state

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
    const ids = [...selectedIds];
    setClientReadIds((prev) => new Set([...prev, ...ids]));
    setClientUnreadIds((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
    clearSelection();
    await bulkMarkAsRead(ids);
    router.refresh();
  }

  async function handleBulkMarkUnread() {
    const ids = [...selectedIds];
    setClientUnreadIds((prev) => new Set([...prev, ...ids]));
    setClientReadIds((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
    clearSelection();
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

          {/* PTR pocket — only rendered when actively pulling or refreshing */}
          {(pullY > 0 || refreshPhase === "loading") && (
          <div
            className="absolute inset-x-0 top-0 flex items-center justify-center"
            style={{ height: PTR_POCKET }}
          >
            {refreshPhase === "loading" ? (
              <svg className="w-5 h-5 text-stone-400 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                className="w-5 h-5 text-stone-300 dark:text-stone-600"
                style={{ transform: `rotate(${Math.min(pullY / PTR_TRIGGER, 1) * 180}deg)` }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            )}
          </div>
          )}

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

          {/* Scrollable list — translates down to reveal PTR pocket */}
          <div
            ref={listRef}
            className={[
              "absolute inset-0 overflow-y-auto",
              !activePull ? "transition-transform duration-300 ease-out" : "",
            ].join(" ")}
            style={pullY > 0 ? { transform: `translateY(${pullY}px)` } : undefined}
          >
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
              const isRouteSelected = email.id === selectedId;
              const isChecked = selectedIds.has(email.id);
              const pinned = isPinned(email);
              const isUnread =
                (clientUnreadIds.has(email.id) || !email.keywords?.["$seen"]) &&
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

                  {/* Row */}
                  <div
                    className={[
                      "group flex items-center gap-2.5 px-3 py-2.5 border-b border-stone-100 dark:border-stone-700/60 select-none transition-colors",
                      isChecked
                        ? "bg-blue-50 dark:bg-blue-950/25"
                        : isRouteSelected
                          ? "bg-stone-200 dark:bg-stone-800"
                          : "hover:bg-stone-100 dark:hover:bg-stone-900",
                    ].join(" ")}
                    onPointerDown={(e) => startLongPress(e, email.id)}
                    onPointerMove={checkLongPressMove}
                    onPointerUp={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                  >
                    {/* Unread / pin dot — fixed-width gutter so avatar never shifts */}
                    <div className="w-2 shrink-0 flex items-center justify-center">
                      {!selectionMode && isUnread && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                      {!selectionMode && pinned && !isUnread && (
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-2.5 h-2.5 text-amber-400">
                          <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z" />
                        </svg>
                      )}
                    </div>

                    {/* Avatar — morphs to checkbox on hover (desktop) or in selection mode */}
                    <div
                      className="relative w-9 h-9 shrink-0 rounded-full cursor-pointer"
                      onClick={() => {
                        if (!selectionMode) setSelectionMode(true);
                        toggleSelection(email.id);
                      }}
                    >
                      {/* Avatar */}
                      <div className={[
                        "absolute inset-0 transition-opacity duration-150",
                        selectionMode ? "opacity-0" : "opacity-100 group-hover:opacity-0",
                      ].join(" ")}>
                        <SenderAvatar from={email.from} size={36} />
                      </div>
                      {/* Checkbox circle */}
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
                      href={`/email/${email.id}`}
                      onClick={(e) => {
                        if (selectionMode) {
                          e.preventDefault();
                          toggleSelection(email.id);
                          return;
                        }
                        if (longPressActive.current) {
                          e.preventDefault();
                          longPressActive.current = false;
                        }
                      }}
                      className="flex flex-col gap-0.5 flex-1 min-w-0"
                    >
                      {/* Sender + date */}
                      <div className="flex items-baseline justify-between gap-1.5">
                        <span className={[
                          "text-sm truncate",
                          isUnread
                            ? "font-semibold text-stone-900 dark:text-stone-100"
                            : "text-stone-600 dark:text-stone-400",
                        ].join(" ")}>
                          {formatAddressList(email.from) || "(no sender)"}
                        </span>
                        <span className="shrink-0 text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
                          {formatDate(email.receivedAt)}
                        </span>
                      </div>
                      {/* Subject */}
                      <div className="flex items-center gap-1 min-w-0">
                        <span className={[
                          "text-xs truncate flex-1",
                          isUnread
                            ? "font-semibold text-stone-800 dark:text-stone-200"
                            : "text-stone-500 dark:text-stone-400",
                        ].join(" ")}>
                          {email.subject || "(no subject)"}
                        </span>
                        {pinned && !selectionMode && (
                          <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-amber-400 shrink-0">
                            <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z" />
                          </svg>
                        )}
                      </div>
                      {/* Preview */}
                      {email.preview && (
                        <p className="text-xs text-stone-400 dark:text-stone-500 truncate">
                          {email.preview}
                        </p>
                      )}
                    </Link>
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

      {/* Unread badge (hidden, kept for potential use) */}
      <span className="sr-only">{unreadCount} unread</span>
    </div>
  );
}
