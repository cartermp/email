import type { CalendarEventData } from "./calendar";
import { convertWallClockToUtc } from "./ics";

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

interface RecurrenceRule {
  frequency: string;
  interval: number;
  count: number | null;
  until: Date | null;
  byDay: Array<{ ordinal: number | null; weekday: number }>;
  byMonthDay: number[];
  byMonth: number[];
  weekStart: number;
}

interface WallClock {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

const WEEKDAYS: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

function newerEvent(
  existing: CalendarEventData | undefined,
  candidate: CalendarEventData
): CalendarEventData {
  if (!existing) return candidate;
  if (candidate.receivedAt !== existing.receivedAt) {
    return candidate.receivedAt > existing.receivedAt ? candidate : existing;
  }
  return candidate.sequence >= existing.sequence ? candidate : existing;
}

function isCancelled(event: CalendarEventData): boolean {
  return event.method.toUpperCase() === "CANCEL" || event.status === "CANCELLED";
}

function parseRuleDate(value: string, timeZone: string | null): Date | null {
  const match = value.match(
    /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z?))?$/
  );
  if (!match) return null;
  const [, year, month, day, hour = "23", minute = "59", second = "59", utc] = match;
  if (utc === "Z") {
    return new Date(Date.UTC(+year, +month - 1, +day, +hour, +minute, +second));
  }
  if (timeZone) {
    return convertWallClockToUtc(
      +year,
      +month,
      +day,
      +hour,
      +minute,
      +second,
      timeZone
    );
  }
  return new Date(+year, +month - 1, +day, +hour, +minute, +second);
}

function parseRecurrenceRule(
  raw: string,
  timeZone: string | null
): RecurrenceRule | null {
  const values = new Map(
    raw.split(";").flatMap((part) => {
      const separator = part.indexOf("=");
      return separator === -1
        ? []
        : [[part.slice(0, separator).toUpperCase(), part.slice(separator + 1)] as const];
    })
  );
  const frequency = values.get("FREQ")?.toUpperCase();
  if (!frequency) return null;

  const numericList = (key: string) => {
    const raw = values.get(key);
    if (!raw) return [];
    return raw
      .split(",")
      .map(Number)
      .filter(Number.isInteger);
  };
  const byDay = (values.get("BYDAY") ?? "").split(",").flatMap((entry) => {
    const match = entry.toUpperCase().match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/);
    return match
      ? [{ ordinal: match[1] ? Number(match[1]) : null, weekday: WEEKDAYS[match[2]] }]
      : [];
  });

  return {
    frequency,
    interval: Math.max(1, Number(values.get("INTERVAL")) || 1),
    count: values.has("COUNT") ? Math.max(0, Number(values.get("COUNT")) || 0) : null,
    until: values.has("UNTIL") ? parseRuleDate(values.get("UNTIL")!, timeZone) : null,
    byDay,
    byMonthDay: numericList("BYMONTHDAY"),
    byMonth: numericList("BYMONTH"),
    weekStart: WEEKDAYS[values.get("WKST")?.toUpperCase() ?? "MO"] ?? 1,
  };
}

function wallClockFor(date: Date, timeZone: string | null): WallClock {
  if (!timeZone) {
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
      weekday: date.getDay(),
    };
  }

  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    weekday: "short",
  });
  const values = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value])
  );
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
    weekday: WEEKDAYS[values.weekday.slice(0, 2).toUpperCase()],
  };
}

function instantForWallClock(
  wall: WallClock,
  timeZone: string | null,
  allDay: boolean
): Date | null {
  if (allDay || !timeZone) {
    return new Date(
      wall.year,
      wall.month - 1,
      wall.day,
      wall.hour,
      wall.minute,
      wall.second
    );
  }
  if (timeZone === "UTC") {
    return new Date(
      Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute, wall.second)
    );
  }
  return convertWallClockToUtc(
    wall.year,
    wall.month,
    wall.day,
    wall.hour,
    wall.minute,
    wall.second,
    timeZone
  );
}

function dateSerial(wall: Pick<WallClock, "year" | "month" | "day">): number {
  return Date.UTC(wall.year, wall.month - 1, wall.day) / 86_400_000;
}

function monthDifference(start: WallClock, candidate: WallClock): number {
  return (candidate.year - start.year) * 12 + candidate.month - start.month;
}

function matchesMonthDay(rule: RecurrenceRule, wall: WallClock): boolean {
  if (rule.byMonthDay.length === 0) return true;
  const daysInMonth = new Date(Date.UTC(wall.year, wall.month, 0)).getUTCDate();
  return rule.byMonthDay.some((day) => (
    day > 0 ? wall.day === day : wall.day === daysInMonth + day + 1
  ));
}

function matchesByDay(rule: RecurrenceRule, wall: WallClock): boolean {
  if (rule.byDay.length === 0) return true;
  return rule.byDay.some(({ ordinal, weekday }) => {
    if (wall.weekday !== weekday) return false;
    if (ordinal === null) return true;
    const daysInMonth = new Date(Date.UTC(wall.year, wall.month, 0)).getUTCDate();
    const occurrence =
      ordinal > 0
        ? Math.floor((wall.day - 1) / 7) + 1
        : -(Math.floor((daysInMonth - wall.day) / 7) + 1);
    return occurrence === ordinal;
  });
}

function matchesRule(
  rule: RecurrenceRule,
  start: WallClock,
  candidate: WallClock
): boolean {
  const elapsedDays = dateSerial(candidate) - dateSerial(start);
  if (elapsedDays < 0) return false;
  if (rule.byMonth.length > 0 && !rule.byMonth.includes(candidate.month)) return false;
  if (!matchesMonthDay(rule, candidate) || !matchesByDay(rule, candidate)) return false;

  switch (rule.frequency) {
    case "DAILY":
      return elapsedDays % rule.interval === 0;
    case "WEEKLY": {
      const startWeek = dateSerial(start) - ((start.weekday - rule.weekStart + 7) % 7);
      const candidateWeek =
        dateSerial(candidate) - ((candidate.weekday - rule.weekStart + 7) % 7);
      const allowedDay =
        rule.byDay.length > 0
          ? rule.byDay.some(({ weekday }) => weekday === candidate.weekday)
          : candidate.weekday === start.weekday;
      return allowedDay && (candidateWeek - startWeek) / 7 % rule.interval === 0;
    }
    case "MONTHLY":
      return (
        monthDifference(start, candidate) % rule.interval === 0 &&
        (rule.byMonthDay.length > 0 || rule.byDay.length > 0 || candidate.day === start.day)
      );
    case "YEARLY":
      return (
        (candidate.year - start.year) % rule.interval === 0 &&
        (rule.byMonth.length > 0 || candidate.month === start.month) &&
        (rule.byMonthDay.length > 0 || rule.byDay.length > 0 || candidate.day === start.day)
      );
    default:
      return elapsedDays === 0;
  }
}

function expandRule(
  event: CalendarEventData,
  monthKey: string
): Date[] {
  if (!event.dtStart || !event.recurrenceRule) return [];
  const startDate = new Date(event.dtStart);
  const timeZone = event.recurrenceTimeZone;
  const startWall = wallClockFor(startDate, timeZone);
  const rule = parseRecurrenceRule(event.recurrenceRule, timeZone);
  if (!rule || rule.count === 0) return [];

  const [targetYear, targetMonth] = monthKey.split("-").map(Number);
  const scanEndSerial = Date.UTC(targetYear, targetMonth, 2) / 86_400_000;
  const startSerial = dateSerial(startWall);
  const occurrences: Date[] = [];
  let ruleOccurrenceCount = 0;

  for (let serial = startSerial; serial <= scanEndSerial; serial += 1) {
    const date = new Date(serial * 86_400_000);
    const wall: WallClock = {
      ...startWall,
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      weekday: date.getUTCDay(),
    };
    const isStart = serial === startSerial;
    if (!isStart && !matchesRule(rule, startWall, wall)) continue;

    const instant = instantForWallClock(wall, timeZone, event.allDay);
    if (!instant || (rule.until && instant > rule.until)) break;
    ruleOccurrenceCount += 1;
    if (rule.count !== null && ruleOccurrenceCount > rule.count) break;
    if (dayKeyFor(instant).startsWith(monthKey)) occurrences.push(instant);
  }

  return occurrences;
}

function occurrenceFrom(
  master: CalendarEventData,
  start: Date,
  occurrenceId = start.toISOString()
): CalendarEventData {
  const duration =
    master.dtStart && master.dtEnd
      ? new Date(master.dtEnd).getTime() - new Date(master.dtStart).getTime()
      : null;
  return {
    ...master,
    dtStart: start.toISOString(),
    dtEnd: duration === null ? null : new Date(start.getTime() + duration).toISOString(),
    occurrenceId,
  };
}

function applyException(
  masterOccurrence: CalendarEventData,
  exception: CalendarEventData
): CalendarEventData {
  const duration =
    masterOccurrence.dtStart && masterOccurrence.dtEnd
      ? new Date(masterOccurrence.dtEnd).getTime() -
        new Date(masterOccurrence.dtStart).getTime()
      : null;
  const dtStart = exception.dtStart ?? masterOccurrence.dtStart;
  return {
    ...masterOccurrence,
    ...exception,
    summary: exception.summary || masterOccurrence.summary,
    location: exception.location ?? masterOccurrence.location,
    organizerName: exception.organizerName ?? masterOccurrence.organizerName,
    organizerEmail: exception.organizerEmail ?? masterOccurrence.organizerEmail,
    myCurrentPartstat:
      exception.myCurrentPartstat ?? masterOccurrence.myCurrentPartstat,
    dtStart,
    dtEnd:
      exception.dtEnd ??
      (duration !== null && dtStart
        ? new Date(new Date(dtStart).getTime() + duration).toISOString()
        : null),
    occurrenceId: masterOccurrence.occurrenceId,
  };
}

export function buildCalendarEntries(
  events: CalendarEventData[],
  monthKey?: string
): CalendarEventData[] {
  const masters = new Map<string, CalendarEventData>();
  const exceptions = new Map<string, CalendarEventData>();

  for (const event of events) {
    if (event.method.toUpperCase() === "REPLY") continue;
    const uid = event.uid || event.emailId;
    if (event.recurrenceId) {
      const key = `${uid}\u0000${event.recurrenceId}`;
      exceptions.set(key, newerEvent(exceptions.get(key), event));
    } else {
      masters.set(uid, newerEvent(masters.get(uid), event));
    }
  }

  const entries: CalendarEventData[] = [];
  for (const [uid, master] of masters) {
    if (!master.dtStart || isCancelled(master)) continue;
    const isRecurring =
      Boolean(master.recurrenceRule) || master.recurrenceDates.length > 0;
    if (!isRecurring || !monthKey) {
      entries.push(master);
      continue;
    }

    const starts = new Map<string, Date>();
    for (const start of expandRule(master, monthKey)) {
      starts.set(start.toISOString(), start);
    }
    starts.set(master.dtStart, new Date(master.dtStart));
    for (const rawStart of master.recurrenceDates) {
      starts.set(rawStart, new Date(rawStart));
    }
    for (const rawStart of master.excludedDates) {
      starts.delete(rawStart);
    }

    for (const [occurrenceId, start] of starts) {
      let occurrence = occurrenceFrom(master, start, occurrenceId);
      const exception = exceptions.get(`${uid}\u0000${occurrenceId}`);
      if (exception) {
        if (isCancelled(exception)) continue;
        occurrence = applyException(occurrence, exception);
      }
      if (occurrence.dtStart && dayKeyFor(new Date(occurrence.dtStart)).startsWith(monthKey)) {
        entries.push(occurrence);
      }
    }

    for (const [key, exception] of exceptions) {
      if (!key.startsWith(`${uid}\u0000`) || !exception.recurrenceId) continue;
      if (starts.has(exception.recurrenceId) || isCancelled(exception)) continue;
      const original = occurrenceFrom(
        master,
        new Date(exception.recurrenceId),
        exception.recurrenceId
      );
      const occurrence = applyException(original, exception);
      if (occurrence.dtStart && dayKeyFor(new Date(occurrence.dtStart)).startsWith(monthKey)) {
        entries.push(occurrence);
      }
    }
  }

  return entries.sort((a, b) => {
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
