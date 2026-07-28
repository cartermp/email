import type { Mailbox } from "./types";

export const MAIL_VIEWS = [
  "inbox",
  "drafts",
  "sent",
  "archive",
  "trash",
  "spam",
] as const;

export type MailView = (typeof MAIL_VIEWS)[number];
export type MailboxIds = Partial<Record<MailView, string>>;
export type ResolvedMailboxes = Partial<Record<MailView, Mailbox>>;

export const MAIL_VIEW_PATHS: Record<MailView, string> = {
  inbox: "/",
  drafts: "/drafts",
  sent: "/sent",
  archive: "/archive",
  trash: "/trash",
  spam: "/spam",
};

export const MAIL_VIEW_LABELS: Record<MailView, string> = {
  inbox: "Inbox",
  drafts: "Drafts",
  sent: "Sent",
  archive: "Archive",
  trash: "Trash",
  spam: "Spam",
};

/**
 * Resolve Fastmail's system mailboxes once. Spam is the only role whose
 * server-side name varies, so its fallback lives here instead of at every
 * call site.
 */
export function resolveMailboxes(mailboxes: Mailbox[]): ResolvedMailboxes {
  const byRole = (role: string) =>
    mailboxes.find((mailbox) => mailbox.role === role);

  return {
    inbox: byRole("inbox"),
    drafts: byRole("drafts"),
    sent: byRole("sent"),
    archive: byRole("archive"),
    trash: byRole("trash"),
    spam:
      byRole("junk") ??
      mailboxes.find((mailbox) =>
        ["spam", "junk"].includes(mailbox.name.toLowerCase()),
      ),
  };
}

export function getMailboxIds(
  mailboxes: ResolvedMailboxes,
): MailboxIds {
  return Object.fromEntries(
    MAIL_VIEWS.flatMap((view) => {
      const id = mailboxes[view]?.id;
      return id ? [[view, id]] : [];
    }),
  );
}

export function getMailView(
  pathname: string,
  from?: string | null,
): MailView {
  if (pathname.startsWith("/drafts")) return "drafts";
  if (pathname.startsWith("/sent") || from === "sent") return "sent";
  if (pathname.startsWith("/archive") || from === "archive") return "archive";
  if (pathname.startsWith("/trash") || from === "trash") return "trash";
  if (pathname.startsWith("/spam") || from === "spam") return "spam";
  return "inbox";
}

export function isMailViewActive(
  view: MailView,
  pathname: string,
  from?: string | null,
): boolean {
  if (view === "inbox") {
    return (
      (pathname === "/" ||
        pathname.startsWith("/email/") ||
        pathname.startsWith("/thread/") ||
        pathname.startsWith("/attachment/")) &&
      getMailView(pathname, from) === "inbox"
    );
  }
  return getMailView(pathname, from) === view;
}

export function getMailboxIdForView(
  mailboxIds: MailboxIds,
  view: MailView,
): string | undefined {
  return mailboxIds[view];
}

export function isThreadMailView(view: MailView): boolean {
  return !["drafts", "sent"].includes(view);
}

export function getMailboxViewForEmail(
  emailMailboxIds: Record<string, boolean>,
  mailboxIds: MailboxIds,
): MailView | undefined {
  return MAIL_VIEWS.find((view) => {
    const id = mailboxIds[view];
    return !!id && !!emailMailboxIds[id];
  });
}
