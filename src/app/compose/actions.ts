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
import { resolveMailboxes } from "@/lib/mailbox";

function splitRaw(raw: string) {
  return raw
    .split(/[,;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface DraftSaveInput {
  draftId: string | null;
  identityId: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  htmlBody: string;
  inlineImages: { id: string; blobId: string; type: string }[];
  attachments: { blobId: string; name: string; type: string }[];
  inReplyToId?: string;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string") throw new Error(`Invalid ${field}`);
  return value;
}

function normalizeInlineImages(
  value: unknown,
): DraftSaveInput["inlineImages"] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).map((image) => {
    if (!image || typeof image !== "object") {
      throw new Error("Invalid inline image");
    }
    const candidate = image as Record<string, unknown>;
    return {
      id: requireString(candidate.id, "inline image id"),
      blobId: requireString(candidate.blobId, "inline image blob"),
      type: requireString(candidate.type, "inline image type"),
    };
  });
}

function normalizeAttachments(
  value: unknown,
): DraftSaveInput["attachments"] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 100).map((attachment) => {
    if (!attachment || typeof attachment !== "object") {
      throw new Error("Invalid attachment");
    }
    const candidate = attachment as Record<string, unknown>;
    return {
      blobId: requireString(candidate.blobId, "attachment blob"),
      name: requireString(candidate.name, "attachment name"),
      type: requireString(candidate.type, "attachment type"),
    };
  });
}

export async function saveDraftAction(
  input: DraftSaveInput
): Promise<{ draftId: string }> {
  const t = Date.now();
  const sessionData = await auth();
  if (!sessionData?.user) throw new Error("Unauthorized");
  const identityId = requireString(input?.identityId, "identity");
  const to = requireString(input?.to, "to");
  const cc = requireString(input?.cc, "cc");
  const bcc = requireString(input?.bcc, "bcc");
  const subject = requireString(input?.subject, "subject");
  const body = requireString(input?.body, "body");
  const htmlBody = requireString(input?.htmlBody, "HTML body");
  const draftIdInput =
    input?.draftId === null
      ? null
      : requireString(input?.draftId, "draft id");
  const inReplyToId =
    input?.inReplyToId === undefined
      ? undefined
      : requireString(input.inReplyToId, "reply target");
  const inlineImages = normalizeInlineImages(input?.inlineImages);
  const attachments = normalizeAttachments(input?.attachments);
  const session = await getSession();
  const accountId = getAccountId(session);
  const [mailboxes, identities] = await Promise.all([
    getMailboxes(session.apiUrl, accountId),
    getIdentities(session.apiUrl, accountId),
  ]);
  const draftsMailbox = resolveMailboxes(mailboxes).drafts;
  if (!draftsMailbox) throw new Error("No drafts mailbox found");
  const identity = identities.find((candidate) => candidate.id === identityId);
  if (!identity) throw new Error("Invalid from address");

  const toAddrs = parseAddresses(splitRaw(to), { strict: false });
  const ccAddrs = parseAddresses(splitRaw(cc), { strict: false });
  const bccAddrs = parseAddresses(splitRaw(bcc), { strict: false });

  const draftId = await saveDraft(
    session.apiUrl,
    accountId,
    draftsMailbox.id,
    {
      from: { name: identity.name, email: identity.email },
      to: toAddrs,
      cc: ccAddrs,
      bcc: bccAddrs,
      subject,
      body,
      htmlBody,
      inlineImages,
      attachments,
      inReplyToId,
    },
    draftIdInput
  );

  log.info({
    is_update: !!draftIdInput,
    prev_draft_id: draftIdInput ?? undefined,
    new_draft_id: draftId,
    to_count: toAddrs.length,
    cc_count: ccAddrs.length,
    bcc_count: bccAddrs.length,
    subject_len: subject.length,
    body_len: body.length,
    inline_image_count: inlineImages.length,
    attachment_count: attachments.length,
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
