"use server";

import { auth } from "@/auth";
import { getSession, getAccountId, getIdentities, getMailboxes, markAsRead, markAsUnread, sendCalendarReply, setKeywordsOnMany } from "@/lib/jmap";
import { parseIcs, buildCalendarReply } from "@/lib/ics";
import { log } from "@/lib/logger";

async function requireAuthedJmap() {
  const sessionData = await auth();
  if (!sessionData?.user) throw new Error("Unauthorized");
  const session = await getSession();
  return { session, accountId: getAccountId(session) };
}

export async function markEmailAsRead(emailId: string): Promise<void> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  await markAsRead(session.apiUrl, accountId, emailId);
  log.info({ email_id: emailId, duration_ms: Date.now() - t }, "action.mark_read");
}

export async function markEmailAsUnread(emailId: string): Promise<void> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  await markAsUnread(session.apiUrl, accountId, emailId);
  log.info({ email_id: emailId, duration_ms: Date.now() - t }, "action.mark_unread");
}

export async function sendCalendarReplyAction(
  icsText: string,
  response: "ACCEPTED" | "DECLINED" | "TENTATIVE",
  emailId: string,
  inReplyToMessageId?: string
): Promise<void> {
  const t = Date.now();
  const { session, accountId } = await requireAuthedJmap();
  const [identities, mailboxes] = await Promise.all([
    getIdentities(session.apiUrl, accountId),
    getMailboxes(session.apiUrl, accountId),
  ]);
  const identity = identities[0];
  if (!identity) throw new Error("No identity found");
  const sentMailboxId = mailboxes.find((m) => m.role === "sent")?.id;

  const event = parseIcs(icsText);
  if (!event) throw new Error("Could not parse calendar event");

  const replyIcs = buildCalendarReply(event, identity.email, identity.name, response);

  const label =
    response === "ACCEPTED" ? "Accepted" :
    response === "DECLINED" ? "Declined" : "Tentatively Accepted";

  const subject = `${label}: ${event.summary}`;
  const textBody =
    response === "ACCEPTED"
      ? `I have accepted the invitation to "${event.summary}".`
      : response === "DECLINED"
      ? `I have declined the invitation to "${event.summary}".`
      : `I have tentatively accepted the invitation to "${event.summary}".`;

  const to = event.organizer ?? { name: null, email: identity.email };

  await sendCalendarReply(
    session.apiUrl,
    session.uploadUrl,
    accountId,
    identity.id,
    { name: identity.name, email: identity.email },
    to,
    subject,
    textBody,
    replyIcs,
    inReplyToMessageId,
    sentMailboxId
  );

  // Persist the RSVP choice as a keyword on the invitation email so the
  // response survives page navigation and re-loads.
  await setKeywordsOnMany(session.apiUrl, accountId, [emailId], {
    "keywords/$rsvp_accepted": response === "ACCEPTED" ? true : null,
    "keywords/$rsvp_tentative": response === "TENTATIVE" ? true : null,
    "keywords/$rsvp_declined": response === "DECLINED" ? true : null,
  });

  log.info({
    response,
    has_organizer: !!event.organizer?.email,
    has_in_reply_to_message_id: !!inReplyToMessageId,
    duration_ms: Date.now() - t,
  }, "action.calendar_reply");
}
