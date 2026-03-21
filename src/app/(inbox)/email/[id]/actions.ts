"use server";

import { getSession, getAccountId, markAsRead } from "@/lib/jmap";

export async function markEmailAsRead(emailId: string): Promise<void> {
  const session = await getSession();
  const accountId = getAccountId(session);
  await markAsRead(session.apiUrl, accountId, emailId);
}
