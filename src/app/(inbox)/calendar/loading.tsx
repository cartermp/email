export default function CalendarLoading() {
  return (
    <div
      className="h-full overflow-y-auto bg-stone-50 dark:bg-stone-900"
      aria-label="Loading calendar"
      aria-busy="true"
    >
      <div className="mx-auto max-w-6xl animate-pulse px-4 py-8 sm:px-8">
        <div className="mb-6 h-4 w-16 rounded bg-stone-200/80 dark:bg-stone-700/70 lg:hidden" />
        <div className="mb-6 flex items-start justify-between gap-6">
          <div className="space-y-2">
            <div className="h-6 w-28 rounded bg-stone-200/80 dark:bg-stone-700/70" />
            <div className="h-4 w-64 rounded bg-stone-200/80 dark:bg-stone-700/70" />
          </div>
          <div className="h-10 w-72 rounded bg-stone-200/80 dark:bg-stone-700/70" />
        </div>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-xl border border-stone-200 bg-stone-200 dark:border-stone-700 dark:bg-stone-700">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={`header-${index}`}
              className="h-9 bg-stone-100 dark:bg-stone-800"
            />
          ))}
          {Array.from({ length: 35 }).map((_, index) => (
            <div
              key={`day-${index}`}
              className="h-40 bg-white dark:bg-stone-900/70"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
