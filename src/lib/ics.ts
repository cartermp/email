export interface CalendarAttendee {
  name: string | null;
  email: string;
  partstat: string; // NEEDS-ACTION | ACCEPTED | DECLINED | TENTATIVE
  rsvp: boolean;
}

export interface CalendarEvent {
  uid: string;
  method: string; // REQUEST | CANCEL | REPLY
  summary: string;
  dtStart: Date | null;
  dtEnd: Date | null;
  allDay: boolean;
  location: string | null;
  description: string | null;
  organizer: { name: string | null; email: string } | null;
  attendees: CalendarAttendee[];
  recurrenceRule: string | null;
  recurrenceDates: Date[];
  excludedDates: Date[];
  recurrenceId: Date | null;
  recurrenceTimeZone: string | null;
  status: string | null;
  sequence: number;
}

// ────────────────────────────────────────────────────────────────
// Parsing
// ────────────────────────────────────────────────────────────────

function unfoldAndSplit(text: string): string[] {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\n[ \t]/g, "") // RFC 5545 line unfolding
    .split("\n")
    .filter((l) => l.length > 0);
}

interface IcsProp {
  name: string;
  params: Record<string, string>;
  value: string;
}

function parsePropLine(line: string): IcsProp {
  const colonIdx = line.indexOf(":");
  if (colonIdx === -1) return { name: line.toUpperCase(), params: {}, value: "" };
  const propPart = line.slice(0, colonIdx);
  const value = line.slice(colonIdx + 1);
  const segments = propPart.split(";");
  const name = segments[0].toUpperCase();
  const params: Record<string, string> = {};
  for (let i = 1; i < segments.length; i++) {
    const eq = segments[i].indexOf("=");
    if (eq !== -1) {
      const k = segments[i].slice(0, eq).toUpperCase();
      const v = segments[i].slice(eq + 1);
      params[k] = v.startsWith('"') && v.endsWith('"') ? v.slice(1, -1) : v;
    }
  }
  return { name, params, value };
}

function parseMailto(v: string): string {
  return v.toLowerCase().startsWith("mailto:") ? v.slice(7) : v;
}

function parseIcsDatetime(
  value: string,
  params: Record<string, string>
): { date: Date | null; allDay: boolean; timeZone: string | null } {
  if (params.VALUE === "DATE") {
    const y = parseInt(value.slice(0, 4), 10);
    const mo = parseInt(value.slice(4, 6), 10) - 1;
    const d = parseInt(value.slice(6, 8), 10);
    return { date: new Date(y, mo, d), allDay: true, timeZone: null };
  }
  const m = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z?)$/,
  );
  if (!m) return { date: null, allDay: false, timeZone: null };
  const [, y, mo, d, h, min, s, z] = m;
  if (z === "Z") {
    return {
      date: new Date(`${y}-${mo}-${d}T${h}:${min}:${s ?? "00"}Z`),
      allDay: false,
      timeZone: "UTC",
    };
  }

  const tzid = params.TZID;
  if (!tzid) {
    return {
      date: new Date(
        Number(y),
        Number(mo) - 1,
        Number(d),
        Number(h),
        Number(min),
        Number(s ?? 0)
      ),
      allDay: false,
      timeZone: null,
    };
  }

  const date = convertWallClockToUtc(
    Number(y),
    Number(mo),
    Number(d),
    Number(h),
    Number(min),
    Number(s ?? 0),
    tzid
  );
  if (!date) return { date: null, allDay: false, timeZone: tzid };
  return { date, allDay: false, timeZone: tzid };
}

function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(byType.year),
    Number(byType.month) - 1,
    Number(byType.day),
    Number(byType.hour),
    Number(byType.minute),
    Number(byType.second)
  );
  return asUtc - date.getTime();
}

export function convertWallClockToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number,
  timeZone: string
): Date | null {
  const wallClockUtc = Date.UTC(year, month - 1, day, hour, minute, second);
  let timestamp = wallClockUtc;

  try {
    for (let i = 0; i < 3; i++) {
      const offset = getTimeZoneOffsetMs(new Date(timestamp), timeZone);
      const next = wallClockUtc - offset;
      if (next === timestamp) break;
      timestamp = next;
    }
  } catch {
    return null;
  }

  return new Date(timestamp);
}

function unescape(v: string): string {
  return v.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

function emptyCalendarEvent(method: string): CalendarEvent {
  return {
    uid: "",
    method,
    summary: "",
    dtStart: null,
    dtEnd: null,
    allDay: false,
    location: null,
    description: null,
    organizer: null,
    attendees: [],
    recurrenceRule: null,
    recurrenceDates: [],
    excludedDates: [],
    recurrenceId: null,
    recurrenceTimeZone: null,
    status: null,
    sequence: 0,
  };
}

function parseDateList(
  values: string[],
  params: Record<string, string>,
): Date[] {
  return values.flatMap((entry) => {
    const parsed = parseIcsDatetime(entry.trim(), params).date;
    return parsed ? [parsed] : [];
  });
}

export function parseIcsEvents(icsText: string): CalendarEvent[] {
  const lines = unfoldAndSplit(icsText);
  let method = "REQUEST";
  let current: CalendarEvent | null = null;
  const events: CalendarEvent[] = [];

  for (const line of lines) {
    const p = parsePropLine(line);

    if (line === "BEGIN:VEVENT") {
      current = emptyCalendarEvent(method);
      continue;
    }
    if (line === "END:VEVENT") {
      if (current && (current.uid || current.summary)) events.push(current);
      current = null;
      continue;
    }

    if (!current) {
      if (p.name === "METHOD") method = p.value.toUpperCase();
      continue;
    }

    switch (p.name) {
      case "UID":
        current.uid = p.value;
        break;
      case "SUMMARY":
        current.summary = unescape(p.value);
        break;
      case "LOCATION":
        current.location = unescape(p.value) || null;
        break;
      case "DESCRIPTION":
        current.description = unescape(p.value) || null;
        break;
      case "DTSTART": {
        const r = parseIcsDatetime(p.value, p.params);
        current.dtStart = r.date;
        current.allDay = r.allDay;
        current.recurrenceTimeZone = r.timeZone;
        break;
      }
      case "DTEND": {
        const r = parseIcsDatetime(p.value, p.params);
        current.dtEnd = r.date;
        break;
      }
      case "ORGANIZER":
        current.organizer = {
          name: p.params.CN ?? null,
          email: parseMailto(p.value),
        };
        break;
      case "ATTENDEE":
        current.attendees.push({
          name: p.params.CN ?? null,
          email: parseMailto(p.value),
          partstat: p.params.PARTSTAT ?? "NEEDS-ACTION",
          rsvp: p.params.RSVP === "TRUE",
        });
        break;
      case "RRULE":
        current.recurrenceRule = p.value;
        break;
      case "RDATE":
        current.recurrenceDates.push(
          ...parseDateList(p.value.split(","), p.params),
        );
        break;
      case "EXDATE":
        current.excludedDates.push(
          ...parseDateList(p.value.split(","), p.params),
        );
        break;
      case "RECURRENCE-ID":
        current.recurrenceId = parseIcsDatetime(p.value, p.params).date;
        break;
      case "STATUS":
        current.status = p.value.toUpperCase();
        break;
      case "SEQUENCE":
        current.sequence = Number.parseInt(p.value, 10) || 0;
        break;
    }
  }

  return events;
}

export function parseIcs(icsText: string): CalendarEvent | null {
  return parseIcsEvents(icsText)[0] ?? null;
}

// ────────────────────────────────────────────────────────────────
// Building a REPLY
// ────────────────────────────────────────────────────────────────

function toIcsDt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildCalendarReply(
  event: CalendarEvent,
  attendeeEmail: string,
  attendeeName: string | null,
  partstat: "ACCEPTED" | "DECLINED" | "TENTATIVE"
): string {
  const now = toIcsDt(new Date());
  const dtStart = event.dtStart ? toIcsDt(event.dtStart) : now;
  const dtEnd = event.dtEnd ? toIcsDt(event.dtEnd) : now;
  const cnParam = attendeeName ? `;CN=${attendeeName}` : "";
  const orgLine = event.organizer
    ? `ORGANIZER${event.organizer.name ? `;CN=${event.organizer.name}` : ""}:mailto:${event.organizer.email}`
    : null;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Mail//EN",
    "METHOD:REPLY",
    "BEGIN:VEVENT",
    `UID:${event.uid}`,
    `SUMMARY:${event.summary}`,
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    ...(orgLine ? [orgLine] : []),
    `ATTENDEE${cnParam};PARTSTAT=${partstat}:mailto:${attendeeEmail}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
