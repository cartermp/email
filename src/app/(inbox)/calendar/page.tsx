import Link from "next/link";
import MobileBackButton from "@/components/MobileBackButton";
import { CalendarEventData } from "@/components/CalendarEventCard";
import { resolveCalendarEvent } from "@/lib/calendarDetect";
import { addMonths, buildCalendarEntries, buildMonthDays, filterEventsForMonth, formatEventTime, groupEventsByDay, monthTitle, normalizeMonthKey } from "@/lib/calendarView";
import { getAccountId, getMailboxes, getSession, listRecentCalendarCandidateEmails } from "@/lib/jmap";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface Props {
  searchParams: Promise<{ month?: string }>;
}

function eventClasses(event: CalendarEventData): string {
  if (event.method === "CANCEL") {
    return "border-red-200 bg-red-50/80 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300";
  }
  switch (event.myCurrentPartstat) {
    case "ACCEPTED":
      return "border-green-200 bg-green-50/80 text-green-700 dark:border-green-900/60 dark:bg-green-950/30 dark:text-green-300";
    case "TENTATIVE":
      return "border-amber-200 bg-amber-50/80 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300";
    case "DECLINED":
      return "border-stone-200 bg-stone-100/90 text-stone-500 dark:border-stone-700 dark:bg-stone-800/80 dark:text-stone-400";
    default:
      return "border-blue-200 bg-blue-50/80 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-300";
  }
}

function statusLabel(event: CalendarEventData): string | null {
  if (event.method === "CANCEL") return "Cancelled";
  switch (event.myCurrentPartstat) {
    case "ACCEPTED":
      return "Accepted";
    case "TENTATIVE":
      return "Maybe";
    case "DECLINED":
      return "Declined";
    default:
      return null;
  }
}

function EventLink({ event }: { event: CalendarEventData }) {
  const status = statusLabel(event);
  return (
    <Link
      href={`/email/${event.emailId}`}
      className={[
        "block rounded-md border px-2 py-1.5 transition-colors hover:border-stone-300 hover:bg-white dark:hover:border-stone-500 dark:hover:bg-stone-900/70",
        eventClasses(event),
      ].join(" ")}
      title={`${formatEventTime(event)} — ${event.summary}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-medium tabular-nums">
          {formatEventTime(event)}
        </span>
        {status && (
          <span className="text-[10px] uppercase tracking-wide opacity-80">
            {status}
          </span>
        )}
      </div>
      <p className={["mt-1 text-xs leading-snug", event.method === "CANCEL" ? "line-through" : ""].join(" ")}>
        {event.summary || event.emailSubject || "(no title)"}
      </p>
      {event.location && (
        <p className="mt-1 text-[11px] opacity-80 truncate">
          {event.location}
        </p>
      )}
    </Link>
  );
}

export default async function CalendarPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const monthKey = normalizeMonthKey(month);

  const session = await getSession();
  const accountId = getAccountId(session);
  const mailboxes = await getMailboxes(session.apiUrl, accountId);

  const excludedMailboxIds = new Set(
    mailboxes
      .filter((mailbox) => mailbox.role === "drafts" || mailbox.role === "sent" || mailbox.role === "trash")
      .map((mailbox) => mailbox.id)
  );

  const recentEmails = await listRecentCalendarCandidateEmails(session.apiUrl, accountId);
  const inviteEmails = recentEmails.filter((email) => {
    const mailboxIds = Object.keys(email.mailboxIds ?? {});
    if (mailboxIds.some((mailboxId) => excludedMailboxIds.has(mailboxId))) {
      return false;
    }

    return (
      email.textBody?.some((part) => part.type === "text/calendar") ||
      email.attachments?.some((part) => part.type === "text/calendar")
    );
  });

  const resolvedEvents = (await Promise.all(
    inviteEmails.map((email) =>
      resolveCalendarEvent(email, session.downloadUrl, accountId)
    )
  )).filter((event): event is CalendarEventData => event !== null);

  const entries = buildCalendarEntries(resolvedEvents);
  const monthEntries = filterEventsForMonth(entries, monthKey);
  const monthDays = buildMonthDays(monthKey, monthEntries);
  const groupedDays = groupEventsByDay(monthEntries);

  return (
    <div className="overflow-y-auto h-full bg-stone-50 dark:bg-stone-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8">
        <MobileBackButton label="Inbox" />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
              Calendar
            </h1>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Meetings parsed from recent calendar invite emails.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/calendar?month=${addMonths(monthKey, -1)}`}
              className="px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Prev
            </Link>
            <div className="min-w-40 text-center text-sm font-medium text-stone-800 dark:text-stone-200">
              {monthTitle(monthKey)}
            </div>
            <Link
              href={`/calendar?month=${addMonths(monthKey, 1)}`}
              className="px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-xs text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Next
            </Link>
          </div>
        </div>

        {monthEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-700 px-6 py-10 text-center text-sm text-stone-500 dark:text-stone-400">
            No meetings found for {monthTitle(monthKey)}.
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-4">
              {groupedDays.map(({ key, date, events }) => (
                <section key={key} className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700/60">
                    <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                      {date.toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </h2>
                  </div>
                  <div className="p-3 space-y-2">
                    {events.map((event) => (
                      <EventLink key={`${event.uid}-${event.emailId}`} event={event} />
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <div className="hidden md:block rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 bg-stone-200 dark:bg-stone-700">
              <div className="grid grid-cols-7">
                {DAY_LABELS.map((label) => (
                  <div
                    key={label}
                    className="bg-stone-100 dark:bg-stone-800 px-3 py-2 text-xs font-medium uppercase tracking-wide text-stone-500 dark:text-stone-400 border-b border-stone-200 dark:border-stone-700"
                  >
                    {label}
                  </div>
                ))}

                {monthDays.map((day) => (
                  <div
                    key={day.key}
                    className={[
                      "min-h-40 bg-white dark:bg-stone-900/70 p-2 border-b border-r border-stone-200 dark:border-stone-700",
                      day.inMonth ? "" : "bg-stone-50/70 dark:bg-stone-900/30",
                    ].join(" ")}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span
                        className={[
                          "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium",
                          day.isToday
                            ? "bg-blue-600 text-white"
                            : day.inMonth
                              ? "text-stone-700 dark:text-stone-200"
                              : "text-stone-400 dark:text-stone-500",
                        ].join(" ")}
                      >
                        {day.date.getDate()}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {day.events.map((event) => (
                        <EventLink key={`${event.uid}-${event.emailId}`} event={event} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
