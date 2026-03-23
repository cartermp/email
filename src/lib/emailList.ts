import { Email, EmailAddress } from "./types";

// ---------------------------------------------------------------------------
// Thread grouping
// ---------------------------------------------------------------------------

export interface ThreadSummary {
  threadId: string;
  /** The most recently received email in the thread. */
  latestEmail: Email;
  /** All emails we have for this thread, in the order they appeared in the source list. */
  allEmails: Email[];
  count: number;
  isUnread: boolean;
  isPinned: boolean;
  /** Unique senders across all thread emails, most-recent-first. */
  senders: EmailAddress[];
}

/**
 * Group a flat email list into per-thread summaries.
 *
 * Thread order in the result matches the position of each thread's
 * first occurrence in the input, so caller-controlled sort order
 * (pinned → unread → read) is preserved.
 */
export function groupIntoThreads(emails: Email[]): ThreadSummary[] {
  const order: string[] = [];
  const groups = new Map<string, Email[]>();

  for (const email of emails) {
    if (!groups.has(email.threadId)) {
      groups.set(email.threadId, []);
      order.push(email.threadId);
    }
    groups.get(email.threadId)!.push(email);
  }

  return order.map((threadId) => {
    const group = groups.get(threadId)!;
    const latestEmail = group.reduce((a, b) =>
      a.receivedAt > b.receivedAt ? a : b
    );

    const seenAddrs = new Set<string>();
    const senders: EmailAddress[] = [];
    for (const e of [...group].sort((a, b) =>
      b.receivedAt.localeCompare(a.receivedAt)
    )) {
      for (const addr of e.from ?? []) {
        if (!seenAddrs.has(addr.email)) {
          seenAddrs.add(addr.email);
          senders.push(addr);
        }
      }
    }

    return {
      threadId,
      latestEmail,
      allEmails: group,
      count: group.length,
      isUnread: group.some((e) => !e.keywords?.["$seen"]),
      isPinned: group.some((e) => !!e.keywords?.["$flagged"]),
      senders,
    };
  });
}

/** An email is pinned if it has the $flagged keyword. */
export function isPinned(email: Email): boolean {
  return !!email.keywords?.["$flagged"];
}

/**
 * Stable sort: pinned emails first, original relative order preserved within
 * each group.
 */
export function sortEmailsByPin(emails: Email[]): Email[] {
  return [...emails].sort((a, b) => {
    const ap = isPinned(a) ? 0 : 1;
    const bp = isPinned(b) ? 0 : 1;
    return ap - bp;
  });
}

/**
 * Merge fresh server data into a local email list.
 *
 * Emails present in `fresh` are replaced with their updated version.
 * Emails only in `prev` (e.g. loaded via "load more") are kept as-is.
 * New emails that appear in `fresh` but not in `prev` are NOT added — the
 * caller controls when to add new emails (load more, etc.).
 */
export function mergeEmailUpdates(prev: Email[], fresh: Email[]): Email[] {
  const freshById = new Map(fresh.map((e) => [e.id, e]));
  return prev.map((e) => freshById.get(e.id) ?? e);
}
