"use client";

import UnreadCountBadge from "@/components/UnreadCountBadge";
import { useUnreadCount } from "@/components/UnreadCountProvider";

interface Props {
  showZero?: boolean;
  className?: string;
}

export default function LiveUnreadCountBadge({
  showZero = false,
  className = "",
}: Props) {
  const count = useUnreadCount();
  return <UnreadCountBadge count={count} showZero={showZero} className={className} />;
}
