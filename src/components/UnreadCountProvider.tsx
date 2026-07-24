"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { applyUnreadCountChange, unreadCountEvents } from "@/lib/unreadCount";

export interface MailboxCounts {
  inbox: number;
  drafts: number;
  spam: number;
}

interface MailboxCountContextValue {
  counts: MailboxCounts;
  syncCounts: (counts: MailboxCounts) => void;
}

const EMPTY_COUNTS: MailboxCounts = { inbox: 0, drafts: 0, spam: 0 };
const MailboxCountContext = createContext<MailboxCountContextValue>({
  counts: EMPTY_COUNTS,
  syncCounts: () => undefined,
});

interface Props {
  initialCounts?: MailboxCounts;
  children: React.ReactNode;
}

export default function UnreadCountProvider({
  initialCounts = EMPTY_COUNTS,
  children,
}: Props) {
  const [counts, setCounts] = useState(initialCounts);

  useEffect(() => {
    setCounts(initialCounts);
  }, [initialCounts]);

  useEffect(() => {
    function onMarkRead(event: Event) {
      const detail = (event as CustomEvent<{ ids?: string[] }>).detail;
      setCounts((current) => ({
        ...current,
        inbox: applyUnreadCountChange(
          current.inbox,
          "read",
          detail?.ids ?? [],
        ),
      }));
    }

    function onMarkUnread(event: Event) {
      const detail = (event as CustomEvent<{ ids?: string[] }>).detail;
      setCounts((current) => ({
        ...current,
        inbox: applyUnreadCountChange(
          current.inbox,
          "unread",
          detail?.ids ?? [],
        ),
      }));
    }

    window.addEventListener(unreadCountEvents.markRead, onMarkRead);
    window.addEventListener(unreadCountEvents.markUnread, onMarkUnread);

    return () => {
      window.removeEventListener(unreadCountEvents.markRead, onMarkRead);
      window.removeEventListener(unreadCountEvents.markUnread, onMarkUnread);
    };
  }, []);

  const syncCounts = useCallback((nextCounts: MailboxCounts) => {
    setCounts(nextCounts);
  }, []);
  const value = useMemo(
    () => ({ counts, syncCounts }),
    [counts, syncCounts],
  );

  return (
    <MailboxCountContext.Provider value={value}>
      {children}
    </MailboxCountContext.Provider>
  );
}

export function useUnreadCount(): number {
  return useContext(MailboxCountContext).counts.inbox;
}

export function useMailboxCounts(): MailboxCounts {
  return useContext(MailboxCountContext).counts;
}

export function MailboxCountSync({ counts }: { counts: MailboxCounts }) {
  const { syncCounts } = useContext(MailboxCountContext);

  useEffect(() => {
    syncCounts(counts);
  }, [counts, syncCounts]);

  return null;
}
