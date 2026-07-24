"use client";

import UnreadCountBadge from "@/components/UnreadCountBadge";
import {
  type MailboxCounts,
  useMailboxCounts,
} from "@/components/UnreadCountProvider";

interface Props {
  mailbox?: keyof MailboxCounts;
  showZero?: boolean;
  className?: string;
}

export default function LiveUnreadCountBadge({
  mailbox = "inbox",
  showZero = false,
  className = "",
}: Props) {
  const count = useMailboxCounts()[mailbox];
  return <UnreadCountBadge count={count} showZero={showZero} className={className} />;
}
