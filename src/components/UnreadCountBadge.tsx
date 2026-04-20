interface Props {
  count: number;
  showZero?: boolean;
  className?: string;
}

export function formatUnreadCount(count: number): string {
  if (count > 99) return "99+";
  return count.toLocaleString();
}

export default function UnreadCountBadge({
  count,
  showZero = false,
  className = "",
}: Props) {
  if (!showZero && count <= 0) return null;

  return (
    <span
      className={[
        "inline-flex min-w-5 items-center justify-center rounded-full border border-blue-400/70 bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-blue-900 dark:border-blue-500/70 dark:bg-blue-900/40 dark:text-blue-100",
        className,
      ].join(" ")}
    >
      {formatUnreadCount(count)}
    </span>
  );
}
