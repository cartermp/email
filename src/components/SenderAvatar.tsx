import { EmailAddress } from "@/lib/types";
import { colorFor, initialsFor } from "@/lib/senderAvatar";

interface Props {
  from: EmailAddress[] | null;
  size?: number;
}

export default function SenderAvatar({ from, size = 36 }: Props) {
  const sender = from?.[0] ?? null;
  const initials = initialsFor(from);
  const color = colorFor(sender?.email ?? "");

  return (
    <div
      className="rounded-full flex items-center justify-center overflow-hidden shrink-0 ring-1 ring-black/10 dark:ring-stone-300/40"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
    >
      <span
        className="font-semibold leading-none select-none text-stone-200"
        style={{ fontSize: Math.round(size * 0.37) }}
      >
        {initials}
      </span>
    </div>
  );
}
