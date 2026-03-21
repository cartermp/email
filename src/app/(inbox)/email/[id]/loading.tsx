export default function EmailLoading() {
  return (
    <div className="overflow-y-auto h-full bg-stone-50 dark:bg-stone-900">
      <div className="max-w-3xl mx-auto px-8 py-8">
        <div className="h-6 w-2/3 rounded bg-stone-200 dark:bg-stone-700 animate-pulse mb-5" />
        <div className="flex flex-col gap-2 mb-4">
          <div className="h-3 w-48 rounded bg-stone-100 dark:bg-stone-800 animate-pulse" />
          <div className="h-3 w-56 rounded bg-stone-100 dark:bg-stone-800 animate-pulse" />
          <div className="h-3 w-40 rounded bg-stone-100 dark:bg-stone-800 animate-pulse" />
        </div>
        <div className="flex gap-2 mb-6 pb-6 border-b border-stone-200 dark:border-stone-700">
          <div className="h-6 w-12 rounded-md bg-stone-100 dark:bg-stone-800 animate-pulse" />
          <div className="h-6 w-16 rounded-md bg-stone-100 dark:bg-stone-800 animate-pulse" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-3 rounded bg-stone-100 dark:bg-stone-800 animate-pulse"
              style={{ width: `${70 + (i * 11) % 30}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
