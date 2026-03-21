"use server";

import { getSession, getAccountId, getIdentities, markAsRead, markAsUnread, sendCalendarReply } from "@/lib/jmap";
import { parseIcs, buildCalendarReply } from "@/lib/ics";

export async function markEmailAsRead(emailId: string): Promise<void> {
  const session = await getSession();
  const accountId = getAccountId(session);
  await markAsRead(session.apiUrl, accountId, emailId);
}

export async function markEmailAsUnread(emailId: string): Promise<void> {
  const session = await getSession();
  const accountId = getAccountId(session);
  await markAsUnread(session.apiUrl, accountId, emailId);
}

export async function sendCalendarReplyAction(
  icsText: string,
  response: "ACCEPTED" | "DECLINED" | "TENTATIVE",
  inReplyToMessageId?: string
): Promise<void> {
  const session = await getSession();
  const accountId = getAccountId(session);
  const identities = await getIdentities(session.apiUrl, accountId);
  const identity = identities[0];
  if (!identity) throw new Error("No identity found");

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
    inReplyToMessageId
  );
}
