"use client";

import { CSSProperties, useEffect, useMemo, useState } from "react";
import {
  SpreadsheetCellStyle,
  SpreadsheetPreviewError,
  SpreadsheetWorkbook,
  columnNumberToName,
  parseSpreadsheetWorkbook,
} from "@/lib/spreadsheet";
import useBodyClass from "@/components/useBodyClass";

interface Props {
  attachmentName?: string;
  attachmentSize: number;
  downloadHref: string;
  previewHref: string;
  onClose?: () => void;
  chrome?: "modal" | "page";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function SpreadsheetViewer({
  attachmentName,
  attachmentSize,
  downloadHref,
  previewHref,
  onClose,
  chrome = "page",
}: Props) {
  const [workbook, setWorkbook] = useState<SpreadsheetWorkbook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useBodyClass("rich-content-open");

  useEffect(() => {
    if (!onClose) return;
    const close = onClose;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;

    async function loadWorkbook() {
      setLoading(true);
      setWorkbook(null);
      setError(null);
      setActiveSheetIndex(0);

      try {
        const response = await fetch(previewHref, { cache: "no-store" });
        if (!response.ok) {
          throw new SpreadsheetPreviewError(
            `Couldn't load the spreadsheet preview (${response.status}).`
          );
        }

        const parsedWorkbook = await parseSpreadsheetWorkbook(await response.arrayBuffer());
        if (parsedWorkbook.sheets.length === 0) {
          throw new SpreadsheetPreviewError(
            "This spreadsheet doesn't contain any visible sheets to preview."
          );
        }

        if (!cancelled) {
          setWorkbook(parsedWorkbook);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof SpreadsheetPreviewError
              ? loadError.message
              : "Couldn't preview this spreadsheet."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadWorkbook();
    return () => {
      cancelled = true;
    };
  }, [previewHref]);

  const activeSheet = workbook?.sheets[activeSheetIndex] ?? null;
  const columns = useMemo(
    () =>
      activeSheet
        ? Array.from({ length: activeSheet.maxColumn }, (_, index) => index + 1)
        : [],
    [activeSheet]
  );
  const rows = useMemo(
    () =>
      activeSheet ? Array.from({ length: activeSheet.maxRow }, (_, index) => index + 1) : [],
    [activeSheet]
  );
  const name = attachmentName ?? "spreadsheet.xlsx";

  const body = (
    <div className="flex flex-col min-h-0 flex-1 bg-stone-100 dark:bg-stone-950">
      {workbook && workbook.sheets.length > 1 && (
        <div className="flex gap-2 px-4 pt-3 overflow-x-auto shrink-0">
          {workbook.sheets.map((sheet, index) => (
            <button
              key={sheet.name}
              type="button"
              onClick={() => setActiveSheetIndex(index)}
              className={`px-3 py-1.5 rounded-t-lg border text-sm whitespace-nowrap transition-colors ${
                index === activeSheetIndex
                  ? "bg-white text-stone-900 border-stone-300 dark:bg-white dark:text-stone-900 dark:border-stone-300"
                  : "bg-stone-200/80 text-stone-600 border-transparent hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
              }`}
            >
              {sheet.name}
            </button>
          ))}
        </div>
      )}

      <div className="min-h-0 flex-1 px-4 pb-4">
        {loading && (
          <div className="h-full flex items-center justify-center text-sm text-stone-500 dark:text-stone-400">
            Loading spreadsheet preview...
          </div>
        )}

        {!loading && error && (
          <div className="h-full flex items-center justify-center">
            <div className="max-w-md rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-6 text-center shadow-sm">
              <div className="text-2xl mb-3">📊</div>
              <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                Preview unavailable
              </p>
              <p className="mt-2 text-sm text-stone-500 dark:text-stone-400">{error}</p>
              <a
                href={downloadHref}
                download={name}
                className="inline-flex mt-4 items-center gap-2 rounded-md border border-stone-200 dark:border-stone-700 px-3 py-2 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                Download instead
              </a>
            </div>
          </div>
        )}

        {!loading && !error && activeSheet && (
          <div className="h-full flex flex-col rounded-xl border border-stone-200 shadow-sm overflow-hidden bg-white">
            <div className="flex items-center justify-between gap-3 px-4 py-2 border-b border-stone-200 shrink-0">
              <div>
                <p className="text-sm font-medium text-stone-800">{activeSheet.name}</p>
                <p className="text-xs text-stone-500">
                  {activeSheet.maxRow.toLocaleString()} rows x{" "}
                  {activeSheet.maxColumn.toLocaleString()} columns
                </p>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-auto bg-stone-50">
              <table className="border-separate border-spacing-0 text-sm">
                <thead className="sticky top-0 z-20">
                  <tr>
                    <th className="sticky left-0 z-30 bg-stone-100 border-b border-r border-stone-200 px-3 py-2 text-right text-xs font-medium text-stone-500 min-w-14" />
                    {columns.map((column) => (
                      <th
                        key={column}
                        className="bg-stone-100 border-b border-r border-stone-200 px-3 py-2 text-center text-xs font-medium text-stone-500"
                        style={{
                          minWidth: activeSheet.columnWidths[column] ?? 120,
                          width: activeSheet.columnWidths[column] ?? 120,
                        }}
                      >
                        {columnNumberToName(column)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row}>
                      <th className="sticky left-0 z-10 bg-stone-100 border-b border-r border-stone-200 px-3 py-2 text-right text-xs font-medium text-stone-500 min-w-14">
                        {row}
                      </th>
                      {columns.map((column) => {
                        const cell = activeSheet.cells[`${row}:${column}`];
                        return (
                          <td
                            key={`${row}:${column}`}
                            className="border-r border-b border-stone-200 px-3 py-2 align-top"
                            style={cellStyle(cell?.style, activeSheet.columnWidths[column])}
                            title={cell?.value ?? ""}
                          >
                            {cell?.value ?? ""}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  if (chrome === "modal") {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-black/60 backdrop-blur-sm"
        onClick={(event) => {
          if (event.target === event.currentTarget) onClose?.();
        }}
      >
        <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 shrink-0">
          <span className="text-base leading-none">📊</span>
          <span className="flex-1 text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
            {name}
          </span>
          <span className="text-xs text-stone-400 dark:text-stone-500 shrink-0">
            {formatSize(attachmentSize)}
          </span>
          <a
            href={downloadHref}
            download={name}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors shrink-0"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Download
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-700 dark:hover:text-stone-300 transition-colors shrink-0"
            aria-label="Close"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        {body}
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col">
      <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 shrink-0">
        <span className="text-base leading-none">📊</span>
        <span className="flex-1 text-sm font-medium text-stone-800 dark:text-stone-200 truncate">
          {name}
        </span>
        <span className="text-xs text-stone-400 dark:text-stone-500 shrink-0">
          {formatSize(attachmentSize)}
        </span>
        <a
          href={downloadHref}
          download={name}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-stone-900 dark:hover:text-stone-100 transition-colors shrink-0"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
            <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
          </svg>
          Download
        </a>
      </div>
      {body}
    </div>
  );
}

function cellStyle(
  style: SpreadsheetCellStyle | undefined,
  width: number | undefined
): CSSProperties {
  return {
    minWidth: width ?? 120,
    width: width ?? 120,
    backgroundColor: style?.backgroundColor ?? "#FFFFFF",
    color: style?.color ?? "#111827",
    fontWeight: style?.bold ? 700 : 400,
    fontStyle: style?.italic ? "italic" : "normal",
    textDecoration: style?.underline ? "underline" : "none",
    fontSize: style?.fontSize ? `${style.fontSize}px` : undefined,
    fontFamily: style?.fontFamily ? `${style.fontFamily}, sans-serif` : undefined,
    textAlign: style?.horizontalAlign,
    verticalAlign: style?.verticalAlign ?? "top",
    whiteSpace: style?.wrapText ? "pre-wrap" : "nowrap",
  };
}
