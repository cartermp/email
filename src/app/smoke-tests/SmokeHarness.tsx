"use client";

import Link from "next/link";
import AttachmentList from "@/components/AttachmentList";
import Composer from "@/components/Composer";
import EmailListPanel from "@/components/EmailListPanel";
import type { Email, EmailBodyPart } from "@/lib/types";

export type SmokePanel = "inbox" | "reply" | "attachments" | "target";

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

const navItems: Array<{ panel: SmokePanel; label: string }> = [
  { panel: "inbox", label: "Inbox" },
  { panel: "reply", label: "Reply" },
  { panel: "attachments", label: "Attachments" },
];

export default function SmokeHarness({ panel }: { panel: SmokePanel }) {
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
