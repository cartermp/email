import { getIdentities, getEmail } from "@/lib/jmap";
import { formatAddressRFC, formatFullDate } from "@/lib/format";
import {
  reSubject,
  fwdSubject,
  addrList,
  buildReplyQuote,
  buildForwardQuote,
  htmlToPlainText,
  applyIdentitySignature,
} from "@/lib/compose";
import Composer from "@/components/Composer";
import MobileBackButton from "@/components/MobileBackButton";
import { getJmapContext } from "@/lib/jmapServer";
import { visibleAttachments } from "@/lib/attachments";
import {
  buildForwardedHtml,
  extractForwardedHtml,
  replaceCidReferences,
} from "@/lib/composeHtml";
import { sanitizeReaderHtml } from "@/lib/printHtml";
import type { EmailBodyPart } from "@/lib/types";

interface Props {
  searchParams: Promise<{ mode?: string; id?: string; draftId?: string }>;
}

export default async function ComposePage({ searchParams }: Props) {
  const { mode, id, draftId } = await searchParams;

  const { session, accountId } = await getJmapContext();
  const sourceEmailId =
    draftId ??
    (id && (mode === "reply" || mode === "reply-all" || mode === "forward")
      ? id
      : undefined);
  const [identities, sourceEmail] = await Promise.all([
    getIdentities(session.apiUrl, accountId),
    sourceEmailId
      ? getEmail(session.apiUrl, accountId, sourceEmailId)
      : Promise.resolve(null),
  ]);

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
  let initialIdentityId: string | undefined;
  let initialInlineImages: {
    id: string;
    blobId: string;
    dataUrl: string;
    type: string;
  }[] = [];
  let initialAttachments: {
    id: string;
    name: string;
    size: number;
    type: string;
    blobId: string;
  }[] = [];

  // Resume a saved draft
  if (draftId) {
    const draft = sourceEmail;
    if (draft) {
      initialDraftId = draftId;
      initialTo = draft.to?.map(formatAddressRFC).join(", ") ?? "";
      initialCc = draft.cc?.map(formatAddressRFC).join(", ") ?? "";
      initialBcc = draft.bcc
        ?.map(formatAddressRFC)
        .join(", ") ?? "";
      initialIdentityId = sorted.find(
        (identity) =>
          identity.email.toLowerCase() === draft.from?.[0]?.email.toLowerCase(),
      )?.id;
      initialSubject = draft.subject ?? "";
      if (draft.textBody?.length > 0) {
        const part = draft.textBody[0];
        if (part.partId && draft.bodyValues?.[part.partId]) {
          initialBody = draft.bodyValues[part.partId].value;
        }
      }
      if (draft.htmlBody?.length > 0) {
        const htmlPart = draft.htmlBody[0];
        if (htmlPart.partId && draft.bodyValues?.[htmlPart.partId]) {
          forwardedHtml = extractForwardedHtml(
            draft.bodyValues[htmlPart.partId].value,
          );
        }
      }
      const inlineParts = (draft.attachments ?? []).filter(
        (part) => part.blobId && part.disposition?.toLowerCase() === "inline",
      );
      initialInlineImages = inlineParts.flatMap((part) => {
        const id = part.cid?.replace(/@mail$/i, "");
        if (!id || !part.blobId) return [];
        return [{
          id,
          blobId: part.blobId,
          type: part.type,
          dataUrl: inlinePartUrl(part),
        }];
      });
      initialAttachments = visibleAttachments(draft.attachments).flatMap(
        (part) =>
          part.blobId
            ? [{
                id: `draft-${part.blobId}`,
                name: part.name ?? "attachment",
                size: part.size,
                type: part.type,
                blobId: part.blobId,
              }]
            : [],
      );
      title = "Draft";
      if (draft.inReplyTo?.[0]) {
        inReplyToId = draft.inReplyTo[0];
        replyThreadId = draft.threadId;
      }
    }
  } else if (id && (mode === "reply" || mode === "reply-all" || mode === "forward")) {
    const email = sourceEmail;

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
      const recipientEmails = new Set(
        [...(email.to ?? []), ...(email.cc ?? []), ...(email.bcc ?? [])]
          .map((address) => address.email.toLowerCase())
      );
      initialIdentityId = sorted.find((identity) =>
        recipientEmails.has(identity.email.toLowerCase())
      )?.id;

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
        // Preserve downloadable files and embedded CID resources from the
        // original message. CID references are rewritten to stable IDs used by
        // the new outgoing multipart/related message.
        const forwardedInlineParts = (email.attachments ?? []).filter((part) =>
          !!part.blobId &&
          !!part.cid &&
          part.type !== "text/calendar" &&
          part.disposition?.toLowerCase() !== "attachment"
        );
        const cidReplacements = forwardedInlineParts.map((part, index) => {
          const inlineId = `forwarded-${index + 1}`;
          initialInlineImages.push({
            id: inlineId,
            blobId: part.blobId!,
            dataUrl: inlinePartUrl(part),
            type: part.type,
          });
          return { cid: part.cid!, url: `cid:${inlineId}@mail` };
        });
        initialAttachments = visibleAttachments(email.attachments).flatMap(
          (part) =>
            part.blobId
              ? [{
                  id: `forwarded-${part.blobId}`,
                  name: part.name ?? "attachment",
                  size: part.size,
                  type: part.type,
                  blobId: part.blobId,
                }]
              : [],
        );

        // Keep the original rich message as a separate HTML fragment. The
        // Markdown quote remains the text/plain fallback and is not duplicated
        // into the outgoing HTML part.
        if (email.htmlBody?.length > 0) {
          const part = email.htmlBody[0];
          if (part.partId && email.bodyValues?.[part.partId]) {
            const originalHtml = replaceCidReferences(
              sanitizeReaderHtml(email.bodyValues[part.partId].value),
              cidReplacements,
            );
            forwardedHtml = buildForwardedHtml(originalHtml, {
              from: addrList(email.from),
              to: addrList(email.to),
              date: dateStr,
              subject: email.subject ?? "",
            });
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

  const selectedIdentityId = initialIdentityId ?? sorted[0]?.id;
  const selectedIdentity = sorted.find(
    (identity) => identity.id === selectedIdentityId
  );
  const preparedBody = draftId
    ? initialBody
    : applyIdentitySignature(initialBody, selectedIdentity?.textSignature ?? "");

  return (
    <div className="flex flex-col h-full">
      <div className="sticky top-0 flex min-h-[52px] items-center gap-3 border-b border-stone-200 bg-white px-4 dark:border-stone-800 dark:bg-stone-900 sm:px-6">
        <MobileBackButton label="" compact />
        <h1 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          {title}
        </h1>
      </div>
      <div className="flex-1 min-h-0">
        <Composer
          identities={sorted.map((i) => ({
            id: i.id,
            name: i.name,
            email: i.email,
            textSignature: i.textSignature,
          }))}
          initialTo={initialTo}
          initialCc={initialCc}
          initialBcc={initialBcc}
          initialSubject={initialSubject}
          initialBody={preparedBody}
          inReplyToId={inReplyToId}
          replyThreadId={replyThreadId}
          initialDraftId={initialDraftId}
          forwardedHtml={forwardedHtml}
          initialIdentityId={selectedIdentityId}
          initialInlineImages={initialInlineImages}
          initialAttachments={initialAttachments}
        />
      </div>
    </div>
  );
}

function inlinePartUrl(part: EmailBodyPart): string {
  const params = new URLSearchParams({
    blobId: part.blobId ?? "",
    name: part.name ?? "inline-image",
    type: part.type,
    inline: "true",
  });
  return `/api/download?${params.toString()}`;
}
