import { notFound } from "next/navigation";
import LiveUnreadCountBadge from "@/components/LiveUnreadCountBadge";

interface Props {
  params: Promise<{ threadId: string }>;
}

export default async function SmokeThreadPage({ params }: Props) {
  if (process.env.MAIL_BROWSER_SMOKE_TESTS !== "1") {
    notFound();
  }

  const { threadId } = await params;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-6">
      <h1 className="text-base font-semibold text-stone-900 dark:text-stone-100">
        Opened conversation {threadId}
      </h1>
      <div
        data-testid="shared-unread-count"
        className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400"
      >
        Shared unread count
        <LiveUnreadCountBadge showZero />
      </div>
    </div>
  );
}
