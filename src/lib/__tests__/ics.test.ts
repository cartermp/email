import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseIcs, parseIcsEvents } from "../ics";

describe("parseIcs", () => {
  it("parses TZID datetime values into the correct UTC instant", () => {
    const event = parseIcs([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      "UID:test-uid",
      "SUMMARY:Team meeting",
      "DTSTART;TZID=America/Los_Angeles:20260602T150000",
      "DTEND;TZID=America/Los_Angeles:20260602T160000",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n"));

    assert.ok(event);
    assert.equal(event.dtStart?.toISOString(), "2026-06-02T22:00:00.000Z");
    assert.equal(event.dtEnd?.toISOString(), "2026-06-02T23:00:00.000Z");
  });

  it("keeps UTC datetimes unchanged", () => {
    const event = parseIcs([
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      "UID:test-uid-utc",
      "SUMMARY:UTC meeting",
      "DTSTART:20260602T220000Z",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n"));

    assert.ok(event);
    assert.equal(event.dtStart?.toISOString(), "2026-06-02T22:00:00.000Z");
  });

  it("parses recurrence fields and every VEVENT in an attachment", () => {
    const events = parseIcsEvents([
      "BEGIN:VCALENDAR",
      "METHOD:REQUEST",
      "BEGIN:VEVENT",
      "UID:series-1",
      "SEQUENCE:3",
      "DTSTART;TZID=America/Los_Angeles:20260302T090000",
      "RRULE:FREQ=WEEKLY;COUNT=4",
      "RDATE;TZID=America/Los_Angeles:20260330T090000",
      "EXDATE;TZID=America/Los_Angeles:20260316T090000",
      "END:VEVENT",
      "BEGIN:VEVENT",
      "UID:series-1",
      "RECURRENCE-ID;TZID=America/Los_Angeles:20260309T090000",
      "STATUS:CANCELLED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n"));

    assert.equal(events.length, 2);
    assert.equal(events[0].recurrenceRule, "FREQ=WEEKLY;COUNT=4");
    assert.equal(events[0].recurrenceTimeZone, "America/Los_Angeles");
    assert.equal(events[0].sequence, 3);
    assert.deepEqual(
      events[0].recurrenceDates.map((date) => date.toISOString()),
      ["2026-03-30T16:00:00.000Z"]
    );
    assert.deepEqual(
      events[0].excludedDates.map((date) => date.toISOString()),
      ["2026-03-16T16:00:00.000Z"]
    );
    assert.equal(events[1].recurrenceId?.toISOString(), "2026-03-09T16:00:00.000Z");
    assert.equal(events[1].status, "CANCELLED");
  });
});
