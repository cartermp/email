import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccountId, getIdentities, getMailboxes, sendEmail } from "@/lib/jmap";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { identityId, to, cc, bcc, subject, textBody, htmlBody, inlineImages, inReplyToId } = body;

    if (!identityId || !to?.length || !subject || !textBody) {
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
      inReplyToId,
      sentMailboxId,
    });

    return NextResponse.json(result);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    console.error("Send error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
