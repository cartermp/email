export default function Loading() {
  return (
    <div className="overflow-y-auto h-full bg-stone-50 dark:bg-stone-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-8 py-8 animate-pulse">
        <div className="h-6 w-2/3 bg-stone-200 dark:bg-stone-700 rounded mb-6" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800/50 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-700 shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 w-32 bg-stone-200 dark:bg-stone-700 rounded" />
                  <div className="h-3 w-full bg-stone-100 dark:bg-stone-700/60 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
