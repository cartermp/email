export const MAILBOX_MOVE_EVENT = "mailbox-move-optimistic";

export interface MailboxMoveNotice {
  emailIds: string[];
  sourceMailboxId: string;
  targetMailboxId: string;
  phase: "move" | "revert";
}

export function applyMailboxMoveNotice(
  current: ReadonlySet<string>,
  notice: Pick<MailboxMoveNotice, "emailIds" | "phase">,
): Set<string> {
  const next = new Set(current);
  for (const emailId of notice.emailIds) {
    if (notice.phase === "move") next.add(emailId);
    else next.delete(emailId);
  }
  return next;
}

/**
 * Drop completed optimistic markers once refreshed source data no longer
 * contains those messages. Markers still present in source data remain active
 * so an unrelated partial refresh cannot make a moved row reappear.
 */
export function reconcileMailboxMoveIds(
  current: ReadonlySet<string>,
  sourceEmailIds: ReadonlySet<string>,
): Set<string> {
  const next = new Set<string>();
  for (const emailId of current) {
    if (sourceEmailIds.has(emailId)) next.add(emailId);
  }
  return next;
}

export function notifyMailboxMove(notice: MailboxMoveNotice): void {
  window.dispatchEvent(
    new CustomEvent<MailboxMoveNotice>(MAILBOX_MOVE_EVENT, { detail: notice }),
  );
}
