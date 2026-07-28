export interface CalendarEventData {
  uid: string;
  emailId: string;
  threadId: string;
  receivedAt: string;
  emailSubject: string | null;
  preview: string;
  icsText: string;
  method: string;
  summary: string;
  dtStart: string | null;
  dtEnd: string | null;
  allDay: boolean;
  location: string | null;
  organizerName: string | null;
  organizerEmail: string | null;
  myCurrentPartstat: string | null;
  inReplyToMessageId?: string;
  recurrenceRule: string | null;
  recurrenceDates: string[];
  excludedDates: string[];
  recurrenceId: string | null;
  recurrenceTimeZone: string | null;
  status: string | null;
  sequence: number;
  occurrenceId?: string;
}
