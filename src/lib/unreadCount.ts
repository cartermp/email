import { Email } from "@/lib/types";

export const unreadCountEvents = {
  markRead: "emails-mark-read",
  markUnread: "emails-mark-unread",
} as const;

type EmailWithSeenState = Pick<Email, "id" | "keywords">;

export function getUniqueIds(ids: string[]): string[] {
  return [...new Set(ids.filter(Boolean))];
}

export function isEmailUnread(
  email: EmailWithSeenState,
  clientReadIds: ReadonlySet<string> = new Set(),
  clientUnreadIds: ReadonlySet<string> = new Set()
): boolean {
  return (
    (clientUnreadIds.has(email.id) || !email.keywords?.["$seen"]) &&
    !clientReadIds.has(email.id)
  );
}

export function getUnreadEmailIds(
  emails: EmailWithSeenState[],
  clientReadIds: ReadonlySet<string> = new Set(),
  clientUnreadIds: ReadonlySet<string> = new Set()
): string[] {
  return getUniqueIds(
    emails
      .filter((email) => isEmailUnread(email, clientReadIds, clientUnreadIds))
      .map((email) => email.id)
  );
}

export function getReadEmailIds(
  emails: EmailWithSeenState[],
  clientReadIds: ReadonlySet<string> = new Set(),
  clientUnreadIds: ReadonlySet<string> = new Set()
): string[] {
  return getUniqueIds(
    emails
      .filter((email) => !isEmailUnread(email, clientReadIds, clientUnreadIds))
      .map((email) => email.id)
  );
}

export function applyUnreadCountChange(
  currentCount: number,
  change: "read" | "unread",
  ids: string[]
): number {
  const amount = getUniqueIds(ids).length;
  if (amount === 0) return currentCount;
  if (change === "read") return Math.max(0, currentCount - amount);
  return currentCount + amount;
}

export function dispatchUnreadCountEvent(
  change: "read" | "unread",
  ids: string[]
): void {
  if (typeof window === "undefined") return;

  const uniqueIds = getUniqueIds(ids);
  if (uniqueIds.length === 0) return;

  window.dispatchEvent(
    new CustomEvent(
      change === "read" ? unreadCountEvents.markRead : unreadCountEvents.markUnread,
      { detail: { ids: uniqueIds } }
    )
  );
}
