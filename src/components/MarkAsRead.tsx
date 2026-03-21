"use client";

import { useEffect } from "react";
import { markEmailAsRead } from "@/app/(inbox)/email/[id]/actions";

interface Props {
  emailId: string;
  alreadyRead: boolean;
}

export default function MarkAsRead({ emailId, alreadyRead }: Props) {
  useEffect(() => {
    if (!alreadyRead) {
      markEmailAsRead(emailId);
    }
  }, [emailId, alreadyRead]);

  return null;
}
