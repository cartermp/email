"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import AttachmentList from "@/components/AttachmentList";
import Composer from "@/components/Composer";
import EmailBody from "@/components/EmailBody";
import EmailListPanel from "@/components/EmailListPanel";
import MessageActionBar from "@/components/MessageActionBar";
import MobileNav from "@/components/MobileNav";
import { useUnreadCount } from "@/components/UnreadCountProvider";
import {
  DEFAULT_FAVICON_HREF,
  getBrowserTabTitle,
  getUnreadFaviconDataUrl,
} from "@/lib/browserTabIndicator";
import { prepareHtml } from "@/lib/emailHtml";
import { buildForwardedHtml } from "@/lib/composeHtml";
import { dispatchUnreadCountEvent } from "@/lib/unreadCount";
import { notifyMailboxMove } from "@/lib/mailboxMove";
import type { Email, EmailBodyPart } from "@/lib/types";
import type { MailPanelData } from "@/lib/jmap";

export type SmokePanel =
  | "inbox"
  | "mailbox-move"
  | "reply"
  | "forward"
  | "attachments"
  | "target"
  | "auto-sync"
  | "dark-rendering"
  | "tab-indicator"
  | "message-actions"
  | "mobile-viewport"
  | "reader-privacy"
  | "row-overlays";

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

const overlayFixtureEmails = fixtureEmails.map((email) =>
  email.id === "email-maya"
    ? { ...email, keywords: { ...email.keywords, $flagged: true } }
    : email,
);

function makePanelData(
  emails: Email[],
  emailState: string,
): MailPanelData {
  const unreads = emails.filter((email) => !email.keywords["$seen"]);
  const reads = emails.filter((email) => email.keywords["$seen"]);
  const emptySplit = {
    unreads: [] as Email[],
    unreadTotal: 0,
    reads: [] as Email[],
    readTotal: 0,
  };
  return {
    inbox: {
      unreads,
      unreadTotal: unreads.length,
      reads,
      readTotal: reads.length,
    },
    drafts: { emails: [], total: 0 },
    pinned: emails.filter((email) => email.keywords.$flagged),
    sent: { emails: [], total: 0 },
    spam: emptySplit,
    archive: emptySplit,
    trash: emptySplit,
    emailState,
  };
}

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

const forwardedNewsletterHtml = buildForwardedHtml(
  `<html>
    <head>
      <style>
        .newsletter-card { background: #eef2ff; border: 2px solid #6366f1; border-radius: 14px; padding: 28px; }
        .newsletter-title { color: #312e81; font: 700 26px/1.2 Georgia, serif; margin: 0 0 12px; }
        .newsletter-link { color: #4338ca; font-weight: 700; }
      </style>
    </head>
    <body>
      <div id="preserved-newsletter" class="newsletter-card">
        <h1 class="newsletter-title">Retrieval Weekly</h1>
        <p>The latest research, presented in its original layout.</p>
        <a class="newsletter-link" href="https://substack.com/redirect/very-long-tracking-link">Read the paper</a>
      </div>
    </body>
  </html>`,
  {
    from: "Retrieval Weekly <newsletter@example.test>",
    to: "Phillip Carter <phillip@example.test>",
    date: "July 31, 2026",
    subject: "The latest in information retrieval",
  },
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

function MailboxMoveSmokePanel() {
  const notice = {
    emailIds: ["email-maya"],
    sourceMailboxId: "mailbox-inbox",
    targetMailboxId: "mailbox-trash",
  };

  return (
    <section className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 gap-2 border-b border-stone-200 bg-white px-4 py-2 dark:border-stone-800 dark:bg-stone-950">
        <button
          type="button"
          onClick={() => notifyMailboxMove({ ...notice, phase: "move" })}
          className="rounded-md bg-stone-900 px-3 py-2 text-xs font-medium text-white dark:bg-stone-100 dark:text-stone-900"
        >
          Move fixture to Trash
        </button>
        <button
          type="button"
          onClick={() => notifyMailboxMove({ ...notice, phase: "revert" })}
          className="rounded-md border border-stone-300 px-3 py-2 text-xs text-stone-700 dark:border-stone-700 dark:text-stone-200"
        >
          Roll back fixture move
        </button>
      </div>
      <div className="min-h-0 flex-1">
        <EmailListPanel
          initialData={makePanelData(fixtureEmails, "state-initial")}
          mailboxIds={{
            inbox: "mailbox-inbox",
            archive: "mailbox-archive",
            trash: "mailbox-trash",
            spam: "mailbox-spam",
          }}
          threadHrefPrefix="/smoke-tests/thread"
          autoSyncIntervalMs={0}
        />
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
      emailState: "state-with-incoming-email",
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
            initialData={makePanelData(fixtureEmails, "state-initial")}
            mailboxIds={{
              inbox: "mailbox-inbox",
              archive: "mailbox-archive",
              trash: "mailbox-trash",
              spam: "mailbox-spam",
            }}
            threadHrefPrefix="/smoke-tests/thread"
            autoSyncIntervalMs={0}
          />
        )}

        {panel === "row-overlays" && (
          <div className="h-full w-[430px] max-w-full border-r border-stone-200 dark:border-stone-700">
            <EmailListPanel
              initialData={makePanelData(
                overlayFixtureEmails,
                "state-row-overlays",
              )}
              mailboxIds={{
                inbox: "mailbox-inbox",
                archive: "mailbox-archive",
                trash: "mailbox-trash",
                spam: "mailbox-spam",
              }}
              threadHrefPrefix="/smoke-tests/thread"
              autoSyncIntervalMs={0}
            />
          </div>
        )}

        {panel === "mailbox-move" && <MailboxMoveSmokePanel />}

        {panel === "auto-sync" && (
          <EmailListPanel
            initialData={makePanelData(
              autoSyncEmails,
              autoSyncEmails.length > fixtureEmails.length
                ? "state-with-incoming-email"
                : "state-initial",
            )}
            mailboxIds={{ inbox: "mailbox-inbox" }}
            threadHrefPrefix="/smoke-tests/thread"
            autoSyncIntervalMs={700}
            autoSyncCheck={runAutoSyncCheck}
          />
        )}

        {panel === "reader-privacy" && (
          <section className="mx-auto w-full max-w-3xl overflow-auto p-6">
            <EmailBody
              type="html"
              body='<p>Remote content fixture</p><img id="remote-pixel" src="https://images.example.test/tracking-pixel.png" alt="">'
            />
          </section>
        )}

        {panel === "reply" && (
          <Composer
            identities={[
              {
                id: "identity-primary",
                name: "Phillip Carter",
                email: "phillip@example.test",
                textSignature: "",
              },
              {
                id: "identity-alias",
                name: "Phillip at Work",
                email: "phillip@work.example.test",
                textSignature: "-- \nWork signature",
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

        {panel === "forward" && (
          <Composer
            identities={[
              {
                id: "identity-primary",
                name: "Phillip Carter",
                email: "phillip@example.test",
                textSignature: "",
              },
            ]}
            initialSubject="Fwd: The latest in information retrieval"
            initialBody={
              "\n\n---\n\n**---------- Forwarded message ----------**\n\n**From:** Retrieval Weekly <newsletter@example.test>  \n**To:** Phillip Carter <phillip@example.test>  \n**Date:** July 31, 2026  \n**Subject:** The latest in information retrieval\n\nRetrieval Weekly [ https://substack.com/redirect/very-long-tracking-link ]"
            }
            forwardedHtml={forwardedNewsletterHtml}
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

        {panel === "message-actions" && (
          <section className="flex h-full items-start justify-center overflow-auto bg-stone-50 p-4 pt-12 dark:bg-stone-900">
            <div className="w-full max-w-xl overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm dark:border-stone-700 dark:bg-stone-800/50">
              <div className="px-4 py-4">
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                  Mobile action alignment
                </p>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                  A message with multiple recipients
                </p>
              </div>
              <MessageActionBar
                emailId="email-mobile-actions"
                hasMultipleRecipients
                initiallyPinned={false}
                isSpam={false}
                mailboxIds={{ "mailbox-inbox": true }}
                systemMailboxIds={{
                  inbox: "mailbox-inbox",
                  archive: "mailbox-archive",
                  trash: "mailbox-trash",
                  spam: "mailbox-spam",
                }}
                className="border-t border-stone-100 dark:border-stone-700/70"
              />
            </div>
          </section>
        )}

        {panel === "mobile-viewport" && (
          <section
            data-testid="mobile-viewport-fixture"
            className="flex h-full min-h-0 flex-col bg-stone-50 dark:bg-stone-900"
          >
            <div className="flex min-h-0 flex-1 items-center justify-center px-6">
              <p className="max-w-xs text-center text-sm text-stone-500 dark:text-stone-400">
                The navigation stays attached to the live mobile viewport.
              </p>
            </div>
            <div className="mobile-nav-spacer shrink-0 lg:hidden" aria-hidden="true" />
            <MobileNav />
          </section>
        )}

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
