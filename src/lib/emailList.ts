import { Email } from "./types";

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
