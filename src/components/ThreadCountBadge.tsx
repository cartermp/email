interface Props {
  count: number;
  className?: string;
}

export default function ThreadCountBadge({ count, className = "" }: Props) {
  if (count <= 1) return null;

  return (
    <span
      className={[
        "shrink-0 text-[10px] tabular-nums px-1.5 py-0.5 rounded-full bg-stone-200 dark:bg-stone-700 text-stone-500 dark:text-stone-400",
        className,
      ].join(" ")}
    >
      {count.toLocaleString()}
    </span>
  );
}
