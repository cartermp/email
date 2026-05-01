interface Props {
  count: number;
  className?: string;
}

export default function ThreadCountBadge({ count, className = "" }: Props) {
  if (count <= 1) return null;

  return (
    <span
      className={[
        "inline-flex shrink-0 items-center justify-center rounded-full border border-stone-300/80 bg-stone-100/90 px-1.5 py-0.5 text-[10px] font-medium leading-none tabular-nums text-stone-600 dark:border-stone-600 dark:bg-stone-800/90 dark:text-stone-300",
        className,
      ].join(" ")}
    >
      {count.toLocaleString()}
    </span>
  );
}
