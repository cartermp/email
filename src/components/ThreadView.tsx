"use client";

import { useState } from "react";
import Link from "next/link";
import SenderAvatar from "@/components/SenderAvatar";
import EmailBody from "@/components/EmailBody";
import { Email } from "@/lib/types";
import { formatAddressList, formatFullDate } from "@/lib/format";

// ---------------------------------------------------------------------------
// Body resolution (mirrors email/[id]/page.tsx logic)
// ---------------------------------------------------------------------------

function resolveBody(email: Email): { body: string; type: "html" | "text" } | null {
  if (email.htmlBody?.length > 0) {
    const part = email.htmlBody[0];
    if (part.partId && email.bodyValues?.[part.partId]) {
      return { body: email.bodyValues[part.partId].value, type: "html" };
    }
  }
  if (email.textBody?.length > 0) {
    const part = email.textBody[0];
    if (part.partId && email.bodyValues?.[part.partId]) {
      const raw = email.bodyValues[part.partId].value;
      // Skip text/plain parts that are actually raw HTML source
      if (!/^\s*</i.test(raw)) {
        return { body: raw, type: "text" };
      }
    }
  }
  if (email.preview) return { body: email.preview, type: "text" };
  return null;
}

// ---------------------------------------------------------------------------
// Single stacked email item
// ---------------------------------------------------------------------------

interface ItemProps {
  email: Email;
  expanded: boolean;
  onToggle: () => void;
}

function EmailStackItem({ email, expanded, onToggle }: ItemProps) {
  const isUnread = !email.keywords?.["$seen"];
  const resolved = resolveBody(email);
  const hasMultipleRecipients =
    (email.to?.length ?? 0) + (email.cc?.length ?? 0) > 1;

  return (
    <div
      className={[
        "rounded-xl border overflow-hidden bg-white dark:bg-stone-800/50 transition-shadow",
        expanded
          ? "border-stone-300 dark:border-stone-600 shadow-sm"
          : "border-stone-200 dark:border-stone-700",
      ].join(" ")}
    >
      {/* Header — always visible, tap to expand/collapse */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800/80 transition-colors"
      >
        <div className="shrink-0">
          <SenderAvatar from={email.from} size={32} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <span
              className={[
                "text-sm truncate",
                isUnread
                  ? "font-semibold text-stone-900 dark:text-stone-100"
                  : "text-stone-700 dark:text-stone-300",
              ].join(" ")}
            >
              {formatAddressList(email.from) || "(no sender)"}
            </span>
            <span className="shrink-0 text-[11px] text-stone-400 dark:text-stone-500 tabular-nums">
              {formatFullDate(email.receivedAt)}
            </span>
          </div>
          {!expanded && email.preview && (
            <p className="text-xs text-stone-400 dark:text-stone-500 truncate mt-0.5">
              {email.preview}
            </p>
          )}
        </div>

        {/* Chevron */}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className={[
            "w-4 h-4 shrink-0 text-stone-400 dark:text-stone-500 transition-transform duration-200",
            expanded ? "rotate-180" : "",
          ].join(" ")}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-stone-200 dark:border-stone-700">
          {/* To / Cc metadata */}
          <div className="px-4 py-2.5 text-xs text-stone-500 dark:text-stone-400 space-y-0.5 border-b border-stone-100 dark:border-stone-700/50">
            {email.to && email.to.length > 0 && (
              <div>
                <span className="text-stone-400 dark:text-stone-500">To </span>
                {formatAddressList(email.to)}
              </div>
            )}
            {email.cc && email.cc.length > 0 && (
              <div>
                <span className="text-stone-400 dark:text-stone-500">Cc </span>
                {formatAddressList(email.cc)}
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="px-4 py-2.5 flex items-center gap-2 border-b border-stone-100 dark:border-stone-700/50">
            <Link
              href={`/compose?mode=reply&id=${email.id}`}
              className="text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Reply
            </Link>
            {hasMultipleRecipients && (
              <Link
                href={`/compose?mode=reply-all&id=${email.id}`}
                className="text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
              >
                Reply All
              </Link>
            )}
            <Link
              href={`/compose?mode=forward&id=${email.id}`}
              className="text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
            >
              Forward
            </Link>
          </div>

          {/* Body */}
          {resolved ? (
            <EmailBody body={resolved.body} type={resolved.type} stripQuotes />
          ) : (
            <p className="px-4 py-6 text-sm text-stone-400 dark:text-stone-500">
              No content.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thread view — the full stacked list
// ---------------------------------------------------------------------------

interface Props {
  emails: Email[]; // sorted oldest → newest
}

export default function ThreadView({ emails }: Props) {
  // Start with the most recent email expanded
  const lastId = emails[emails.length - 1]?.id;
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(lastId ? [lastId] : [])
  );

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-2 pb-8">
      {emails.map((email) => (
        <EmailStackItem
          key={email.id}
          email={email}
          expanded={expandedIds.has(email.id)}
          onToggle={() => toggle(email.id)}
        />
      ))}
    </div>
  );
}
