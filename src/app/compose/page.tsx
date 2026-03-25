import { getSession, getAccountId, getIdentities, getEmail } from "@/lib/jmap";
import { formatAddressRFC, formatFullDate } from "@/lib/format";
import {
  reSubject,
  fwdSubject,
  addrList,
  buildReplyQuote,
  buildForwardQuote,
  htmlToPlainText,
} from "@/lib/compose";
import Composer from "@/components/Composer";
import MobileBackButton from "@/components/MobileBackButton";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ mode?: string; id?: string; draftId?: string }>;
}

export default async function ComposePage({ searchParams }: Props) {
  const { mode, id, draftId } = await searchParams;

  const session = await getSession();
  const accountId = getAccountId(session);
  const identities = await getIdentities(session.apiUrl, accountId);

  const sorted = identities.sort((a, b) => {
    if (a.mayDelete === false && b.mayDelete !== false) return -1;
    if (b.mayDelete === false && a.mayDelete !== false) return 1;
    return 0;
  });

  let initialTo = "";
  let initialCc = "";
  let initialBcc = "";
  let initialSubject = "";
  let initialBody = "";
  let inReplyToId: string | undefined;
  let replyThreadId: string | undefined;
  let title = "New Message";
  let initialDraftId: string | undefined;
  let forwardedHtml: string | undefined;

  // Resume a saved draft
  if (draftId) {
    const draft = await getEmail(session.apiUrl, accountId, draftId);
    if (draft) {
      initialDraftId = draftId;
      initialTo = draft.to?.map(formatAddressRFC).join(", ") ?? "";
      initialCc = draft.cc?.map(formatAddressRFC).join(", ") ?? "";
      // bcc is visible on drafts since they live in the sender's mailbox
      initialBcc = (draft as { bcc?: typeof draft.to })?.bcc
        ?.map(formatAddressRFC)
        .join(", ") ?? "";
      initialSubject = draft.subject ?? "";
      if (draft.textBody?.length > 0) {
        const part = draft.textBody[0];
        if (part.partId && draft.bodyValues?.[part.partId]) {
          initialBody = draft.bodyValues[part.partId].value;
        }
      }
      title = "Draft";
    }
  } else if (id && (mode === "reply" || mode === "reply-all" || mode === "forward")) {
    const email = await getEmail(session.apiUrl, accountId, id);

    if (email) {
      let bodyText = "";
      if (email.textBody?.length > 0) {
        const part = email.textBody[0];
        if (part.partId && email.bodyValues?.[part.partId]) {
          const raw = email.bodyValues[part.partId].value;
          // Some senders (e.g. Zola) set the text/plain part to raw HTML source.
          // Detect this by checking whether the content opens with an HTML tag
          // and discard it in favour of the HTML body below.
          if (!/^\s*</i.test(raw)) {
            bodyText = raw;
          }
        }
      }
      if (!bodyText && email.htmlBody?.length > 0) {
        const part = email.htmlBody[0];
        if (part.partId && email.bodyValues?.[part.partId]) {
          bodyText = htmlToPlainText(email.bodyValues[part.partId].value);
        }
      }
      if (!bodyText) bodyText = email.preview ?? "";

      const fromAddr = email.replyTo?.[0] ?? email.from?.[0];
      const fromStr = fromAddr ? formatAddressRFC(fromAddr) : "";
      const dateStr = formatFullDate(email.receivedAt);
      const myEmails = new Set(sorted.map((i) => i.email.toLowerCase()));

      if (mode === "reply") {
        title = "Reply";
        initialTo = fromStr;
        initialSubject = reSubject(email.subject);
        inReplyToId = email.messageId?.[0];
        replyThreadId = email.threadId;
        initialBody = buildReplyQuote(dateStr, fromStr, bodyText);
      } else if (mode === "reply-all") {
        title = "Reply All";
        initialTo = fromStr;
        const others = [...(email.to ?? []), ...(email.cc ?? [])].filter(
          (a) => !myEmails.has(a.email.toLowerCase())
        );
        initialCc = others.map(formatAddressRFC).join(", ");
        initialSubject = reSubject(email.subject);
        inReplyToId = email.messageId?.[0];
        replyThreadId = email.threadId;
        initialBody = buildReplyQuote(dateStr, fromStr, bodyText);
      } else if (mode === "forward") {
        title = "Forward";
        initialSubject = fwdSubject(email.subject);
        // Capture the original HTML body so the Composer can append it
        // verbatim to the outgoing email — preserving images and formatting.
        if (email.htmlBody?.length > 0) {
          const part = email.htmlBody[0];
          if (part.partId && email.bodyValues?.[part.partId]) {
            forwardedHtml = email.bodyValues[part.partId].value;
          }
        }
        // The markdown body carries the plain-text fallback (text/plain part
        // of the sent email) and what's shown in the editor.
        initialBody = buildForwardQuote({
          from: addrList(email.from),
          to: addrList(email.to),
          date: dateStr,
          subject: email.subject ?? "",
          body: bodyText,
        });
      }
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-6 py-4 flex items-center gap-3">
        <MobileBackButton label="" />
        <h1 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          {title}
        </h1>
      </div>
      <div className="flex-1 min-h-0">
        <Composer
          identities={sorted.map((i) => ({ id: i.id, name: i.name, email: i.email }))}
          initialTo={initialTo}
          initialCc={initialCc}
          initialBcc={initialBcc}
          initialSubject={initialSubject}
          initialBody={initialBody}
          inReplyToId={inReplyToId}
          replyThreadId={replyThreadId}
          initialDraftId={initialDraftId}
          forwardedHtml={forwardedHtml}
        />
      </div>
    </div>
  );
}
