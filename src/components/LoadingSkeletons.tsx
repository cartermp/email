import type { CSSProperties } from "react";

function SkeletonBar({
  className,
  style,
}: {
  className: string;
  style?: CSSProperties;
}) {
  return (
    <div
      className={`rounded bg-stone-200/80 dark:bg-stone-700/70 ${className}`}
      style={style}
    />
  );
}

export function MailListLoadingSkeleton() {
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden"
      aria-label="Loading mailbox"
      aria-busy="true"
    >
      <div className="flex h-[49px] shrink-0 items-center justify-between border-b border-stone-200 px-4 dark:border-stone-700">
        <SkeletonBar className="h-4 w-20 animate-pulse" />
        <SkeletonBar className="h-7 w-20 animate-pulse" />
      </div>
      <div className="shrink-0 border-b border-stone-200 bg-stone-50 px-3 py-2 dark:border-stone-700 dark:bg-stone-900">
        <SkeletonBar className="h-8 w-full animate-pulse rounded-md" />
      </div>
      <div className="flex-1 overflow-hidden">
        <MailRowsLoadingSkeleton />
      </div>
    </div>
  );
}

export function MailRowsLoadingSkeleton({ count = 7 }: { count?: number }) {
  return (
    <div aria-label="Loading messages" aria-busy="true">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex gap-3 border-b border-stone-100 px-3 py-3 dark:border-stone-800"
        >
          <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-stone-200/80 dark:bg-stone-700/70" />
          <div className="min-w-0 flex-1 animate-pulse space-y-2">
            <div className="flex items-center justify-between gap-4">
              <SkeletonBar
                className={`h-3.5 ${index % 3 === 0 ? "w-28" : "w-36"}`}
              />
              <SkeletonBar className="h-2.5 w-10" />
            </div>
            <SkeletonBar
              className={`h-3 ${index % 2 === 0 ? "w-4/5" : "w-3/5"}`}
            />
            <SkeletonBar
              className={`h-2.5 ${index % 3 === 1 ? "w-full" : "w-5/6"}`}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function MessageLoadingSkeleton() {
  return (
    <div
      className="h-full overflow-y-auto bg-stone-50 dark:bg-stone-900"
      aria-label="Loading message"
      aria-busy="true"
    >
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-8 sm:py-8">
        <div className="animate-pulse">
          <SkeletonBar className="mb-6 h-7 w-[min(34rem,78%)]" />

          <div className="mb-5 grid grid-cols-[3rem_1fr] gap-x-4 gap-y-2">
            <SkeletonBar className="h-3 w-10 justify-self-end" />
            <SkeletonBar className="h-3 w-48" />
            <SkeletonBar className="h-3 w-7 justify-self-end" />
            <SkeletonBar className="h-3 w-56" />
            <SkeletonBar className="h-3 w-9 justify-self-end" />
            <SkeletonBar className="h-3 w-36" />
          </div>

          <div className="mb-7 flex gap-2 border-b border-stone-200 pb-6 dark:border-stone-700">
            {[64, 104, 58, 72, 62].map((width) => (
              <SkeletonBar
                key={width}
                className="h-8 rounded-md"
                style={{ width }}
              />
            ))}
          </div>

          <div className="mx-auto max-w-2xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-lg bg-stone-200/80 dark:bg-stone-700/70" />
              <div className="flex-1 space-y-2">
                <SkeletonBar className="h-4 w-40" />
                <SkeletonBar className="h-3 w-24" />
              </div>
            </div>
            <SkeletonBar className="h-4 w-11/12" />
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-4/5" />
            <div className="h-44 rounded-xl border border-stone-200 bg-stone-100/80 dark:border-stone-700 dark:bg-stone-800/70" />
            <SkeletonBar className="h-4 w-full" />
            <SkeletonBar className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </div>
  );
}
