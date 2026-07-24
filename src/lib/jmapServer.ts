import { cache } from "react";
import {
  getAccountId,
  getMailboxes,
  getSession,
} from "@/lib/jmap";

export const getJmapContext = cache(async () => {
  const session = await getSession();
  return {
    session,
    accountId: getAccountId(session),
  };
});

export const getJmapMailboxContext = cache(async () => {
  const { session, accountId } = await getJmapContext();
  const mailboxes = await getMailboxes(session.apiUrl, accountId);
  return { session, accountId, mailboxes };
});
