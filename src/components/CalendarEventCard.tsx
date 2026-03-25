"use client";

import { useState } from "react";
import { sendCalendarReplyAction } from "@/app/(inbox)/email/[id]/actions";

export interface CalendarEventData {
  icsText: string;
  method: string;
  summary: string;
  dtStart: string | null; // ISO string
  dtEnd: string | null;   // ISO string
  allDay: boolean;
  location: string | null;
  organizerName: string | null;
  organizerEmail: string | null;
  myCurrentPartstat: string | null;
  inReplyToMessageId?: string;
}

function formatEventDateRange(
  dtStart: string | null,
  dtEnd: string | null,
  allDay: boolean
): string {
  if (!dtStart) return "Time unknown";
  const start = new Date(dtStart);
  if (allDay) {
    const opts: Intl.DateTimeFormatOptions = {
      weekday: "short", month: "short", day: "numeric", year: "numeric",
    };
    if (dtEnd) {
      const end = new Date(dtEnd);
      end.setDate(end.getDate() - 1); // DTEND is exclusive for all-day
      if (end.getTime() > start.getTime()) {
        return `${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`;
      }
    }
    return start.toLocaleDateString("en-US", opts);
  }
  const datePart = start.toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
  const startTime = start.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (dtEnd) {
    const end = new Date(dtEnd);
    const endTime = end.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    return `${datePart} · ${startTime} – ${endTime}`;
  }
  return `${datePart} · ${startTime}`;
}

export type CalendarResponse = "ACCEPTED" | "DECLINED" | "TENTATIVE";
type Response = CalendarResponse;

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} className="w-3 h-3">
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

const BUTTON_CONFIG: {
  response: Response;
  label: string;
  sentLabel: string;
  active: string;
}[] = [
  {
    response: "ACCEPTED",
    label: "Accept",
    sentLabel: "Accepted",
    active: "border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400",
  },
  {
    response: "TENTATIVE",
    label: "Maybe",
    sentLabel: "Maybe",
    active: "border-amber-400 bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
  },
  {
    response: "DECLINED",
    label: "Decline",
    sentLabel: "Declined",
    active: "border-red-400 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400",
  },
];

const IDLE = "border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100";

interface Props {
  event: CalendarEventData;
  // Allows a parent (e.g. ThreadView) to persist the response across
  // unmount/remount cycles (collapse → re-expand).
  persistedResponse?: CalendarResponse | null;
  onResponseSent?: (r: CalendarResponse) => void;
}

export default function CalendarEventCard({ event, persistedResponse, onResponseSent }: Props) {
  const initial =
    persistedResponse !== undefined
      ? persistedResponse
      : event.myCurrentPartstat && event.myCurrentPartstat !== "NEEDS-ACTION"
        ? (event.myCurrentPartstat as Response)
        : null;

  const [sentResponse, setSentResponse] = useState<Response | null>(initial);
  const [pendingResponse, setPendingResponse] = useState<Response | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isCancelled = event.method === "CANCEL";
  const isBusy = pendingResponse !== null;

  async function respond(response: Response) {
    if (isBusy || response === sentResponse) return;
    setError(null);
    setPendingResponse(response);
    try {
      await sendCalendarReplyAction(event.icsText, response, event.inReplyToMessageId);
      setSentResponse(response);
      onResponseSent?.(response);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send response");
    } finally {
      setPendingResponse(null);
    }
  }

  return (
    <div className="mb-6 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-700/60 flex items-start gap-3">
        <div className="mt-0.5 w-8 h-8 shrink-0 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-blue-600 dark:text-blue-400" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-stone-900 dark:text-stone-100 leading-snug">
            {event.summary}
          </p>
          <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
            {formatEventDateRange(event.dtStart, event.dtEnd, event.allDay)}
          </p>
        </div>
      </div>

      {/* Details */}
      <div className="px-5 py-3 space-y-1.5">
        {event.location && (
          <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 shrink-0 text-stone-400" stroke="currentColor" strokeWidth={2}>
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
              <circle cx="12" cy="9" r="2.5" />
            </svg>
            <span className="truncate">{event.location}</span>
          </div>
        )}
        {(event.organizerName || event.organizerEmail) && (
          <div className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-400">
            <svg viewBox="0 0 24 24" fill="none" className="w-3.5 h-3.5 shrink-0 text-stone-400" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
            <span>
              {event.organizerName
                ? `${event.organizerName} (${event.organizerEmail})`
                : event.organizerEmail}
            </span>
          </div>
        )}
      </div>

      {/* RSVP actions */}
      <div className="px-5 py-3 border-t border-stone-100 dark:border-stone-700/60 flex items-center gap-2 flex-wrap">
        {isCancelled ? (
          <p className="text-sm text-stone-500 dark:text-stone-400 italic">
            This event has been cancelled.
          </p>
        ) : (
          <>
            {BUTTON_CONFIG.map(({ response, label, sentLabel, active }) => {
              const isSent = sentResponse === response;
              const isPending = pendingResponse === response;
              return (
                <button
                  key={response}
                  onClick={() => respond(response)}
                  disabled={isBusy}
                  className={[
                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border transition-colors disabled:cursor-default",
                    isSent || isPending ? active : IDLE,
                    isBusy && !isSent && !isPending ? "opacity-40" : "",
                  ].join(" ")}
                >
                  {isPending && <SpinnerIcon />}
                  {isSent && !isPending && <CheckIcon />}
                  {isSent ? sentLabel : label}
                </button>
              );
            })}
            {error && (
              <p className="w-full text-xs text-red-500 dark:text-red-400 mt-1">{error}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
