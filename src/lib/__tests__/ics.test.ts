import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseIcs } from "../ics";

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
});
