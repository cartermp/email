"use client";

import Link from "next/link";
import { CalendarEventData } from "@/components/CalendarEventCard";
import { formatEventTime } from "@/lib/calendarView";

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

interface Props {
  event: CalendarEventData;
}

export default function CalendarEventLink({ event }: Props) {
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
