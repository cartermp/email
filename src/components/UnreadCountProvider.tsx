"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { applyUnreadCountChange, unreadCountEvents } from "@/lib/unreadCount";

const UnreadCountContext = createContext(0);

interface Props {
  initialCount: number;
  children: React.ReactNode;
}

export default function UnreadCountProvider({ initialCount, children }: Props) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    setCount(initialCount);
  }, [initialCount]);

  useEffect(() => {
    function onMarkRead(event: Event) {
      const detail = (event as CustomEvent<{ ids?: string[] }>).detail;
      setCount((current) => applyUnreadCountChange(current, "read", detail?.ids ?? []));
    }

    function onMarkUnread(event: Event) {
      const detail = (event as CustomEvent<{ ids?: string[] }>).detail;
      setCount((current) => applyUnreadCountChange(current, "unread", detail?.ids ?? []));
    }

    window.addEventListener(unreadCountEvents.markRead, onMarkRead);
    window.addEventListener(unreadCountEvents.markUnread, onMarkUnread);

    return () => {
      window.removeEventListener(unreadCountEvents.markRead, onMarkRead);
      window.removeEventListener(unreadCountEvents.markUnread, onMarkUnread);
    };
  }, []);

  const value = useMemo(() => count, [count]);

  return (
    <UnreadCountContext.Provider value={value}>
      {children}
    </UnreadCountContext.Provider>
  );
}

export function useUnreadCount(): number {
  return useContext(UnreadCountContext);
}
