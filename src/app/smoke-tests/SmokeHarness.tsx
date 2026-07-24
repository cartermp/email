"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import AttachmentList from "@/components/AttachmentList";
import Composer from "@/components/Composer";
import EmailListPanel from "@/components/EmailListPanel";
import { useUnreadCount } from "@/components/UnreadCountProvider";
import {
  DEFAULT_FAVICON_HREF,
  getBrowserTabTitle,
  getUnreadFaviconDataUrl,
} from "@/lib/browserTabIndicator";
import { prepareHtml } from "@/lib/emailHtml";
import { dispatchUnreadCountEvent } from "@/lib/unreadCount";
import type { Email, EmailBodyPart } from "@/lib/types";

export type SmokePanel =
  | "inbox"
  | "reply"
  | "attachments"
  | "target"
  | "auto-sync"
  | "dark-rendering"
  | "tab-indicator";

const fixtureEmails: Email[] = [
  {
    id: "email-maya",
    messageId: ["message-maya@example.test"],
    threadId: "thread-maya",
    mailboxIds: { "mailbox-inbox": true },
    subject: "Quarterly plan",
    from: [{ name: "GitHub", email: "notifications@github.com" }],
    to: [{ name: "Phillip Carter", email: "phillip@example.test" }],
    cc: null,
    replyTo: null,
    inReplyTo: null,
    receivedAt: "2026-07-24T16:30:00.000Z",
    preview: "The revised plan is ready for review.",
    bodyValues: {},
    htmlBody: [],
    textBody: [],
    attachments: [],
    hasAttachment: false,
    keywords: {},
    size: 1840,
  },
  {
    id: "email-release",
    messageId: ["message-release@example.test"],
    threadId: "thread-release",
    mailboxIds: { "mailbox-inbox": true },
    subject: "Release notes",
    from: [{ name: "Noah Williams", email: "updates@missing-brand.com" }],
    to: [{ name: "Phillip Carter", email: "phillip@example.test" }],
    cc: null,
    replyTo: null,
    inReplyTo: null,
    receivedAt: "2026-07-24T15:00:00.000Z",
    preview: "A short summary of what shipped today.",
    bodyValues: {},
    htmlBody: [],
    textBody: [],
    attachments: [],
    hasAttachment: false,
    keywords: { "$seen": true },
    size: 1220,
  },
];

const fixtureAttachments: EmailBodyPart[] = [
  {
    blobId: "blob-sheet",
    name: "March water bills.xlsx",
    size: 24_576,
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    disposition: "attachment",
    cid: "historical-file-id",
  },
  {
    blobId: "blob-inline-logo",
    name: "tracking-logo.png",
    size: 512,
    type: "image/png",
    disposition: "inline",
    cid: "inline-logo",
  },
];

const incomingEmail: Email = {
  ...fixtureEmails[0],
  id: "email-new-arrival",
  messageId: ["message-new-arrival@example.test"],
  threadId: "thread-new-arrival",
  subject: "New mail arrived",
  from: [{ name: "Maya Chen", email: "maya@example.test" }],
  receivedAt: "2026-07-24T19:00:00.000Z",
  preview: "This conversation appeared without a manual refresh.",
};

const darkRenderingDocument = prepareHtml(
  `<main style="margin:0 auto;max-width:720px;background:#fff;padding:40px">
    <section id="neutral-canvas" style="background:#fff;padding:32px;color:#d6d6d6">
      <h1 style="margin:0 0 18px;color:#a8dce8">Theme-aware email</h1>
      <p style="font-size:18px;line-height:1.5">Light sender text remains readable after the neutral canvas adopts the client theme.</p>
      <p id="dark-copy" style="color:#222">Dark neutral text is raised to accessible contrast.</p>
    </section>
    <section id="image-panel" style="margin-top:20px;padding:30px;background-color:#fff;background-image:linear-gradient(135deg,#f8fafc,#fff);color:#f8fafc">
      Image-backed artwork remains sender-authored.
    </section>
    <section id="brand-panel" style="margin-top:20px;padding:24px;background:#fff3cc;color:#3f2d00">
      A deliberately coloured brand panel is preserved.
    </section>
  </main>`,
  { colorMode: "dark" },
);

const navItems: Array<{ panel: SmokePanel; label: string }> = [
  { panel: "inbox", label: "Inbox" },
  { panel: "reply", label: "Reply" },
  { panel: "attachments", label: "Attachments" },
];

function TabIndicatorSmokePanel() {
  const unreadCount = useUnreadCount();

  function setUnreadCount(targetCount: number) {
    const difference = targetCount - unreadCount;
    if (difference === 0) return;

    dispatchUnreadCountEvent(
      difference > 0 ? "unread" : "read",
      Array.from(
        { length: Math.abs(difference) },
        (_, index) => `tab-indicator-${targetCount}-${index}`,
      ),
    );
  }

  return (
    <section className="flex h-full items-center justify-center overflow-auto p-6">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-sm dark:border-stone-800 dark:bg-stone-950">
        <div className="flex items-center gap-4">
          <div
            role="img"
            aria-label="Current browser tab icon"
            data-testid="favicon-preview"
            className="h-16 w-16 rounded-2xl bg-contain bg-center bg-no-repeat"
            style={{
              backgroundImage: `url("${
                unreadCount > 0
                  ? getUnreadFaviconDataUrl(unreadCount)
                  : DEFAULT_FAVICON_HREF
              }")`,
            }}
          />
          <div>
            <p className="text-sm font-medium text-stone-900 dark:text-stone-100">
              {getBrowserTabTitle(unreadCount)}
            </p>
            <p
              data-testid="tab-unread-count"
              className="mt-1 text-sm text-stone-500 dark:text-stone-400"
            >
              {unreadCount === 0
                ? "No unread email"
                : `${unreadCount} unread ${unreadCount === 1 ? "email" : "emails"}`}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setUnreadCount(1)}
            className="rounded-lg bg-stone-900 px-3 py-2 text-sm text-white dark:bg-stone-100 dark:text-stone-900"
          >
            Set 1 unread
          </button>
          <button
            type="button"
            onClick={() => setUnreadCount(99)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 dark:border-stone-700 dark:text-stone-200"
          >
            Set 99 unread
          </button>
          <button
            type="button"
            onClick={() => setUnreadCount(0)}
            className="rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-700 dark:border-stone-700 dark:text-stone-200"
          >
            Clear unread
          </button>
        </div>
      </div>
    </section>
  );
}

export default function SmokeHarness({ panel }: { panel: SmokePanel }) {
  const [autoSyncEmails, setAutoSyncEmails] = useState(fixtureEmails);
  const runAutoSyncCheck = useCallback(async () => {
    setAutoSyncEmails((current) =>
      current.some((email) => email.id === incomingEmail.id)
        ? current
        : [incomingEmail, ...current],
    );
    return {
      latestEmailId: incomingEmail.id,
      total: fixtureEmails.length + 1,
    };
  }, []);

  return (
    <div
      data-testid="mail-smoke-harness"
      className="flex h-full min-h-0 flex-col bg-stone-50 dark:bg-stone-900"
    >
      <header className="flex min-h-14 shrink-0 items-center justify-between gap-4 border-b border-stone-200 bg-white px-4 dark:border-stone-800 dark:bg-stone-950">
        <h1 className="text-sm font-semibold text-stone-800 dark:text-stone-200">
          Mail reliability checks
        </h1>
        <nav aria-label="Smoke test panels" className="flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.panel}
              href={`/smoke-tests?panel=${item.panel}`}
              aria-current={panel === item.panel ? "page" : undefined}
              className={[
                "rounded-md px-3 py-2 text-xs transition-colors",
                panel === item.panel
                  ? "bg-stone-200 text-stone-900 dark:bg-stone-800 dark:text-stone-100"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100",
              ].join(" ")}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>

      <div className="min-h-0 flex-1">
        {panel === "inbox" && (
          <EmailListPanel
            unreads={[fixtureEmails[0]]}
            unreadTotal={1}
            reads={[fixtureEmails[1]]}
            readTotal={1}
            inboxId="mailbox-inbox"
            archiveMailboxId="mailbox-archive"
            trashMailboxId="mailbox-trash"
            threadHrefPrefix="/smoke-tests/thread"
            autoSyncIntervalMs={0}
          />
        )}

        {panel === "auto-sync" && (
          <EmailListPanel
            unreads={autoSyncEmails.filter(
              (email) => !email.keywords["$seen"],
            )}
            unreadTotal={
              autoSyncEmails.filter((email) => !email.keywords["$seen"]).length
            }
            reads={autoSyncEmails.filter((email) => email.keywords["$seen"])}
            readTotal={
              autoSyncEmails.filter((email) => email.keywords["$seen"]).length
            }
            inboxId="mailbox-inbox"
            threadHrefPrefix="/smoke-tests/thread"
            autoSyncIntervalMs={700}
            autoSyncCheck={runAutoSyncCheck}
          />
        )}

        {panel === "reply" && (
          <Composer
            identities={[
              {
                id: "identity-primary",
                name: "Phillip Carter",
                email: "phillip@example.test",
              },
            ]}
            initialTo="Maya Chen <maya@example.test>"
            initialSubject="Re: Quarterly plan"
            initialBody={
              "Thanks, Maya.\n\n> On July 24, 2026, Maya Chen wrote:\n>\n> The revised plan is ready for review."
            }
            inReplyToId="message-maya@example.test"
            replyThreadId="thread-maya"
          />
        )}

        {panel === "attachments" && (
          <section className="h-full overflow-auto p-6">
            <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
              Historical message
            </h2>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              The explicit spreadsheet attachment should remain visible.
            </p>
            <AttachmentList attachments={fixtureAttachments} />
          </section>
        )}

        {panel === "dark-rendering" && (
          <section className="h-full overflow-auto bg-stone-900 p-6">
            <iframe
              srcDoc={darkRenderingDocument}
              className="h-[560px] w-full border-0"
              sandbox="allow-scripts"
              title="Dark email rendering fixture"
            />
          </section>
        )}

        {panel === "tab-indicator" && <TabIndicatorSmokePanel />}

        {panel === "target" && (
          <div className="flex h-full items-center justify-center p-6">
            <p className="text-sm text-stone-600 dark:text-stone-300">
              Navigation completed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
