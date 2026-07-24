"use client";

import { useState, useTransition } from "react";
import { saveSignatureAction } from "./actions";
import {
  formatSignatureForSave,
  stripSignatureSeparator,
} from "@/lib/compose";
import { useToast } from "@/components/ToastProvider";
import { useNavigationGuard } from "@/components/NavigationGuardProvider";

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
  const initialValue = stripSepPrefix(initialSignature);
  const [value, setValue] = useState(initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const showToast = useToast();
  const dirty = value !== savedValue;
  useNavigationGuard(dirty, "Discard your unsaved signature changes?");

  function handleSave() {
    if (!dirty || isPending) return;
    setError(null);
    startTransition(async () => {
      try {
        // Re-add the `-- \n` prefix so Fastmail stores it in standard format,
        // which other mail clients (Fastmail web, mobile apps) also expect.
        const normalized = value.trim();
        const toSave = formatSignatureForSave(value);
        await saveSignatureAction(toSave);
        setValue(normalized);
        setSavedValue(normalized);
        showToast({ message: "Signature saved" });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Failed to save";
        setError(message);
        showToast({ message: "Couldn’t save the signature.", tone: "error" });
      }
    });
  }

  return (
    <div className="space-y-5">
      {identityLabel && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 dark:border-stone-700 dark:bg-stone-900/60">
          <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
            Sending as
          </p>
          <p className="mt-1 break-all text-xs text-stone-600 dark:text-stone-300">
            {identityLabel}
          </p>
        </div>
      )}
      <div>
        <label
          htmlFor="signature"
          className="mb-2 block text-xs font-medium text-stone-600 dark:text-stone-300"
        >
          Signature text
        </label>
        <textarea
          id="signature"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(event) => {
            if (
              event.key.toLowerCase() === "s" &&
              (event.metaKey || event.ctrlKey)
            ) {
              event.preventDefault();
              handleSave();
            }
          }}
          rows={6}
          placeholder="Your signature here…"
          aria-describedby="signature-help signature-status"
          className="w-full resize-y rounded-lg border border-stone-200 bg-white px-4 py-3 font-mono text-sm leading-relaxed text-stone-700 outline-none placeholder:text-stone-300 focus:border-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:placeholder:text-stone-600 dark:focus:border-stone-500"
        />
        <p
          id="signature-help"
          className="mt-2 text-xs text-stone-400 dark:text-stone-500"
        >
          Plain text · ⌘S or Ctrl+S to save
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-stone-600 dark:text-stone-300">
          Preview
        </p>
        <div className="min-h-28 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm leading-relaxed text-stone-600 dark:border-stone-700 dark:bg-stone-900/60 dark:text-stone-300">
          {value.trim() ? (
            <div className="whitespace-pre-wrap">
              <span className="text-stone-400 dark:text-stone-500">--</span>
              {"\n"}
              {value.trim()}
            </div>
          ) : (
            <span className="text-stone-400 dark:text-stone-500">
              No signature will be added.
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !dirty}
          className="min-h-10 rounded-lg bg-stone-900 px-4 text-sm font-medium text-white transition-colors hover:bg-stone-700 disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          {isPending ? "Saving…" : "Save"}
        </button>
        {dirty && !isPending && (
          <button
            type="button"
            onClick={() => {
              setValue(savedValue);
              setError(null);
            }}
            className="min-h-10 rounded-lg px-3 text-xs text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
          >
            Reset
          </button>
        )}
        <span
          id="signature-status"
          className={[
            "ml-auto text-xs",
            error
              ? "text-red-500 dark:text-red-400"
              : dirty
                ? "text-amber-600 dark:text-amber-400"
                : "text-stone-400 dark:text-stone-500",
          ].join(" ")}
          role={error ? "alert" : "status"}
          aria-live="polite"
        >
          {error || (dirty ? "Unsaved changes" : "Up to date")}
        </span>
      </div>
    </div>
  );
}
