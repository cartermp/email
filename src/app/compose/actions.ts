"use server";

import {
  getSession,
  getAccountId,
  getMailboxes,
  saveDraft,
  deleteDraft,
  parseAddresses,
} from "@/lib/jmap";

function splitRaw(raw: string) {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface DraftSaveInput {
  draftId: string | null;
  fromName: string;
  fromEmail: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
}

export async function saveDraftAction(
  input: DraftSaveInput
): Promise<{ draftId: string }> {
  const session = await getSession();
  const accountId = getAccountId(session);
  const mailboxes = await getMailboxes(session.apiUrl, accountId);
  const draftsMailbox = mailboxes.find((m) => m.role === "drafts");
  if (!draftsMailbox) throw new Error("No drafts mailbox found");

  const draftId = await saveDraft(
    session.apiUrl,
    accountId,
    draftsMailbox.id,
    {
      from: { name: input.fromName, email: input.fromEmail },
      to: parseAddresses(splitRaw(input.to)),
      cc: parseAddresses(splitRaw(input.cc)),
      bcc: parseAddresses(splitRaw(input.bcc)),
      subject: input.subject,
      body: input.body,
    },
    input.draftId
  );

  return { draftId };
}

export async function deleteDraftAction(draftId: string): Promise<void> {
  const session = await getSession();
  const accountId = getAccountId(session);
  await deleteDraft(session.apiUrl, accountId, draftId);
}
