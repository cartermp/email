"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarEventData } from "@/components/CalendarEventCard";
import CalendarEventLink from "@/components/CalendarEventLink";
import { buildMonthDays } from "@/lib/calendarView";

const SWIPE_THRESHOLD_PX = 50;

interface Props {
  monthKey: string;
  entries: CalendarEventData[];
}

function initialIndexForMonth(days: ReturnType<typeof buildMonthDays>) {
  const inMonthDays = days.filter((day) => day.inMonth);
  const todayIndex = inMonthDays.findIndex((day) => day.isToday);
  return todayIndex >= 0 ? todayIndex : 0;
}

export default function MobileCalendarAgenda({ monthKey, entries }: Props) {
  const days = useMemo(
    () => buildMonthDays(monthKey, entries).filter((day) => day.inMonth),
    [monthKey, entries]
  );
  const [selectedIndex, setSelectedIndex] = useState(() => initialIndexForMonth(buildMonthDays(monthKey, entries)));
  const touchStartYRef = useRef<number | null>(null);
  const touchStartXRef = useRef<number | null>(null);

  useEffect(() => {
    setSelectedIndex(initialIndexForMonth(buildMonthDays(monthKey, entries)));
  }, [monthKey, entries]);

  const selectedDay = days[selectedIndex] ?? days[0];

  function moveDay(delta: number) {
    setSelectedIndex((current) => {
      const next = current + delta;
      if (next < 0 || next >= days.length) return current;
      return next;
    });
  }

  if (!selectedDay) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-700 px-6 py-10 text-center text-sm text-stone-500 dark:text-stone-400">
        No days available for this month.
      </div>
    );
  }

  const dayTitle = selectedDay.date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <section
      className="md:hidden rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 overflow-hidden"
      onTouchStart={(event) => {
        const touch = event.changedTouches[0];
        touchStartYRef.current = touch.clientY;
        touchStartXRef.current = touch.clientX;
      }}
      onTouchEnd={(event) => {
        if (touchStartYRef.current === null || touchStartXRef.current === null) return;
        const touch = event.changedTouches[0];
        const deltaY = touch.clientY - touchStartYRef.current;
        const deltaX = touch.clientX - touchStartXRef.current;
        touchStartYRef.current = null;
        touchStartXRef.current = null;

        if (Math.abs(deltaY) < SWIPE_THRESHOLD_PX || Math.abs(deltaY) <= Math.abs(deltaX)) {
          return;
        }

        if (deltaY < 0) moveDay(1);
        else moveDay(-1);
      }}
    >
      <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-700/60">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {dayTitle}
            </h2>
            <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
              {selectedDay.events.length === 0
                ? "No meetings on this day"
                : `${selectedDay.events.length} meeting${selectedDay.events.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {selectedDay.isToday && (
            <span className="shrink-0 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-white">
              Today
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] text-stone-400 dark:text-stone-500">
          Swipe up for next day, down for previous day.
        </p>
      </div>

      <div className="p-3 space-y-2">
        {selectedDay.events.length === 0 ? (
          <div className="rounded-md border border-dashed border-stone-200 dark:border-stone-700 px-4 py-6 text-center text-sm text-stone-400 dark:text-stone-500">
            Nothing scheduled from invite emails.
          </div>
        ) : (
          selectedDay.events.map((event) => (
            <CalendarEventLink key={`${event.uid}-${event.emailId}`} event={event} />
          ))
        )}
      </div>

      <div className="flex items-center justify-between border-t border-stone-100 dark:border-stone-700/60 px-3 py-2">
        <button
          type="button"
          onClick={() => moveDay(-1)}
          disabled={selectedIndex === 0}
          className="rounded-md border border-stone-200 dark:border-stone-700 px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 disabled:opacity-40"
        >
          Previous day
        </button>
        <span className="text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
          {selectedIndex + 1} / {days.length}
        </span>
        <button
          type="button"
          onClick={() => moveDay(1)}
          disabled={selectedIndex === days.length - 1}
          className="rounded-md border border-stone-200 dark:border-stone-700 px-3 py-1.5 text-xs text-stone-600 dark:text-stone-400 disabled:opacity-40"
        >
          Next day
        </button>
      </div>
    </section>
  );
}
