import Link from "next/link";
import MobileBackButton from "@/components/MobileBackButton";
import { CalendarEventData } from "@/components/CalendarEventCard";
import CalendarEventLink from "@/components/CalendarEventLink";
import MobileCalendarAgenda from "@/components/MobileCalendarAgenda";
import { resolveCalendarEvent } from "@/lib/calendarDetect";
import { addMonths, buildCalendarEntries, buildMonthDays, filterEventsForMonth, monthTitle, normalizeMonthKey } from "@/lib/calendarView";
import { listRecentCalendarCandidateEmails } from "@/lib/jmap";
import { getJmapMailboxContext } from "@/lib/jmapServer";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface Props {
  searchParams: Promise<{ month?: string }>;
}

export default async function CalendarPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const monthKey = normalizeMonthKey(month);
  const currentMonthKey = normalizeMonthKey(undefined);

  const { session, accountId, mailboxes } = await getJmapMailboxContext();

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
              {monthEntries.length === 0
                ? "No meetings found in invite emails this month."
                : `${monthEntries.length} meeting${monthEntries.length === 1 ? "" : "s"} from calendar invite emails.`}
            </p>
          </div>

          <div className="flex w-full items-center gap-2 md:w-auto">
            {monthKey !== currentMonthKey && (
              <Link
                href={`/calendar?month=${currentMonthKey}`}
                className="inline-flex min-h-10 items-center rounded-md border border-stone-200 px-3 text-xs text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
              >
                Today
              </Link>
            )}
            <Link
              href={`/calendar?month=${addMonths(monthKey, -1)}`}
              aria-label="Previous month"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-stone-200 px-2 text-xs text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 sm:px-3"
            >
              <span aria-hidden="true">←</span>
              <span className="ml-1 hidden sm:inline">Previous</span>
            </Link>
            <h2 className="min-w-0 flex-1 text-center text-sm font-medium text-stone-800 dark:text-stone-200 md:min-w-40">
              {monthTitle(monthKey)}
            </h2>
            <Link
              href={`/calendar?month=${addMonths(monthKey, 1)}`}
              aria-label="Next month"
              className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-md border border-stone-200 px-2 text-xs text-stone-600 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:border-stone-700 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100 sm:px-3"
            >
              <span className="mr-1 hidden sm:inline">Next</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>

        <MobileCalendarAgenda monthKey={monthKey} entries={monthEntries} />

        <div
          className="hidden overflow-hidden rounded-xl border border-stone-200 bg-stone-200 dark:border-stone-700 dark:bg-stone-700 md:block"
          aria-label={`${monthTitle(monthKey)} calendar`}
        >
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
                      <time
                        dateTime={day.key}
                        aria-current={day.isToday ? "date" : undefined}
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
                      </time>
                    </div>
                    <div className="space-y-1.5">
                      {day.events.map((event) => (
                        <CalendarEventLink key={`${event.uid}-${event.emailId}`} event={event} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
      </div>
    </div>
  );
}
