"use client";

import { useEffect, useMemo, useRef } from "react";
import { CalendarEventData } from "@/components/CalendarEventCard";
import CalendarEventLink from "@/components/CalendarEventLink";
import { buildMonthDays } from "@/lib/calendarView";

interface Props {
  monthKey: string;
  entries: CalendarEventData[];
}

export default function MobileCalendarAgenda({ monthKey, entries }: Props) {
  const days = useMemo(
    () => buildMonthDays(monthKey, entries).filter((day) => day.inMonth),
    [monthKey, entries]
  );
  const todaySectionRef = useRef<HTMLElement | null>(null);
  const scrolledMonthRef = useRef<string | null>(null);

  useEffect(() => {
    if (!todaySectionRef.current) return;
    if (scrolledMonthRef.current === monthKey) return;
    scrolledMonthRef.current = monthKey;
    todaySectionRef.current.scrollIntoView({ block: "start" });
  }, [monthKey]);

  return (
    <div className="md:hidden space-y-4">
      {days.map((day) => {
        const dayTitle = day.date.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        });

        return (
          <section
            key={day.key}
            ref={day.isToday ? todaySectionRef : undefined}
            className={[
              "rounded-xl border bg-white dark:bg-stone-800/50 overflow-hidden",
              day.isToday
                ? "border-blue-300 dark:border-blue-700"
                : "border-stone-200 dark:border-stone-700",
            ].join(" ")}
          >
            <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700/60">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                    {dayTitle}
                  </h2>
                  <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                    {day.events.length === 0
                      ? "No meetings"
                      : `${day.events.length} meeting${day.events.length === 1 ? "" : "s"}`}
                  </p>
                </div>
                {day.isToday && (
                  <span className="shrink-0 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
                    Today
                  </span>
                )}
              </div>
            </div>

            <div className="p-3 space-y-2">
              {day.events.length === 0 ? (
                <div className="rounded-md border border-dashed border-stone-200 dark:border-stone-700 px-4 py-4 text-center text-sm text-stone-400 dark:text-stone-500">
                  Nothing scheduled from invite emails.
                </div>
              ) : (
                day.events.map((event) => (
                  <CalendarEventLink key={`${event.uid}-${event.emailId}`} event={event} />
                ))
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
