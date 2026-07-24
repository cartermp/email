import Link from "next/link";
import MailIcon, { type MailIconName } from "@/components/MailIcon";

interface Props {
  icon?: MailIconName;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  compact?: boolean;
}

export default function EmptyState({
  icon = "mail",
  title,
  description,
  action,
  compact = false,
}: Props) {
  return (
    <div
      className={[
        "flex flex-col items-center justify-center px-6 text-center",
        compact ? "min-h-52 py-8" : "h-full py-12",
      ].join(" ")}
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-400 shadow-sm dark:border-stone-700 dark:bg-stone-800 dark:text-stone-500">
        <MailIcon name={icon} className="h-5 w-5" />
      </div>
      <h2 className="text-sm font-semibold text-stone-700 dark:text-stone-200">
        {title}
      </h2>
      {description && (
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-stone-400 dark:text-stone-500">
          {description}
        </p>
      )}
      {action && (
        <Link
          href={action.href}
          className="mt-4 inline-flex min-h-10 items-center rounded-md bg-stone-900 px-3.5 text-sm font-medium text-white transition-colors hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
