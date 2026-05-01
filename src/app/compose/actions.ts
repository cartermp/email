"use server";

import { auth } from "@/auth";
import {
  getSession,
  getAccountId,
  getIdentities,
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
  inReplyToId?: string;
}

export async function saveDraftAction(
  input: DraftSaveInput
): Promise<{ draftId: string }> {
  const t = Date.now();
  const sessionData = await auth();
  if (!sessionData?.user) throw new Error("Unauthorized");
  const session = await getSession();
  const accountId = getAccountId(session);
  const [mailboxes, identities] = await Promise.all([
    getMailboxes(session.apiUrl, accountId),
    getIdentities(session.apiUrl, accountId),
  ]);
  const draftsMailbox = mailboxes.find((m) => m.role === "drafts");
  if (!draftsMailbox) throw new Error("No drafts mailbox found");
  const identity = identities.find((candidate) => candidate.email === input.fromEmail);
  if (!identity) throw new Error("Invalid from address");

  const toAddrs = parseAddresses(splitRaw(input.to), { strict: false });
  const ccAddrs = parseAddresses(splitRaw(input.cc), { strict: false });
  const bccAddrs = parseAddresses(splitRaw(input.bcc), { strict: false });

  const draftId = await saveDraft(
    session.apiUrl,
    accountId,
    draftsMailbox.id,
    {
      from: { name: identity.name, email: identity.email },
      to: toAddrs,
      cc: ccAddrs,
      bcc: bccAddrs,
      subject: input.subject,
      body: input.body,
      inReplyToId: input.inReplyToId,
    },
    input.draftId
  );

  log.info({
    is_update: !!input.draftId,
    prev_draft_id: input.draftId ?? undefined,
    new_draft_id: draftId,
    to_count: toAddrs.length,
    cc_count: ccAddrs.length,
    bcc_count: bccAddrs.length,
    subject_len: input.subject.length,
    body_len: input.body.length,
    duration_ms: Date.now() - t,
  }, "action.save_draft");

  return { draftId };
}

export async function deleteDraftAction(draftId: string): Promise<void> {
  const t = Date.now();
  const sessionData = await auth();
  if (!sessionData?.user) throw new Error("Unauthorized");
  const session = await getSession();
  const accountId = getAccountId(session);
  await deleteDraft(session.apiUrl, accountId, draftId);
  log.info({ draft_id: draftId, duration_ms: Date.now() - t }, "action.delete_draft");
}
