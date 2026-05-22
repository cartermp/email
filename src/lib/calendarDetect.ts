import { Email, EmailBodyPart } from "./types";
import { downloadBlobAsText } from "./jmap";
import { parseIcs } from "./ics";
import { CalendarEventData } from "@/components/CalendarEventCard";

type CalendarSourceEmail = Pick<
  Email,
  "id" | "messageId" | "threadId" | "subject" | "preview" | "to" | "cc" | "receivedAt" | "keywords"
> & {
  textBody?: EmailBodyPart[];
  attachments?: EmailBodyPart[];
  bodyValues?: Email["bodyValues"];
};

/**
 * Given an email object (with bodyValues already fetched), detect and parse
 * any attached or inline calendar invite. Returns null if none found.
 *
 * Matches the attendee against all recipient addresses (to + cc) so that
 * calendar events forwarded or CC'd still resolve the user's PARTSTAT.
 */
export async function resolveCalendarEvent(
  email: CalendarSourceEmail,
  downloadUrl: string,
  accountId: string
): Promise<CalendarEventData | null> {
  const inlineCalPart = email.textBody?.find((p) => p.type === "text/calendar");
  const attachedCalPart = email.attachments?.find((p) => p.type === "text/calendar");
  const calPart = inlineCalPart ?? attachedCalPart;
  if (!calPart) return null;

  try {
    let icsText: string | null = null;

    if (calPart.partId && email.bodyValues?.[calPart.partId]) {
      icsText = email.bodyValues[calPart.partId].value;
    } else if (calPart.blobId) {
      icsText = await downloadBlobAsText(
        downloadUrl,
        accountId,
        calPart.blobId,
        calPart.name ?? "invite.ics"
      );
    }

    if (!icsText) return null;

    const event = parseIcs(icsText);
    if (!event) return null;

    // Match against to + cc so forwarded / CC'd invites resolve correctly.
    const recipientEmails = new Set([
      ...(email.to ?? []).map((a) => a.email.toLowerCase()),
      ...(email.cc ?? []).map((a) => a.email.toLowerCase()),
    ]);
    const organizerEmail = event.organizer?.email.toLowerCase();
    const myAttendee = event.attendees.find((a) => {
      const ae = a.email.toLowerCase();
      return recipientEmails.has(ae) && ae !== organizerEmail;
    });

    // Prefer a keyword-persisted RSVP response (set when the user responds via
    // this client) over the raw ICS PARTSTAT, which is often stale (NEEDS-ACTION)
    // even after the user has already responded.
    const keywordPartstat =
      email.keywords?.["$rsvp_accepted"] ? "ACCEPTED" :
      email.keywords?.["$rsvp_tentative"] ? "TENTATIVE" :
      email.keywords?.["$rsvp_declined"] ? "DECLINED" :
      null;

    return {
      uid: event.uid || email.id,
      emailId: email.id,
      threadId: email.threadId,
      receivedAt: email.receivedAt,
      emailSubject: email.subject,
      preview: email.preview,
      icsText,
      method: event.method,
      summary: event.summary,
      dtStart: event.dtStart?.toISOString() ?? null,
      dtEnd: event.dtEnd?.toISOString() ?? null,
      allDay: event.allDay,
      location: event.location,
      organizerName: event.organizer?.name ?? null,
      organizerEmail: event.organizer?.email ?? null,
      myCurrentPartstat: keywordPartstat ?? myAttendee?.partstat ?? null,
      inReplyToMessageId: email.messageId?.[0],
    };
  } catch {
    return null;
  }
}
