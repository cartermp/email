import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccountId, getIdentities, getMailboxes, sendEmail } from "@/lib/jmap";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const t = Date.now();
  try {
    const body = await req.json();
    const { identityId, to, cc, bcc, subject, textBody, htmlBody, inlineImages, attachments, inReplyToId } = body;

    if (!identityId || !to?.length || !subject || !textBody) {
      log.warn({ identityId: !!identityId, to_count: to?.length ?? 0, has_subject: !!subject, has_body: !!textBody }, "route.send.bad_request");
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
      from: identity.email,
      to,
      to_count: to.length,
      cc_count: cc?.length ?? 0,
      bcc_count: bcc?.length ?? 0,
      subject,
      text_len: textBody.length,
      html_len: htmlBody?.length ?? 0,
      inline_image_count: inlineImages?.length ?? 0,
      attachment_count: attachments?.length ?? 0,
      is_reply: !!inReplyToId,
      in_reply_to_id: inReplyToId,
      email_id: result.emailId,
      submission_id: result.submissionId,
      duration_ms: Date.now() - t,
    }, "route.send");

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    log.error({ err: message, duration_ms: Date.now() - t }, "route.send.error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
