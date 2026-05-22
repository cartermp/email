import { CalendarEventData } from "@/components/CalendarEventCard";

export interface CalendarMonthDay {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
  events: CalendarEventData[];
}

function monthKeyFor(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function dayKeyFor(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function normalizeMonthKey(raw: string | undefined, now = new Date()): string {
  return /^\d{4}-\d{2}$/.test(raw ?? "") ? raw! : monthKeyFor(now);
}

export function addMonths(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return monthKeyFor(date);
}

export function monthTitle(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function formatEventTime(event: CalendarEventData): string {
  if (!event.dtStart) return "Time unknown";
  if (event.allDay) return "All day";
  return new Date(event.dtStart).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function buildCalendarEntries(events: CalendarEventData[]): CalendarEventData[] {
  const deduped = new Map<string, CalendarEventData>();

  for (const event of events) {
    if (!event.dtStart) continue;
    if (event.method === "REPLY") continue;

    const key = event.uid || event.emailId;
    const existing = deduped.get(key);
    if (!existing || event.receivedAt > existing.receivedAt) {
      deduped.set(key, event);
    }
  }

  return [...deduped.values()].sort((a, b) => {
    const aStart = a.dtStart ?? "";
    const bStart = b.dtStart ?? "";
    if (aStart !== bStart) return aStart.localeCompare(bStart);
    if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
    return a.summary.localeCompare(b.summary);
  });
}

export function filterEventsForMonth(
  entries: CalendarEventData[],
  monthKey: string
): CalendarEventData[] {
  return entries.filter((entry) => {
    if (!entry.dtStart) return false;
    return dayKeyFor(new Date(entry.dtStart)).startsWith(monthKey);
  });
}

export function groupEventsByDay(
  entries: CalendarEventData[]
): Array<{ key: string; date: Date; events: CalendarEventData[] }> {
  const groups = new Map<string, { date: Date; events: CalendarEventData[] }>();

  for (const event of entries) {
    if (!event.dtStart) continue;
    const date = new Date(event.dtStart);
    const key = dayKeyFor(date);
    if (!groups.has(key)) groups.set(key, { date, events: [] });
    groups.get(key)!.events.push(event);
  }

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => ({ key, date: value.date, events: value.events }));
}

export function buildMonthDays(
  monthKey: string,
  entries: CalendarEventData[],
  now = new Date()
): CalendarMonthDay[] {
  const [year, month] = monthKey.split("-").map(Number);
  const monthStart = new Date(year, month - 1, 1);
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - monthStart.getDay());

  const todayKey = dayKeyFor(now);
  const eventsByDay = new Map<string, CalendarEventData[]>();

  for (const entry of entries) {
    if (!entry.dtStart) continue;
    const key = dayKeyFor(new Date(entry.dtStart));
    const existing = eventsByDay.get(key) ?? [];
    existing.push(entry);
    eventsByDay.set(key, existing);
  }

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const key = dayKeyFor(date);
    return {
      date,
      key,
      inMonth: date.getMonth() === monthStart.getMonth(),
      isToday: key === todayKey,
      events: eventsByDay.get(key) ?? [],
    };
  });
}
