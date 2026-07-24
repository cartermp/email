"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import SenderAvatar from "@/components/SenderAvatar";
import EmptyState from "@/components/EmptyState";
import MailIcon from "@/components/MailIcon";
import { MailRowsLoadingSkeleton } from "@/components/LoadingSkeletons";
import { useToast } from "@/components/ToastProvider";
import { useUnreadCount } from "@/components/UnreadCountProvider";
import UnreadCountBadge from "@/components/UnreadCountBadge";
import ThreadCountBadge from "@/components/ThreadCountBadge";
import { useConfirmNavigation } from "@/components/NavigationGuardProvider";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Email } from "@/lib/types";
import {
  isPinned,
  mergeEmailUpdates,
  groupIntoThreads,
  type ThreadSummary,
} from "@/lib/emailList";
import {
  nextConversationIndex,
  shouldCaptureConversationPointer,
} from "@/lib/mailInteraction";
import { formatDate } from "@/lib/format";
import { loadMoreUnreads, loadMoreReads, searchEmailsAction, bulkMarkAsRead, bulkMarkAsUnread, bulkSetPin, bulkMoveToMailbox, checkInboxForNewMail } from "@/app/(inbox)/actions";
import { deleteDraftAction } from "@/app/compose/actions";
import { dispatchUnreadCountEvent, getReadEmailIds, getUnreadEmailIds, isEmailUnread } from "@/lib/unreadCount";
import {
  MAIL_AUTO_SYNC_INTERVAL_MS,
  canRunImmediateMailSync,
  getInboxSnapshot,
  getMailAutoSyncDelay,
  inboxSnapshotKey,
  type InboxSnapshot,
} from "@/lib/mailAutoSync";

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
  spamUnreads?: Email[];
  spamUnreadTotal?: number;
  spamReads?: Email[];
  spamReadTotal?: number;
  spamMailboxId?: string;
  deferredContent?: ReactNode;
  threadHrefPrefix?: string;
  autoSyncIntervalMs?: number;
  autoSyncCheck?: (inboxId: string) => Promise<InboxSnapshot>;
}

type View = "inbox" | "drafts" | "sent" | "spam";

export interface DeferredMailPanelData {
  drafts: Email[];
  sentEmails: Email[];
  pinnedEmails: Email[];
  spamUnreads: Email[];
  spamUnreadTotal: number;
  spamReads: Email[];
  spamReadTotal: number;
}

const DeferredMailPanelContext = createContext<
  ((data: DeferredMailPanelData) => void) | null
>(null);

export function DeferredMailPanelSync({
  data,
}: {
  data: DeferredMailPanelData;
}) {
  const sync = useContext(DeferredMailPanelContext);
  useEffect(() => {
    sync?.(data);
  }, [data, sync]);
  return null;
}

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3.5 h-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function IconDot() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
      <circle cx="12" cy="12" r="5" />
    </svg>
  );
}

function IconPin() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5" aria-hidden="true">
      <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0z" />
    </svg>
  );
}

function IconUnpin() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0zM3 3l18 18" />
    </svg>
  );
}

function IconArchive() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
    </svg>
  );
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-4 h-4" aria-hidden="true">
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
      aria-hidden="true"
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
  drafts: initialDrafts = [],
  sentEmails: initialSentEmails = [],
  pinnedEmails = [],
  archiveMailboxId,
  trashMailboxId,
  spamUnreads: initialSpamUnreads = [],
  spamUnreadTotal: initialSpamUnreadTotal = 0,
  spamReads: initialSpamReads = [],
  spamReadTotal: initialSpamReadTotal = 0,
  spamMailboxId,
  deferredContent,
  threadHrefPrefix = "/thread",
  autoSyncIntervalMs = MAIL_AUTO_SYNC_INTERVAL_MS,
  autoSyncCheck = checkInboxForNewMail,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const confirmNavigation = useConfirmNavigation();
  const showToast = useToast();
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
    : pathname.startsWith("/spam") || searchParams.get("from") === "spam"
    ? "spam"
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
  const [draftsList, setDraftsList] = useState<Email[]>(initialDrafts);
  const [pinnedList, setPinnedList] = useState(pinnedEmails);

  const [deferredPending, setDeferredPending] = useState(!!deferredContent);
  const [sentList, setSentList] = useState(initialSentEmails);
  const [spamData, setSpamData] = useState({
    unreads: initialSpamUnreads,
    unreadTotal: initialSpamUnreadTotal,
    reads: initialSpamReads,
    readTotal: initialSpamReadTotal,
  });

  const syncDeferredData = useCallback((data: DeferredMailPanelData) => {
    setDraftsList(data.drafts);
    setSentList(data.sentEmails);
    setPinnedList(data.pinnedEmails);
    setSpamData({
      unreads: data.spamUnreads,
      unreadTotal: data.spamUnreadTotal,
      reads: data.spamReads,
      readTotal: data.spamReadTotal,
    });
    setDeferredPending(false);
  }, []);

  const currentUnreads = view === "spam" ? spamData.unreads : unreads;
  const currentUnreadTotal =
    view === "spam" ? spamData.unreadTotal : unreadTotal;
  const currentReads = view === "spam" ? spamData.reads : reads;
  const currentReadTotal = view === "spam" ? spamData.readTotal : readTotal;
  const currentMailboxId = view === "spam" ? spamMailboxId ?? "" : inboxId;

  useEffect(() => {
    setExtraUnreads([]);
    setExtraReads([]);
  }, [view]);

  useEffect(() => {
    const fresh = [...currentUnreads, ...currentReads, ...pinnedList];
    setExtraUnreads((prev) => mergeEmailUpdates(prev, fresh));
    setExtraReads((prev) => mergeEmailUpdates(prev, fresh));
    // Server state is authoritative after a refresh; clear optimistic removals
    setArchivedIds(new Set());
  }, [currentUnreads, currentReads, pinnedList]);

  // -------------------------------------------------------------------------
  // Selection state
  // -------------------------------------------------------------------------
  const [selectedIds, setSelectedIds] = useState(new Set<string>());
  const [selectionMode, setSelectionMode] = useState(false);
  const [archivedIds, setArchivedIds] = useState(new Set<string>());
  const [keyboardThreadId, setKeyboardThreadId] = useState<string | null>(null);
  const [shortcutHelpOpen, setShortcutHelpOpen] = useState(false);
  const shortcutHelpCloseRef = useRef<HTMLButtonElement>(null);
  const rowRefs = useRef(new Map<string, HTMLDivElement>());

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressActive = useRef(false);
  const longPressPos = useRef({ x: 0, y: 0 });
  const [swipeOffsets, setSwipeOffsets] = useState<Record<string, number>>({});
  const swipeOffsetRef = useRef<Record<string, number>>({});
  const swipeGesture = useRef<{
    threadId: string;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);
  const suppressLinkClick = useRef<string | null>(null);

  // -------------------------------------------------------------------------
  // Refresh state
  // -------------------------------------------------------------------------
  const [refreshPhase, setRefreshPhase] = useState<"idle" | "loading" | "success" | "fading">("idle");
  const [isPending, startTransition] = useTransition();
  const refreshTimer1 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refreshTimer2 = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const transitionPendingRef = useRef(isPending);
  transitionPendingRef.current = isPending;
  const initialInboxSnapshot = useMemo(
    () => getInboxSnapshot(unreads, unreadTotal, reads, readTotal),
    [unreads, unreadTotal, reads, readTotal],
  );
  const inboxSnapshotKeyValue = inboxSnapshotKey(initialInboxSnapshot);
  const knownInboxSnapshotRef = useRef(inboxSnapshotKeyValue);
  const [syncAnnouncement, setSyncAnnouncement] = useState("");

  useEffect(() => {
    knownInboxSnapshotRef.current = inboxSnapshotKeyValue;
  }, [inboxSnapshotKeyValue]);

  useEffect(() => {
    if (!inboxId || autoSyncIntervalMs <= 0) return;

    let stopped = false;
    let inFlight = false;
    let consecutiveFailures = 0;
    let lastCheckAt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const canSync = () =>
      document.visibilityState === "visible" && navigator.onLine !== false;

    const clearScheduledCheck = () => {
      clearTimeout(timer);
      timer = undefined;
    };

    const scheduleNextCheck = () => {
      clearScheduledCheck();
      if (stopped || !canSync()) return;
      timer = setTimeout(
        () => void checkForUpdates(false),
        getMailAutoSyncDelay(consecutiveFailures, autoSyncIntervalMs),
      );
    };

    const checkForUpdates = async (immediate: boolean) => {
      if (
        stopped ||
        inFlight ||
        transitionPendingRef.current ||
        !canSync()
      ) {
        scheduleNextCheck();
        return;
      }

      const now = Date.now();
      if (immediate && !canRunImmediateMailSync(lastCheckAt, now)) {
        scheduleNextCheck();
        return;
      }

      inFlight = true;
      lastCheckAt = now;
      try {
        const snapshot = await autoSyncCheck(inboxId);
        if (stopped || !canSync()) return;

        consecutiveFailures = 0;
        const nextSnapshotKey = inboxSnapshotKey(snapshot);
        if (nextSnapshotKey !== knownInboxSnapshotRef.current) {
          knownInboxSnapshotRef.current = nextSnapshotKey;
          setSyncAnnouncement(`Inbox updated at ${new Date().toLocaleTimeString()}`);
          startTransition(() => router.refresh());
        }
      } catch {
        consecutiveFailures += 1;
      } finally {
        inFlight = false;
        scheduleNextCheck();
      }
    };

    const resumeSync = () => {
      if (!canSync()) {
        clearScheduledCheck();
        return;
      }
      void checkForUpdates(true);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        resumeSync();
      } else {
        clearScheduledCheck();
      }
    };

    scheduleNextCheck();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", resumeSync);
    window.addEventListener("online", resumeSync);
    window.addEventListener("offline", clearScheduledCheck);

    return () => {
      stopped = true;
      clearScheduledCheck();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", resumeSync);
      window.removeEventListener("online", resumeSync);
      window.removeEventListener("offline", clearScheduledCheck);
    };
  }, [autoSyncCheck, autoSyncIntervalMs, inboxId, router, startTransition]);

  function applySelection(next: Set<string>) {
    setSelectedIds(next);
    setSelectionMode(next.size > 0);
  }

  function toggleSelection(emailIds: string[]) {
    const next = new Set(selectedIds);
    const allChecked = emailIds.every((id) => next.has(id));
    emailIds.forEach((id) =>
      allChecked ? next.delete(id) : next.add(id)
    );
    applySelection(next);
  }

  function clearSelection() {
    applySelection(new Set());
  }

  function startLongPress(e: React.PointerEvent, emailIds: string[]) {
    longPressPos.current = { x: e.clientX, y: e.clientY };
    longPressActive.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressActive.current = true;
      if ("vibrate" in navigator) navigator.vibrate(50);
      applySelection(new Set(emailIds));
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
    if (Math.abs(dx) > 12 || Math.abs(dy) > 12) cancelLongPress();
  }

  function startRowPointer(
    event: React.PointerEvent,
    threadId: string,
    emailIds: string[],
  ) {
    // Pointer capture is only needed for touch/pen swipe gestures. Capturing a
    // mouse pointer can retarget the completed click to this wrapper instead
    // of the nested conversation link, leaving desktop rows unopenable.
    if (!shouldCaptureConversationPointer(event.pointerType)) {
      cancelLongPress();
      swipeGesture.current = null;
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    swipeGesture.current = {
      threadId,
      startX: event.clientX,
      startY: event.clientY,
      active: false,
    };
    startLongPress(event, emailIds);
  }

  function moveRowPointer(event: React.PointerEvent, threadId: string) {
    const gesture = swipeGesture.current;
    if (!gesture || gesture.threadId !== threadId) return;
    const dx = event.clientX - gesture.startX;
    const dy = event.clientY - gesture.startY;

    if (!gesture.active && Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      gesture.active = true;
      cancelLongPress();
    }
    if (!gesture.active) {
      checkLongPressMove(event);
      return;
    }

    const canArchive = view === "inbox" && !!archiveMailboxId;
    const bounded = Math.max(canArchive ? -88 : -24, Math.min(88, dx));
    swipeOffsetRef.current[threadId] = bounded;
    setSwipeOffsets((current) => ({ ...current, [threadId]: bounded }));
  }

  function finishRowPointer(thread: ThreadSummary, isUnread: boolean) {
    cancelLongPress();
    const gesture = swipeGesture.current;
    swipeGesture.current = null;
    const offset = swipeOffsetRef.current[thread.threadId] ?? 0;
    swipeOffsetRef.current[thread.threadId] = 0;
    setSwipeOffsets((current) => ({ ...current, [thread.threadId]: 0 }));

    if (!gesture?.active) return;
    suppressLinkClick.current = thread.threadId;
    if ("vibrate" in navigator && Math.abs(offset) >= 58) navigator.vibrate(12);

    if (offset >= 58) {
      void toggleThreadReadState(thread, isUnread);
    } else if (offset <= -58 && view === "inbox" && archiveMailboxId) {
      moveThread(thread, archiveMailboxId);
    }
  }

  function cancelRowPointer(threadId: string) {
    cancelLongPress();
    swipeGesture.current = null;
    swipeOffsetRef.current[threadId] = 0;
    setSwipeOffsets((current) => ({ ...current, [threadId]: 0 }));
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
    if (view !== "inbox") setSearchQuery("");
  }, [view]);

  const isInSearchMode = searchQuery.trim().length > 0;

  // -------------------------------------------------------------------------
  // Merged email lists
  // -------------------------------------------------------------------------
  const allUnreads = useMemo(() => {
    const propIds = new Set(currentUnreads.map((e) => e.id));
    return [...currentUnreads, ...extraUnreads.filter((e) => !propIds.has(e.id))];
  }, [currentUnreads, extraUnreads]);

  const allReads = useMemo(() => {
    const propIds = new Set(currentReads.map((e) => e.id));
    return [...currentReads, ...extraReads.filter((e) => !propIds.has(e.id))];
  }, [currentReads, extraReads]);

  // Display order: pinned → unread (not pinned) → read (not pinned), deduped
  const allInboxEmails = useMemo(() => {
    const pinnedIds = new Set(pinnedList.map((e) => e.id));
    const seenIds = new Set<string>();
    const result: Email[] = [];
    const add = (e: Email) => { if (!seenIds.has(e.id)) { seenIds.add(e.id); result.push(e); } };
    if (view === "inbox") {
      pinnedList.forEach(add);
    }
    allUnreads.filter((e) => !pinnedIds.has(e.id)).forEach(add);
    allReads.filter((e) => !pinnedIds.has(e.id)).forEach(add);
    return result;
  }, [pinnedList, allUnreads, allReads, view]);

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
  const loadedUnreads = currentUnreads.length + extraUnreads.length;
  const loadedReads = currentReads.length + extraReads.length;
  const hasMoreUnreads = loadedUnreads < currentUnreadTotal;
  const hasMoreReads = loadedReads < currentReadTotal;
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
        const { emails: more } = await loadMoreUnreads(currentMailboxId, loadedUnreads);
        setExtraUnreads((prev) => [...prev, ...more]);
      } else {
        const { emails: more } = await loadMoreReads(currentMailboxId, loadedReads);
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
    try {
      await bulkMarkAsRead(ids);
      showToast({
        message: ids.length === 1 ? "Marked as read" : `${ids.length} messages marked as read`,
      });
      router.refresh();
    } catch {
      showToast({ message: "Could not mark those messages as read.", tone: "error" });
    }
  }

  async function handleBulkMarkUnread() {
    const selectedEmails = visibleEmails.filter((email) => selectedIds.has(email.id));
    const ids = getReadEmailIds(selectedEmails, clientReadIds, clientUnreadIds);
    clearSelection();
    if (ids.length === 0) return;
    setClientUnreadIds((prev) => new Set([...prev, ...ids]));
    setClientReadIds((prev) => { const n = new Set(prev); ids.forEach((id) => n.delete(id)); return n; });
    dispatchUnreadCountEvent("unread", ids);
    try {
      await bulkMarkAsUnread(ids);
      showToast({
        message: ids.length === 1 ? "Marked as unread" : `${ids.length} messages marked as unread`,
      });
      router.refresh();
    } catch {
      showToast({ message: "Could not mark those messages as unread.", tone: "error" });
    }
  }

  async function handleBulkPin() {
    const ids = [...selectedIds];
    const pin = !allSelectedPinned;
    clearSelection();
    ids.forEach((id) =>
      window.dispatchEvent(new CustomEvent("email-pin-changed", { detail: { id, pinned: pin } }))
    );
    try {
      await bulkSetPin(ids, pin);
      showToast({
        message: pin
          ? ids.length === 1 ? "Pinned" : `${ids.length} messages pinned`
          : ids.length === 1 ? "Unpinned" : `${ids.length} messages unpinned`,
      });
      router.refresh();
    } catch {
      showToast({ message: "Could not update pinning.", tone: "error" });
    }
  }

  async function moveMessages(emails: Email[], targetMailboxId: string) {
    const ids = emails.map((e) => e.id);
    const sourceMailboxId = currentMailboxId;
    setArchivedIds((prev) => new Set([...prev, ...ids]));
    clearSelection();
    const movePromise = bulkMoveToMailbox(
      emails.map((e) => ({ id: e.id, mailboxIds: e.mailboxIds })),
      targetMailboxId
    );
    showToast({
      message:
        targetMailboxId === trashMailboxId
          ? ids.length === 1 ? "Moved to trash" : `${ids.length} messages moved to trash`
          : ids.length === 1 ? "Archived" : `${ids.length} messages archived`,
      actionLabel: "Undo",
      onAction: async () => {
        await movePromise;
        setArchivedIds((previous) => {
          const next = new Set(previous);
          ids.forEach((id) => next.delete(id));
          return next;
        });
        await bulkMoveToMailbox(
          emails.map((email) => ({
            id: email.id,
            mailboxIds: { [targetMailboxId]: true },
          })),
          sourceMailboxId,
        );
        router.refresh();
      },
    });
    try {
      await movePromise;
      router.refresh();
    } catch {
      setArchivedIds((previous) => {
        const next = new Set(previous);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      showToast({ message: "Could not move those messages.", tone: "error" });
    }
  }

  async function handleBulkMove(targetMailboxId: string) {
    const emails = visibleEmails.filter((e) => selectedIds.has(e.id));
    await moveMessages(emails, targetMailboxId);
  }

  async function handleBulkNotSpam() {
    const emails = visibleEmails.filter((e) => selectedIds.has(e.id));
    const ids = emails.map((e) => e.id);
    setArchivedIds((prev) => new Set([...prev, ...ids]));
    clearSelection();
    try {
      await bulkMoveToMailbox(
        emails.map((e) => ({ id: e.id, mailboxIds: e.mailboxIds })),
        inboxId
      );
      showToast({
        message: ids.length === 1 ? "Moved to inbox" : `${ids.length} messages moved to inbox`,
      });
      router.refresh();
    } catch {
      setArchivedIds((previous) => {
        const next = new Set(previous);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      showToast({ message: "Could not move those messages.", tone: "error" });
    }
  }

  async function toggleThreadReadState(
    thread: ThreadSummary,
    currentlyUnread: boolean,
  ) {
    const ids = currentlyUnread
      ? getUnreadEmailIds(thread.allEmails, clientReadIds, clientUnreadIds)
      : getReadEmailIds(thread.allEmails, clientReadIds, clientUnreadIds);
    if (ids.length === 0) return;

    if (currentlyUnread) {
      setClientReadIds((previous) => new Set([...previous, ...ids]));
      setClientUnreadIds((previous) => {
        const next = new Set(previous);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      if (view === "inbox") dispatchUnreadCountEvent("read", ids);
      try {
        await bulkMarkAsRead(ids);
        showToast({ message: "Marked as read" });
      } catch {
        showToast({ message: "Could not mark that thread as read.", tone: "error" });
      }
    } else {
      setClientUnreadIds((previous) => new Set([...previous, ...ids]));
      setClientReadIds((previous) => {
        const next = new Set(previous);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      if (view === "inbox") dispatchUnreadCountEvent("unread", ids);
      try {
        await bulkMarkAsUnread(ids);
        showToast({ message: "Marked as unread" });
      } catch {
        showToast({ message: "Could not mark that thread as unread.", tone: "error" });
      }
    }
    router.refresh();
  }

  function moveThread(thread: ThreadSummary, targetMailboxId: string) {
    void moveMessages(thread.allEmails, targetMailboxId);
  }

  useEffect(() => {
    if (!keyboardThreadId) return;
    const behavior = window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches
      ? "auto"
      : "smooth";
    rowRefs.current
      .get(keyboardThreadId)
      ?.scrollIntoView({ block: "nearest", behavior });
  }, [keyboardThreadId]);

  useEffect(() => {
    if (!shortcutHelpOpen) return;
    const previousFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    shortcutHelpCloseRef.current?.focus();
    return () => {
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [shortcutHelpOpen]);

  useEffect(() => {
    function onKeyboardShortcut(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const isEditing =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.tagName === "SELECT" ||
        target?.isContentEditable;

      if (event.key === "Escape" && shortcutHelpOpen) {
        event.preventDefault();
        setShortcutHelpOpen(false);
        return;
      }
      if (event.key === "Escape" && selectionMode) {
        event.preventDefault();
        clearSelection();
        return;
      }
      if (isEditing || event.metaKey || event.ctrlKey || event.altKey) return;

      if (event.key === "/" && view === "inbox") {
        event.preventDefault();
        searchInputRef.current?.focus();
        return;
      }
      if (event.key.toLowerCase() === "c") {
        event.preventDefault();
        if (!confirmNavigation()) return;
        router.push("/compose");
        return;
      }
      if (event.key === "?") {
        event.preventDefault();
        setShortcutHelpOpen((open) => !open);
        return;
      }
      if ((view !== "inbox" && view !== "spam") || visibleThreads.length === 0) {
        return;
      }

      const routeIndex = visibleThreads.findIndex(
        (thread) =>
          thread.threadId === selectedThreadId ||
          thread.latestEmail.id === selectedEmailId,
      );
      const currentIndex = keyboardThreadId
        ? visibleThreads.findIndex((thread) => thread.threadId === keyboardThreadId)
        : routeIndex;

      if (event.key.toLowerCase() === "j" || event.key.toLowerCase() === "k") {
        event.preventDefault();
        const direction = event.key.toLowerCase() === "j" ? 1 : -1;
        const nextIndex = nextConversationIndex(
          currentIndex,
          visibleThreads.length,
          direction,
        );
        setKeyboardThreadId(visibleThreads[nextIndex].threadId);
        return;
      }

      const activeThread =
        visibleThreads.find((thread) => thread.threadId === keyboardThreadId) ??
        (routeIndex >= 0 ? visibleThreads[routeIndex] : undefined);
      if (!activeThread) return;

      if (event.key === "Enter") {
        event.preventDefault();
        if (!confirmNavigation()) return;
        router.push(
          view === "spam"
            ? `${threadHrefPrefix}/${activeThread.threadId}?from=spam`
            : `${threadHrefPrefix}/${activeThread.threadId}`,
        );
      } else if (
        event.key.toLowerCase() === "e" &&
        view === "inbox" &&
        archiveMailboxId
      ) {
        event.preventDefault();
        moveThread(activeThread, archiveMailboxId);
      } else if (event.key.toLowerCase() === "u") {
        event.preventDefault();
        const unread = activeThread.allEmails.some((email) =>
          isEmailUnread(email, clientReadIds, clientUnreadIds),
        );
        void toggleThreadReadState(activeThread, unread);
      } else if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        if (!confirmNavigation()) return;
        router.push(`/compose?mode=reply&id=${activeThread.latestEmail.id}`);
      }
    }

    window.addEventListener("keydown", onKeyboardShortcut);
    return () => window.removeEventListener("keydown", onKeyboardShortcut);
    // These function declarations intentionally use the current render state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    archiveMailboxId,
    clientReadIds,
    clientUnreadIds,
    confirmNavigation,
    keyboardThreadId,
    router,
    selectedEmailId,
    selectedThreadId,
    selectionMode,
    shortcutHelpOpen,
    threadHrefPrefix,
    view,
    visibleThreads,
  ]);

  const keyboardThreadAnnouncement = keyboardThreadId
    ? visibleThreads.find((thread) => thread.threadId === keyboardThreadId)
        ?.latestEmail.subject || "(no subject)"
    : "";

  const actionBtnCls =
    "flex h-10 w-10 items-center justify-center rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 transition-colors shrink-0";

  const selectionActions = (
    <>
      <button onClick={clearSelection} className={actionBtnCls} title="Cancel selection" aria-label="Cancel selection">
        <IconX />
      </button>
      <button
        onClick={() => {
          const allSelected = visibleEmails.every((e) => selectedIds.has(e.id));
          applySelection(
            allSelected
              ? new Set()
              : new Set(visibleEmails.map((e) => e.id)),
          );
        }}
        className="flex-1 truncate rounded-md px-1.5 py-1 text-left text-sm font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/60"
      >
        {selectedIds.size} selected
      </button>
      {view === "spam" && (
        <button
          onClick={handleBulkNotSpam}
          className="mr-1 shrink-0 rounded-md px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition-colors hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/60"
          title="Not Spam"
        >
          Not Spam
        </button>
      )}
      <button onClick={handleBulkMarkRead} className={actionBtnCls} title="Mark as read" aria-label="Mark selected messages as read">
        <IconCheck />
      </button>
      <button onClick={handleBulkMarkUnread} className={actionBtnCls} title="Mark as unread" aria-label="Mark selected messages as unread">
        <IconDot />
      </button>
      {view === "inbox" && (
        <button
          onClick={handleBulkPin}
          className={actionBtnCls}
          title={allSelectedPinned ? "Unpin" : "Pin"}
          aria-label={allSelectedPinned ? "Unpin selected messages" : "Pin selected messages"}
        >
          {allSelectedPinned ? <IconUnpin /> : <IconPin />}
        </button>
      )}
      {view === "inbox" && archiveMailboxId && (
        <button onClick={() => handleBulkMove(archiveMailboxId)} className={actionBtnCls} title="Archive" aria-label="Archive selected messages">
          <IconArchive />
        </button>
      )}
      {trashMailboxId && (
        <button onClick={() => handleBulkMove(trashMailboxId)} className={actionBtnCls} title="Delete" aria-label="Move selected messages to trash">
          <IconTrash />
        </button>
      )}
    </>
  );

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <DeferredMailPanelContext.Provider value={syncDeferredData}>
      {deferredContent}
      <div className="flex flex-col h-full overflow-hidden w-full">
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {keyboardThreadAnnouncement
            ? `Selected conversation: ${keyboardThreadAnnouncement}`
            : ""}
        </div>
        <div className="sr-only" role="status">
          {syncAnnouncement}
        </div>

      {/* Header */}
      <div className="flex min-h-[52px] items-center justify-between border-b border-stone-200 px-4 dark:border-stone-700 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-stone-800 dark:text-stone-200 capitalize">
            {view === "inbox" ? "Inbox" : view === "drafts" ? "Drafts" : view === "sent" ? "Sent" : "Spam"}
          </span>
          {view === "inbox" && (
            <UnreadCountBadge count={unreadCount} showZero className="shrink-0" />
          )}
          {view === "drafts" && (
            <UnreadCountBadge count={draftCount} showZero className="shrink-0" />
          )}
          {view === "spam" && (
            <UnreadCountBadge count={currentUnreads.length} showZero className="shrink-0" />
          )}
        </div>
        <div className="flex items-center gap-1">
          {(view === "inbox" || view === "spam") && (
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshPhase === "loading" || isPending}
              className="flex min-h-10 items-center gap-1.5 rounded-md px-2.5 text-xs text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-700 disabled:cursor-default disabled:opacity-60 disabled:hover:bg-transparent dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
              title="Refresh mail"
              aria-label="Refresh mail"
            >
              <IconRefresh spinning={refreshPhase === "loading"} />
              <span className="hidden xl:inline">Refresh</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setShortcutHelpOpen(true)}
            className="hidden h-10 w-10 items-center justify-center rounded-md text-sm text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-200 lg:flex"
            title="Keyboard shortcuts"
            aria-label="Keyboard shortcuts"
          >
            ?
          </button>
          <Link
            href="/compose"
            className="flex h-10 w-10 items-center justify-center rounded-md text-stone-400 transition-colors hover:bg-stone-100 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-200 lg:hidden"
            title="Compose"
            aria-label="Compose"
          >
            <MailIcon name="compose" className="h-[18px] w-[18px]" />
          </Link>
        </div>
      </div>

      {/* Search (inbox only) */}
      {view === "inbox" && (
        <div
          className={[
            "relative flex min-h-[57px] shrink-0 items-center border-b py-2",
            selectionMode
              ? "border-blue-200 bg-blue-50 px-2 dark:border-blue-800 dark:bg-blue-950/40"
              : "border-stone-200 bg-stone-50 px-3 dark:border-stone-700 dark:bg-stone-900",
          ].join(" ")}
        >
          {selectionMode ? (
            <div className="flex h-10 min-w-0 flex-1 items-center gap-0.5">
              {selectionActions}
            </div>
          ) : (
            <>
          <MailIcon
            name="search"
            className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400 dark:text-stone-500"
          />
          <input
            ref={searchInputRef}
            type="search"
            placeholder="Search all mail…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                if (searchQuery) {
                  setSearchQuery("");
                } else {
                  setSearchFocused(false);
                  searchInputRef.current?.blur();
                }
              } else if (e.key === "Enter") {
                setSearchFocused(false);
                searchInputRef.current?.blur();
              }
            }}
            className="min-h-10 w-full rounded-lg border border-transparent bg-stone-100 py-2 pl-9 pr-16 text-sm text-stone-900 outline-none placeholder:text-stone-400 focus:border-stone-300 dark:bg-stone-800 dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:border-stone-600"
            aria-label="Search all mail"
          />
          {isInSearchMode && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                searchInputRef.current?.focus();
              }}
              className="absolute right-5 top-1/2 flex h-8 items-center rounded-md px-2 text-[11px] text-stone-400 transition-colors -translate-y-1/2 hover:bg-stone-200 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-stone-700 dark:hover:text-stone-200"
            >
              Clear
            </button>
          )}
          {searchFocused && !isInSearchMode && (
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
            </>
          )}
        </div>
      )}

      {shortcutHelpOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4">
          <button
            type="button"
            className="absolute inset-0"
            tabIndex={-1}
            onClick={() => setShortcutHelpOpen(false)}
            aria-label="Close keyboard shortcuts"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="shortcut-help-title"
            className="relative w-full max-w-sm rounded-xl border border-stone-200 bg-white p-5 shadow-xl dark:border-stone-700 dark:bg-stone-900"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              event.preventDefault();
              shortcutHelpCloseRef.current?.focus();
            }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2
                id="shortcut-help-title"
                className="text-sm font-semibold text-stone-800 dark:text-stone-200"
              >
                Keyboard shortcuts
              </h2>
              <button
                ref={shortcutHelpCloseRef}
                type="button"
                onClick={() => setShortcutHelpOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                aria-label="Close"
              >
                <MailIcon name="x" className="h-4 w-4" />
              </button>
            </div>
            <dl className="grid grid-cols-[1fr_auto] gap-x-5 gap-y-3 text-sm">
              {[
                ["Search", "/"],
                ["Next / previous thread", "J / K"],
                ["Open thread", "Enter"],
                ["Archive", "E"],
                ["Mark read / unread", "U"],
                ["Reply", "R"],
                ["Compose", "C"],
              ].map(([label, shortcut]) => (
                <div key={label} className="contents">
                  <dt className="text-stone-600 dark:text-stone-300">{label}</dt>
                  <dd>
                    <kbd className="rounded border border-stone-200 bg-stone-50 px-1.5 py-0.5 font-mono text-xs text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
                      {shortcut}
                    </kbd>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {/* Bulk action bar */}
      {view === "spam" && selectionMode && (
        <div className="flex items-center gap-0.5 px-2 py-1.5 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-800 shrink-0">
          {selectionActions}
        </div>
      )}

      {/* Inbox list */}
      {(view === "inbox" || view === "spam") && (
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
          {view === "spam" && deferredPending && (
            <MailRowsLoadingSkeleton />
          )}
          {(!deferredPending || view !== "spam") && isSearching && (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-stone-400 dark:text-stone-500">
              <IconRefresh spinning />
              Searching…
            </div>
          )}
          {(!deferredPending || view !== "spam") &&
            !isSearching &&
            visibleEmails.length === 0 && (
            <EmptyState
              compact
              icon={isInSearchMode ? "search" : view === "spam" ? "spam" : "inbox"}
              title={
                isInSearchMode
                  ? `No matches for “${searchQuery.trim()}”`
                  : view === "spam"
                    ? "No spam"
                    : "You’re all caught up"
              }
              description={
                isInSearchMode
                  ? "Try a broader phrase or remove one of the search filters."
                  : view === "spam"
                    ? "Messages identified as spam will appear here."
                    : "New messages will appear here as they arrive."
              }
              action={
                !isInSearchMode && view === "inbox"
                  ? { href: "/compose", label: "Compose a message" }
                  : undefined
              }
            />
          )}
          {(!deferredPending || view !== "spam") &&
            !isSearching &&
            isInSearchMode &&
            visibleThreads.length > 0 && (
              <div className="border-b border-stone-200 px-4 py-2 text-[11px] text-stone-400 dark:border-stone-800 dark:text-stone-500">
                {visibleThreads.length} {visibleThreads.length === 1 ? "thread" : "threads"}
              </div>
            )}
          {(!deferredPending || view !== "spam") &&
            !isSearching &&
            visibleThreads.map((thread, idx) => {
              const { latestEmail, senders } = thread;
              const threadHref =
                view === "spam"
                  ? `${threadHrefPrefix}/${thread.threadId}?from=spam`
                  : `${threadHrefPrefix}/${thread.threadId}`;
              const isRouteSelected =
                thread.threadId === selectedThreadId ||
                thread.latestEmail.id === selectedEmailId;
              const isChecked = thread.allEmails.some((e) => selectedIds.has(e.id));
              const isUnread =
                thread.allEmails.some((email) =>
                  isEmailUnread(email, clientReadIds, clientUnreadIds)
                ) && !isRouteSelected;
              const swipeOffset = swipeOffsets[thread.threadId] ?? 0;
              const isSwipeActionVisible = swipeOffset !== 0;

              const showPinnedDivider =
                !isInSearchMode && view === "inbox" && pinnedThreadCount > 0 && idx === 0;
              const showRestDivider =
                !isInSearchMode && view === "inbox" && pinnedThreadCount > 0 && idx === pinnedThreadCount;

              // Sender display: comma-separated unique names, truncated to 3
              const senderLabel =
                senders
                  .slice(0, 3)
                  .map((s) => s.name ?? s.email.split("@")[0])
                  .join(", ") || "(no sender)";

              return (
                <div key={thread.threadId}>
                  {showPinnedDivider && (
                    <div className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400 border-y border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-950">
                      Pinned
                    </div>
                  )}
                  {showRestDivider && (
                    <div className="px-4 py-1.5 text-[10px] font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400 border-y border-stone-200 dark:border-stone-800 bg-stone-100/70 dark:bg-stone-950">
                      All mail
                    </div>
                  )}

                  {/* Thread row */}
                  <div
                    ref={(node) => {
                      if (node) rowRefs.current.set(thread.threadId, node);
                      else rowRefs.current.delete(thread.threadId);
                    }}
                    className="relative overflow-hidden border-b border-stone-100 dark:border-stone-800"
                  >
                    <div
                      className={[
                        "pointer-events-none absolute inset-0 flex items-stretch justify-between text-xs font-semibold text-white transition-opacity duration-75",
                        isSwipeActionVisible ? "opacity-100" : "opacity-0",
                      ].join(" ")}
                      data-swipe-actions={thread.threadId}
                      aria-hidden="true"
                    >
                      <div
                        className={[
                          "flex w-24 items-center gap-1.5 pl-4 transition-colors",
                          isUnread ? "bg-blue-600" : "bg-stone-600",
                        ].join(" ")}
                      >
                        <MailIcon
                          name={isUnread ? "check" : "unread"}
                          className="h-4 w-4"
                        />
                        {isUnread ? "Read" : "Unread"}
                      </div>
                      {view === "inbox" && archiveMailboxId && (
                        <div className="flex w-24 items-center justify-end gap-1.5 bg-stone-700 pr-4">
                          Archive
                          <MailIcon name="archive" className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    <div
                      className={[
                        "mail-list-row group relative flex items-center gap-2.5 px-3 py-2.5 select-none touch-pan-y transition-colors",
                        selectionMode ? "" : "cursor-pointer",
                        isChecked
                          ? "bg-blue-50 dark:bg-blue-950/25"
                          : keyboardThreadId === thread.threadId
                            ? "bg-blue-50/70 ring-1 ring-inset ring-blue-200 dark:bg-blue-950/20 dark:ring-blue-900"
                          : isRouteSelected
                            ? "bg-stone-200 dark:bg-stone-800"
                            : "bg-stone-50 hover:bg-stone-100 dark:bg-stone-900 dark:hover:bg-stone-950",
                      ].join(" ")}
                      style={{
                        transform: `translateX(${swipeOffset}px)`,
                        transition:
                          swipeOffset === 0
                            ? "transform 160ms ease-out"
                            : "none",
                      }}
                      onPointerDown={(event) =>
                        startRowPointer(
                          event,
                          thread.threadId,
                          thread.allEmails.map((email) => email.id),
                        )
                      }
                      onPointerMove={(event) =>
                        moveRowPointer(event, thread.threadId)
                      }
                      onPointerUp={() => finishRowPointer(thread, isUnread)}
                      onPointerCancel={() => cancelRowPointer(thread.threadId)}
                      onClick={(event) => {
                        if (longPressActive.current) {
                          longPressActive.current = false;
                          return;
                        }
                        if (
                          suppressLinkClick.current === thread.threadId
                        ) {
                          suppressLinkClick.current = null;
                          return;
                        }
                        if (selectionMode) return;

                        const target = event.target;
                        if (
                          target instanceof Element &&
                          target.closest(
                            "a, button, [data-thread-selection-control]",
                          )
                        ) {
                          return;
                        }

                        if (!confirmNavigation()) return;
                        setKeyboardThreadId(thread.threadId);
                        router.push(threadHref);
                      }}
                    >
                    {/* Unread / pin indicator */}
                    <div className="w-2 shrink-0 flex items-center justify-center">
                      {!selectionMode && isUnread && (
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                      )}
                    </div>

                    {/* Avatar — morphs to checkbox on hover / in selection mode */}
                    <button
                      type="button"
                      className="relative w-9 h-9 shrink-0 rounded-full cursor-pointer"
                      data-thread-selection-control
                      aria-pressed={isChecked}
                      aria-label={`${
                        isChecked ? "Deselect" : "Select"
                      } conversation from ${senderLabel}`}
                      onClick={() => {
                        toggleSelection(
                          thread.allEmails.map((email) => email.id),
                        );
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
                    </button>

                    {/* Text content */}
                    <Link
                      href={threadHref}
                      aria-current={isRouteSelected ? "page" : undefined}
                      onClick={(e) => {
                        if (suppressLinkClick.current === thread.threadId) {
                          e.preventDefault();
                          suppressLinkClick.current = null;
                          return;
                        }
                        if (selectionMode) {
                          e.preventDefault();
                          toggleSelection(
                            thread.allEmails.map((email) => email.id),
                          );
                          return;
                        }
                        if (longPressActive.current) {
                          e.preventDefault();
                          longPressActive.current = false;
                        }
                        setKeyboardThreadId(thread.threadId);
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
                        <div className="shrink-0 flex items-center gap-1.5">
                          <ThreadCountBadge count={thread.count} />
                          <span className="text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
                            {formatDate(latestEmail.receivedAt)}
                          </span>
                        </div>
                      </div>
                      {/* Subject */}
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className={[
                          "text-xs truncate flex-1",
                          isUnread
                            ? "font-semibold text-stone-800 dark:text-stone-200"
                            : "text-stone-500 dark:text-stone-400",
                        ].join(" ")}>
                          {latestEmail.subject || "(no subject)"}
                        </span>
                      </div>
                      {/* Preview */}
                      {latestEmail.preview && (
                        <p className="mail-list-preview text-xs text-stone-400 dark:text-stone-500 truncate">
                          {latestEmail.preview}
                        </p>
                      )}
                    </Link>

                    {/* Quiet quick actions, visible on hover/focus. */}
                    {!selectionMode && (
                      <div className="flex shrink-0 items-center gap-0.5">
                        <div className="hidden items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 lg:flex">
                          {view === "inbox" && archiveMailboxId && (
                            <button
                              type="button"
                              title="Archive"
                              aria-label="Archive thread"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                moveThread(thread, archiveMailboxId);
                              }}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                            >
                              <MailIcon name="archive" className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            type="button"
                            title={isUnread ? "Mark as read" : "Mark as unread"}
                            aria-label={isUnread ? "Mark thread as read" : "Mark thread as unread"}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              void toggleThreadReadState(thread, isUnread);
                            }}
                            className="flex h-8 w-8 items-center justify-center rounded-md text-stone-400 hover:bg-stone-200 hover:text-stone-700 dark:text-stone-500 dark:hover:bg-stone-800 dark:hover:text-stone-200"
                          >
                            <MailIcon
                              name={isUnread ? "check" : "unread"}
                              className="h-4 w-4"
                            />
                          </button>
                        </div>
                        <button
                          type="button"
                          title={thread.isPinned ? "Unpin" : "Pin"}
                          aria-label={thread.isPinned ? "Unpin thread" : "Pin thread"}
                          onClick={async (event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            const ids = thread.allEmails.map((email) => email.id);
                            const next = !thread.isPinned;
                            ids.forEach((id) =>
                              window.dispatchEvent(
                                new CustomEvent("email-pin-changed", { detail: { id, pinned: next } })
                              )
                            );
                            try {
                              await bulkSetPin(ids, next);
                              showToast({ message: next ? "Pinned" : "Unpinned" });
                              router.refresh();
                            } catch {
                              showToast({ message: "Could not update pinning.", tone: "error" });
                            }
                          }}
                          className={[
                            "flex h-8 w-8 items-center justify-center rounded-md transition-all",
                            thread.isPinned
                              ? "text-amber-500 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                              : "text-stone-300 opacity-0 hover:bg-stone-200 hover:text-amber-500 group-hover:opacity-100 group-focus-within:opacity-100 dark:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-amber-400",
                          ].join(" ")}
                        >
                          <IconPin />
                        </button>
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              );
            })}

          {(!deferredPending || view !== "spam") && hasMore && (
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
          {deferredPending ? (
            <MailRowsLoadingSkeleton />
          ) : draftsList.length === 0 ? (
            <EmptyState
              compact
              icon="drafts"
              title="No drafts"
              description="Messages you save for later will appear here."
              action={{ href: "/compose", label: "Compose a message" }}
            />
          ) : (
            draftsList.map((draft) => (
              <div
                key={draft.id}
                className="group relative flex items-center border-b border-stone-100 dark:border-stone-700/60 hover:bg-stone-100 dark:hover:bg-stone-900 transition-colors"
              >
                <Link
                  href={`/compose?draftId=${draft.id}`}
                  className="mail-list-row flex flex-col gap-0.5 px-4 py-2.5 flex-1 min-w-0"
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
          {deferredPending ? (
            <MailRowsLoadingSkeleton />
          ) : sentList.length === 0 ? (
            <EmptyState
              compact
              icon="sent"
              title="Nothing sent yet"
              description="Messages you send will appear here."
              action={{ href: "/compose", label: "Compose a message" }}
            />
          ) : (
            sentList.map((email) => (
              <Link
                key={email.id}
                href={`/email/${email.id}?from=sent`}
                className={[
                  "mail-list-row flex flex-col gap-0.5 px-4 py-2.5 border-b border-stone-100 dark:border-stone-700/60 transition-colors",
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
                  <p className="mail-list-preview text-xs text-stone-400 dark:text-stone-500 truncate">
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
    </DeferredMailPanelContext.Provider>
  );
}
