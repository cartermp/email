"use server";

import {
  getSession,
  getAccountId,
  getMailboxes,
  saveDraft,
  deleteDraft,
  parseAddresses,
} from "@/lib/jmap";
import { log } from "@/lib/logger";

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
  const t = Date.now();
  const session = await getSession();
  const accountId = getAccountId(session);
  const mailboxes = await getMailboxes(session.apiUrl, accountId);
  const draftsMailbox = mailboxes.find((m) => m.role === "drafts");
  if (!draftsMailbox) throw new Error("No drafts mailbox found");

  const toAddrs = parseAddresses(splitRaw(input.to));
  const ccAddrs = parseAddresses(splitRaw(input.cc));
  const bccAddrs = parseAddresses(splitRaw(input.bcc));

  const draftId = await saveDraft(
    session.apiUrl,
    accountId,
    draftsMailbox.id,
    {
      from: { name: input.fromName, email: input.fromEmail },
      to: toAddrs,
      cc: ccAddrs,
      bcc: bccAddrs,
      subject: input.subject,
      body: input.body,
    },
    input.draftId
  );

  log.info({
    is_update: !!input.draftId,
    prev_draft_id: input.draftId ?? undefined,
    new_draft_id: draftId,
    from: input.fromEmail,
    to: toAddrs.map((a) => a.email),
    to_count: toAddrs.length,
    cc_count: ccAddrs.length,
    bcc_count: bccAddrs.length,
    subject: input.subject,
    body_len: input.body.length,
    duration_ms: Date.now() - t,
  }, "action.save_draft");

  return { draftId };
}

export async function deleteDraftAction(draftId: string): Promise<void> {
  const t = Date.now();
  const session = await getSession();
  const accountId = getAccountId(session);
  await deleteDraft(session.apiUrl, accountId, draftId);
  log.info({ draft_id: draftId, duration_ms: Date.now() - t }, "action.delete_draft");
}
