import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCalendarEntries, buildMonthDays, filterEventsForMonth, addMonths, normalizeMonthKey, monthTitle, formatEventTime } from "../calendarView";
import { CalendarEventData } from "@/components/CalendarEventCard";

function makeEvent(overrides: Partial<CalendarEventData> = {}): CalendarEventData {
  return {
    uid: "uid-1",
    emailId: "email-1",
    threadId: "thread-1",
    receivedAt: "2026-05-01T12:00:00.000Z",
    emailSubject: "Invite",
    preview: "",
    icsText: "BEGIN:VCALENDAR",
    method: "REQUEST",
    summary: "Meeting",
    dtStart: "2026-05-20T16:00:00.000Z",
    dtEnd: "2026-05-20T17:00:00.000Z",
    allDay: false,
    location: null,
    organizerName: null,
    organizerEmail: null,
    myCurrentPartstat: null,
    inReplyToMessageId: undefined,
    ...overrides,
  };
}

describe("calendarView", () => {
  it("normalizes invalid month keys to the current month", () => {
    assert.equal(normalizeMonthKey(undefined, new Date(2026, 4, 20)), "2026-05");
    assert.equal(normalizeMonthKey("bad-value", new Date(2026, 4, 20)), "2026-05");
    assert.equal(normalizeMonthKey("2026-11", new Date(2026, 4, 20)), "2026-11");
  });

  it("adds months across year boundaries", () => {
    assert.equal(addMonths("2026-12", 1), "2027-01");
    assert.equal(addMonths("2026-01", -1), "2025-12");
  });

  it("formats month titles", () => {
    assert.equal(monthTitle("2026-05"), "May 2026");
  });

  it("dedupes invites by uid using the latest received email", () => {
    const older = makeEvent({
      uid: "meeting-1",
      emailId: "email-older",
      receivedAt: "2026-05-01T10:00:00.000Z",
      summary: "Older",
    });
    const newer = makeEvent({
      uid: "meeting-1",
      emailId: "email-newer",
      receivedAt: "2026-05-02T10:00:00.000Z",
      summary: "Newer",
    });
    const result = buildCalendarEntries([older, newer]);
    assert.equal(result.length, 1);
    assert.equal(result[0].emailId, "email-newer");
    assert.equal(result[0].summary, "Newer");
  });

  it("omits reply messages and events without a start time", () => {
    const reply = makeEvent({ uid: "reply", method: "REPLY" });
    const noStart = makeEvent({ uid: "nostart", dtStart: null });
    const result = buildCalendarEntries([reply, noStart]);
    assert.equal(result.length, 0);
  });

  it("filters events for the requested month", () => {
    const mayEvent = makeEvent({ uid: "may", dtStart: "2026-05-20T16:00:00.000Z" });
    const juneEvent = makeEvent({ uid: "june", dtStart: "2026-06-01T16:00:00.000Z" });
    const result = filterEventsForMonth([mayEvent, juneEvent], "2026-05");
    assert.deepEqual(result.map((event) => event.uid), ["may"]);
  });

  it("builds a 6-week month grid with events slotted into their day", () => {
    const entry = makeEvent({ uid: "may", dtStart: "2026-05-20T16:00:00.000Z" });
    const days = buildMonthDays("2026-05", [entry], new Date("2026-05-20T08:00:00.000Z"));
    assert.equal(days.length, 42);
    const matchingDay = days.find((day) => day.key === "2026-05-20");
    assert.ok(matchingDay);
    assert.equal(matchingDay?.isToday, true);
    assert.deepEqual(matchingDay?.events.map((event) => event.uid), ["may"]);
  });

  it("formats event times for timed and all-day events", () => {
    const timed = makeEvent({ dtStart: "2026-05-20T16:00:00.000Z", allDay: false });
    const allDay = makeEvent({ dtStart: "2026-05-20T00:00:00.000Z", allDay: true });
    assert.match(formatEventTime(timed), /[0-9]/);
    assert.equal(formatEventTime(allDay), "All day");
  });
});
