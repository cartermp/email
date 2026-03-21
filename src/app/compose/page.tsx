import { getSession, getAccountId, getIdentities, getEmail } from "@/lib/jmap";
import { formatAddressRFC, formatFullDate } from "@/lib/format";
import {
  reSubject,
  fwdSubject,
  addrList,
  buildReplyQuote,
  buildForwardQuote,
} from "@/lib/compose";
import Composer from "@/components/Composer";

export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ mode?: string; id?: string }>;
}

export default async function ComposePage({ searchParams }: Props) {
  const { mode, id } = await searchParams;

  const session = await getSession();
  const accountId = getAccountId(session);
  const identities = await getIdentities(session.apiUrl, accountId);

  // Sort: primary (non-deletable) identities first
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
  let title = "New Message";

  if (id && (mode === "reply" || mode === "reply-all" || mode === "forward")) {
    const email = await getEmail(session.apiUrl, accountId, id);

    if (email) {
      // Extract plain text body for quoting
      let bodyText = "";
      if (email.textBody?.length > 0) {
        const part = email.textBody[0];
        if (part.partId && email.bodyValues?.[part.partId]) {
          bodyText = email.bodyValues[part.partId].value;
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
        initialBody = buildReplyQuote(dateStr, fromStr, bodyText);
      } else if (mode === "reply-all") {
        title = "Reply All";
        initialTo = fromStr;
        // CC = all To + CC recipients except yourself
        const others = [...(email.to ?? []), ...(email.cc ?? [])].filter(
          (a) => !myEmails.has(a.email.toLowerCase())
        );
        initialCc = others.map(formatAddressRFC).join(", ");
        initialSubject = reSubject(email.subject);
        inReplyToId = email.messageId?.[0];
        initialBody = buildReplyQuote(dateStr, fromStr, bodyText);
      } else if (mode === "forward") {
        title = "Forward";
        initialSubject = fwdSubject(email.subject);
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
      <div className="sticky top-0 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-800 px-6 py-4">
        <h1 className="text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h1>
      </div>
      <div className="flex-1 min-h-0" style={{ height: "calc(100vh - 57px)" }}>
        <Composer
          identities={sorted.map((i) => ({ id: i.id, name: i.name, email: i.email }))}
          initialTo={initialTo}
          initialCc={initialCc}
          initialBcc={initialBcc}
          initialSubject={initialSubject}
          initialBody={initialBody}
          inReplyToId={inReplyToId}
        />
      </div>
    </div>
  );
}
