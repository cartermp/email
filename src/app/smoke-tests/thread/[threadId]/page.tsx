import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ threadId: string }>;
}

export default async function SmokeThreadPage({ params }: Props) {
  if (process.env.MAIL_BROWSER_SMOKE_TESTS !== "1") {
    notFound();
  }

  const { threadId } = await params;

  return (
    <div className="flex h-full items-center justify-center p-6">
      <h1 className="text-base font-semibold text-stone-900 dark:text-stone-100">
        Opened conversation {threadId}
      </h1>
    </div>
  );
}
