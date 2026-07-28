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
import { getMailboxIds, resolveMailboxes } from "@/lib/mailbox";

const EMPTY_DEFERRED_DATA: DeferredMailPanelData = {
  drafts: { emails: [], total: 0 },
  sent: { emails: [], total: 0 },
  pinned: [],
  spam: { unreads: [], unreadTotal: 0, reads: [], readTotal: 0 },
  archive: { unreads: [], unreadTotal: 0, reads: [], readTotal: 0 },
  trash: { unreads: [], unreadTotal: 0, reads: [], readTotal: 0 },
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

  const resolvedMailboxes = resolveMailboxes(mailboxes);
  const mailboxIds = getMailboxIds(resolvedMailboxes);

  const primaryResult = loadMailPanelData(
    session.apiUrl,
    accountId,
    { inbox: mailboxIds.inbox },
    { includeEmailState: true },
  );
  const deferredResult = primaryResult
    .then(() =>
      loadMailPanelData(
        session.apiUrl,
        accountId,
        {
          drafts: mailboxIds.drafts,
          pinned: mailboxIds.inbox,
          sent: mailboxIds.sent,
          spam: mailboxIds.spam,
          archive: mailboxIds.archive,
          trash: mailboxIds.trash,
        },
      ),
    )
    .then(
      (data): DeferredMailPanelData => ({
        drafts: data.drafts,
        sent: data.sent,
        pinned: data.pinned,
        spam: data.spam,
        archive: data.archive,
        trash: data.trash,
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
      drafts: { emails: [], total: 0 },
      pinned: [],
      sent: { emails: [], total: 0 },
      spam: { unreads: [], unreadTotal: 0, reads: [], readTotal: 0 },
      archive: { unreads: [], unreadTotal: 0, reads: [], readTotal: 0 },
      trash: { unreads: [], unreadTotal: 0, reads: [], readTotal: 0 },
      emailState: undefined,
    };
  }

  const { unreads, unreadTotal, reads, readTotal } = panelData.inbox;

  log.info({
    unread_count: unreads.length,
    unread_total: unreadTotal,
    read_count: reads.length,
    read_total: readTotal,
    pinned_count: panelData.pinned.length,
    has_drafts_mailbox: !!mailboxIds.drafts,
    has_sent_mailbox: !!mailboxIds.sent,
    has_spam_mailbox: !!mailboxIds.spam,
  }, "layout.inbox.load");

  return (
    <EmailListPanel
      initialData={panelData}
      mailboxIds={mailboxIds}
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
