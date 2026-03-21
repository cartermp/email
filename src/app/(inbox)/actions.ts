"use server";

import { getSession, getAccountId, listEmails, searchEmails } from "@/lib/jmap";
import { parseSearchQuery, buildJmapFilter } from "@/lib/search";
import { Email } from "@/lib/types";

export async function loadMoreEmails(
  inboxId: string,
  position: number
): Promise<{ emails: Email[]; total: number }> {
  const session = await getSession();
  const accountId = getAccountId(session);
  return listEmails(session.apiUrl, accountId, inboxId, 50, position);
}

export async function searchEmailsAction(query: string): Promise<Email[]> {
  const session = await getSession();
  const accountId = getAccountId(session);
  const filter = buildJmapFilter(parseSearchQuery(query));
  return searchEmails(session.apiUrl, accountId, filter);
}
