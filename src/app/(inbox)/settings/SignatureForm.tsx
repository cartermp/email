"use client";

import { useState, useTransition } from "react";
import { saveSignatureAction } from "./actions";
import { stripSignatureSeparator } from "@/lib/compose";

interface Props {
  identityLabel?: string;
  initialSignature: string;
}

// Strip all leading `-- \n` separators that Fastmail stores as part of the
// signature — the form lets the user edit only the content below the line.
function stripSepPrefix(sig: string): string {
  return stripSignatureSeparator(sig);
}

export default function SignatureForm({ identityLabel, initialSignature }: Props) {
  const [value, setValue] = useState(() => stripSepPrefix(initialSignature));
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      try {
        // Re-add the `-- \n` prefix so Fastmail stores it in standard format,
        // which other mail clients (Fastmail web, mobile apps) also expect.
        const toSave = value.trim() ? `-- \n${value.trim()}` : "";
        await saveSignatureAction(toSave);
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save");
      }
    });
  }

  return (
    <div className="space-y-3">
      {identityLabel && (
        <p className="text-xs text-stone-500 dark:text-stone-400 font-mono">{identityLabel}</p>
      )}
      <textarea
        value={value}
        onChange={(e) => { setValue(e.target.value); setSaved(false); }}
        rows={6}
        placeholder="Your signature here…"
        className="w-full text-sm font-mono text-stone-700 dark:text-stone-300 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg px-4 py-3 resize-y outline-none focus:border-stone-400 dark:focus:border-stone-500 placeholder:text-stone-300 dark:placeholder:text-stone-600"
      />
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={isPending}
          className="text-sm bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 rounded-lg hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors disabled:opacity-50"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {saved && (
          <span className="text-xs text-green-600 dark:text-green-400">Saved</span>
        )}
        {error && (
          <span className="text-xs text-red-500">{error}</span>
        )}
      </div>
    </div>
  );
}
