import { Suspense } from "react";
import { unstable_rethrow } from "next/navigation";
import { loadMailPanelData } from "@/lib/jmap";
import { log } from "@/lib/logger";
import EmailListPanel, {
  DeferredMailPanelSync,
  type DeferredMailPanelData,
} from "@/components/EmailListPanel";
import InboxPanelLayout from "@/components/InboxPanelLayout";
import { MailListLoadingSkeleton } from "@/components/LoadingSkeletons";
import { getJmapMailboxContext } from "@/lib/jmapServer";

const EMPTY_DEFERRED_DATA: DeferredMailPanelData = {
  drafts: [],
  sentEmails: [],
  pinnedEmails: [],
  spamUnreads: [],
  spamUnreadTotal: 0,
  spamReads: [],
  spamReadTotal: 0,
};

async function DeferredPanelData({
  result,
}: {
  result: Promise<DeferredMailPanelData>;
}) {
  return <DeferredMailPanelSync data={await result} />;
}

async function MailPanelData() {
  let context: Awaited<ReturnType<typeof getJmapMailboxContext>>;
  try {
    context = await getJmapMailboxContext();
  } catch (err) {
    unstable_rethrow(err);
    log.error({ err }, "layout.inbox.session_error");
    return (
      <div className="flex h-full items-center justify-center bg-stone-50 dark:bg-stone-900">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Unable to connect to mail server
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Check your connection and refresh to try again.
          </p>
        </div>
      </div>
    );
  }
  const { session, accountId, mailboxes } = context;

  const inbox = mailboxes.find((m) => m.role === "inbox");
  const draftsMailbox = mailboxes.find((m) => m.role === "drafts");
  const sentMailbox = mailboxes.find((m) => m.role === "sent");
  const archiveMailbox = mailboxes.find((m) => m.role === "archive");
  const trashMailbox = mailboxes.find((m) => m.role === "trash");
  const spamMailbox = mailboxes.find((m) => m.role === "junk" || m.name.toLowerCase() === "spam" || m.name.toLowerCase() === "junk");

  const primaryResult = loadMailPanelData(
    session.apiUrl,
    accountId,
    { inbox: inbox?.id },
    false,
  );
  const deferredResult = primaryResult
    .then(() =>
      loadMailPanelData(
        session.apiUrl,
        accountId,
        {
          drafts: draftsMailbox?.id,
          sent: sentMailbox?.id,
          spam: spamMailbox?.id,
        },
        true,
      ),
    )
    .then(
      (data): DeferredMailPanelData => ({
        drafts: data.drafts,
        sentEmails: data.sent.emails,
        pinnedEmails: data.pinned,
        spamUnreads: data.spam.unreads,
        spamUnreadTotal: data.spam.unreadTotal,
        spamReads: data.spam.reads,
        spamReadTotal: data.spam.readTotal,
      }),
    )
    .catch((err) => {
      unstable_rethrow(err);
      log.error({ err }, "layout.inbox.deferred_error");
      return EMPTY_DEFERRED_DATA;
    });

  let panelData: Awaited<ReturnType<typeof loadMailPanelData>>;

  try {
    panelData = await primaryResult;
  } catch (err) {
    unstable_rethrow(err);
    log.error({ err }, "layout.inbox.fetch_error");
    panelData = {
      inbox: { unreads: [], unreadTotal: 0, reads: [], readTotal: 0 },
      drafts: [],
      pinned: [],
      sent: { emails: [], total: 0 },
      spam: { unreads: [], unreadTotal: 0, reads: [], readTotal: 0 },
    };
  }

  const { unreads, unreadTotal, reads, readTotal } = panelData.inbox;

  log.info({
    unread_count: unreads.length,
    unread_total: unreadTotal,
    read_count: reads.length,
    read_total: readTotal,
    pinned_count: panelData.pinned.length,
    has_drafts_mailbox: !!draftsMailbox,
    has_sent_mailbox: !!sentMailbox,
    has_spam_mailbox: !!spamMailbox,
  }, "layout.inbox.load");

  return (
    <EmailListPanel
      unreads={unreads}
      unreadTotal={unreadTotal}
      reads={reads}
      readTotal={readTotal}
      inboxId={inbox?.id ?? ""}
      pinnedEmails={panelData.pinned}
      archiveMailboxId={archiveMailbox?.id}
      trashMailboxId={trashMailbox?.id}
      spamMailboxId={spamMailbox?.id}
      deferredContent={
        <Suspense fallback={null}>
          <DeferredPanelData result={deferredResult} />
        </Suspense>
      }
    />
  );
}

export default function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InboxPanelLayout
      list={
        <Suspense fallback={<MailListLoadingSkeleton />}>
          <MailPanelData />
        </Suspense>
      }
    >
      {children}
    </InboxPanelLayout>
  );
}
