"use client";

export default function EmailError({
  unstable_retry,
}: {
  unstable_retry: () => void;
}) {
  return (
    <div className="overflow-y-auto h-full bg-stone-50 dark:bg-stone-900">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 p-8 text-center space-y-2">
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
            Unable to load this email
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500">
            There was a problem fetching this email from the server.
          </p>
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="mt-3 inline-flex min-h-10 items-center rounded-md bg-stone-900 px-4 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            Try again
          </button>
        </div>
      </div>
    </div>
  );
}
