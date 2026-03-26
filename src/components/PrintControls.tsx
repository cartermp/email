"use client";

import { useEffect } from "react";

export default function PrintControls({ subject }: { subject: string }) {
  useEffect(() => {
    window.print();
  }, []);

  return (
    <div className="print:hidden flex items-center justify-between px-6 py-3 border-b border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-900 shrink-0">
      <span className="text-sm text-stone-500 dark:text-stone-400 truncate mr-4">{subject}</span>
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => window.print()}
          className="text-xs px-3 py-1.5 rounded-md bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors"
        >
          Print / Save as PDF
        </button>
        <button
          onClick={() => window.close()}
          className="text-xs px-3 py-1.5 rounded-md border border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
