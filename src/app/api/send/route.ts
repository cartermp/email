import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSession, getAccountId, getIdentities, getMailboxes, sendEmail } from "@/lib/jmap";
import { log } from "@/lib/logger";

function getString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function getOptionalString(value: unknown): string | undefined {
  const normalized = getString(value).trim();
  return normalized || undefined;
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is string => typeof entry === "string")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function getInlineImages(value: unknown): { id: string; blobId: string; type: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const candidate = entry as Record<string, unknown>;
      const id = getOptionalString(candidate.id);
      const blobId = getOptionalString(candidate.blobId);
      const type = getOptionalString(candidate.type);
      return id && blobId && type ? { id, blobId, type } : null;
    })
    .filter((entry): entry is { id: string; blobId: string; type: string } => entry !== null);
}

function getAttachments(value: unknown): { blobId: string; name: string; type: string }[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const candidate = entry as Record<string, unknown>;
      const blobId = getOptionalString(candidate.blobId);
      const name = getOptionalString(candidate.name);
      const type = getOptionalString(candidate.type);
      return blobId && name && type ? { blobId, name, type } : null;
    })
    .filter((entry): entry is { blobId: string; name: string; type: string } => entry !== null);
}

export async function POST(req: NextRequest) {
  const t = Date.now();
  try {
    const sessionData = await auth();
    if (!sessionData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as Record<string, unknown>;
    const identityId = getString(body.identityId);
    const to = getStringArray(body.to);
    const cc = getStringArray(body.cc);
    const bcc = getStringArray(body.bcc);
    const subject = getString(body.subject);
    const textBody = getString(body.textBody);
    const htmlBody = getString(body.htmlBody);
    const inlineImages = getInlineImages(body.inlineImages);
    const attachments = getAttachments(body.attachments);
    const inReplyToId = getOptionalString(body.inReplyToId);

    if (!identityId || !to.length || !subject || !textBody) {
      log.warn({ identityId: !!identityId, to_count: to.length, has_subject: !!subject, has_body: !!textBody }, "route.send.bad_request");
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const session = await getSession();
    const accountId = getAccountId(session);

    // Verify the identity belongs to this account; also resolve the Sent mailbox
    const [identities, mailboxes] = await Promise.all([
      getIdentities(session.apiUrl, accountId),
      getMailboxes(session.apiUrl, accountId),
    ]);
    const identity = identities.find((i) => i.id === identityId);
    if (!identity) {
      log.warn({ identity_id: identityId, duration_ms: Date.now() - t }, "route.send.invalid_identity");
      return NextResponse.json({ error: "Invalid identity" }, { status: 400 });
    }
    const sentMailboxId = mailboxes.find((m) => m.role === "sent")?.id;

    const result = await sendEmail(session.apiUrl, accountId, {
      identityId,
      from: { name: identity.name, email: identity.email },
      to,
      cc,
      bcc,
      subject,
      textBody,
      htmlBody,
      inlineImages,
      attachments,
      inReplyToId,
      sentMailboxId,
    });

    log.info({
      to_count: to.length,
      cc_count: cc.length,
      bcc_count: bcc.length,
      subject_len: subject.length,
      text_len: textBody.length,
      html_len: htmlBody.length,
      inline_image_count: inlineImages?.length ?? 0,
      attachment_count: attachments?.length ?? 0,
      is_reply: !!inReplyToId,
      email_id: result.emailId,
      submission_id: result.submissionId,
      duration_ms: Date.now() - t,
    }, "route.send");

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    log.error({ err: message, duration_ms: Date.now() - t }, "route.send.error");
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
