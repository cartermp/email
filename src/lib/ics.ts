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
): { date: Date | null; allDay: boolean } {
  if (params.VALUE === "DATE") {
    const y = parseInt(value.slice(0, 4), 10);
    const mo = parseInt(value.slice(4, 6), 10) - 1;
    const d = parseInt(value.slice(6, 8), 10);
    return { date: new Date(y, mo, d), allDay: true };
  }
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return { date: null, allDay: false };
  const [, y, mo, d, h, min, s, z] = m;
  const iso = `${y}-${mo}-${d}T${h}:${min}:${s}${z === "Z" ? "Z" : ""}`;
  return { date: new Date(iso), allDay: false };
}

function unescape(v: string): string {
  return v.replace(/\\n/g, "\n").replace(/\\,/g, ",").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
}

export function parseIcs(icsText: string): CalendarEvent | null {
  const lines = unfoldAndSplit(icsText);
  let method = "REQUEST";
  let inVEvent = false;
  let uid = "";
  let summary = "";
  let dtStart: Date | null = null;
  let dtEnd: Date | null = null;
  let allDay = false;
  let location: string | null = null;
  let description: string | null = null;
  let organizer: { name: string | null; email: string } | null = null;
  const attendees: CalendarAttendee[] = [];

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") { inVEvent = true; continue; }
    if (line === "END:VEVENT") { inVEvent = false; continue; }

    const p = parsePropLine(line);

    if (!inVEvent) {
      if (p.name === "METHOD") method = p.value.toUpperCase();
      continue;
    }

    switch (p.name) {
      case "UID":
        uid = p.value;
        break;
      case "SUMMARY":
        summary = unescape(p.value);
        break;
      case "LOCATION":
        location = unescape(p.value) || null;
        break;
      case "DESCRIPTION":
        description = unescape(p.value) || null;
        break;
      case "DTSTART": {
        const r = parseIcsDatetime(p.value, p.params);
        dtStart = r.date;
        allDay = r.allDay;
        break;
      }
      case "DTEND": {
        const r = parseIcsDatetime(p.value, p.params);
        dtEnd = r.date;
        break;
      }
      case "ORGANIZER":
        organizer = { name: p.params.CN ?? null, email: parseMailto(p.value) };
        break;
      case "ATTENDEE":
        attendees.push({
          name: p.params.CN ?? null,
          email: parseMailto(p.value),
          partstat: p.params.PARTSTAT ?? "NEEDS-ACTION",
          rsvp: p.params.RSVP === "TRUE",
        });
        break;
    }
  }

  if (!uid && !summary) return null;

  return {
    uid, method, summary, dtStart, dtEnd, allDay,
    location, description, organizer, attendees,
  };
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
