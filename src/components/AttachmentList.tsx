"use client";

import { useState, useEffect } from "react";
import { EmailBodyPart } from "@/lib/types";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(type: string): string {
  if (type.startsWith("image/")) return "🖼";
  if (type === "application/pdf") return "📄";
  if (type.startsWith("video/")) return "🎬";
  if (type.startsWith("audio/")) return "🎵";
  if (type.includes("zip") || type.includes("tar") || type.includes("gzip")) return "🗜";
  if (type.includes("word") || type.includes("document")) return "📝";
  if (type.includes("spreadsheet") || type.includes("excel")) return "📊";
  return "📎";
}

function downloadUrl(a: EmailBodyPart, inline = false): string {
  const name = a.name ?? "attachment";
  return `/api/download?blobId=${encodeURIComponent(a.blobId!)}&name=${encodeURIComponent(name)}&type=${encodeURIComponent(a.type)}${inline ? "&inline=true" : ""}`;
}

// ---------------------------------------------------------------------------
// PDF preview modal
// ---------------------------------------------------------------------------

interface PdfModalProps {
  attachment: EmailBodyPart;
  onClose: () => void;
}

function PdfModal({ attachment, onClose }: PdfModalProps) {
  const name = attachment.name ?? "document.pdf";

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Header bar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 shrink-0">
        <span className="text-base leading-none">📄</span>
        <span className="flex-1 text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
          {name}
        </span>
        <span className="text-xs text-stone-400 dark:text-stone-500 shrink-0">
          {formatSize(attachment.size)}
        </span>
        <a
          href={downloadUrl(attachment)}
          download={name}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors shrink-0"
        >
          {/* Download icon */}
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
          </svg>
          Download
        </a>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300 transition-colors shrink-0"
          aria-label="Close"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      </div>

      {/* PDF iframe */}
      <iframe
        src={downloadUrl(attachment, true)}
        className="flex-1 w-full border-0 bg-stone-100 dark:bg-stone-950"
        title={name}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Attachment list
// ---------------------------------------------------------------------------

interface Props {
  attachments: EmailBodyPart[];
}

export default function AttachmentList({ attachments }: Props) {
  const [previewPdf, setPreviewPdf] = useState<EmailBodyPart | null>(null);

  const visible = attachments.filter((a) => a.type !== "text/calendar" && a.blobId);
  if (visible.length === 0) return null;

  return (
    <>
      <div className="mt-6 pt-6 border-t border-stone-200 dark:border-stone-700">
        <p className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wide mb-2">
          Attachments
        </p>
        <div className="flex flex-wrap gap-2">
          {visible.map((a) => {
            const name = a.name ?? "attachment";
            const isPdf = a.type === "application/pdf";
            return isPdf ? (
              <button
                key={a.blobId}
                onClick={() => setPreviewPdf(a)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-sm text-stone-700 dark:text-stone-300 max-w-xs"
              >
                <span className="text-base leading-none">{fileIcon(a.type)}</span>
                <span className="truncate">{name}</span>
                <span className="text-xs text-stone-400 dark:text-stone-500 shrink-0">
                  {formatSize(a.size)}
                </span>
              </button>
            ) : (
              <a
                key={a.blobId}
                href={downloadUrl(a)}
                download={name}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-sm text-stone-700 dark:text-stone-300 max-w-xs"
              >
                <span className="text-base leading-none">{fileIcon(a.type)}</span>
                <span className="truncate">{name}</span>
                <span className="text-xs text-stone-400 dark:text-stone-500 shrink-0">
                  {formatSize(a.size)}
                </span>
              </a>
            );
          })}
        </div>
      </div>

      {previewPdf && (
        <PdfModal attachment={previewPdf} onClose={() => setPreviewPdf(null)} />
      )}
    </>
  );
}
