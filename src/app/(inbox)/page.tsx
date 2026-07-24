import EmptyState from "@/components/EmptyState";

export default function InboxPage() {
  return (
    <div className="h-full bg-stone-50 dark:bg-stone-900">
      <EmptyState
        icon="mail"
        title="Choose a conversation"
        description="Select a thread from the inbox to read it here."
      />
    </div>
  );
}
