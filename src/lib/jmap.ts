import { Email, Identity, JMAPSession, Mailbox } from "./types";

const TOKEN = process.env.FASTMAIL_API_TOKEN;
const SESSION_URL = "https://api.fastmail.com/jmap/session";

const JMAP_USING = [
  "urn:ietf:params:jmap:core",
  "urn:ietf:params:jmap:mail",
  "urn:ietf:params:jmap:submission",
];

type MethodCall = [string, Record<string, unknown>, string];

function authHeader() {
  if (!TOKEN) throw new Error("FASTMAIL_API_TOKEN is not set");
  return { Authorization: `Bearer ${TOKEN}` };
}

export async function getSession(): Promise<JMAPSession> {
  const res = await fetch(SESSION_URL, {
    headers: authHeader(),
    next: { revalidate: 3600 },
  });
  if (!res.ok) throw new Error(`JMAP session failed: ${res.statusText}`);
  return res.json();
}

export async function jmapCall(
  apiUrl: string,
  methodCalls: MethodCall[]
): Promise<{ methodResponses: [string, Record<string, unknown>, string][] }> {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ using: JMAP_USING, methodCalls }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`JMAP call failed: ${res.statusText}`);
  return res.json();
}

// Get the primary mail account ID from a session
export function getAccountId(session: JMAPSession): string {
  const id = session.primaryAccounts["urn:ietf:params:jmap:mail"];
  if (!id) throw new Error("No primary mail account found");
  return id;
}

export async function getMailboxes(
  apiUrl: string,
  accountId: string
): Promise<Mailbox[]> {
  const data = await jmapCall(apiUrl, [
    ["Mailbox/get", { accountId, ids: null }, "0"],
  ]);
  const [, result] = data.methodResponses[0];
  return (result.list as Mailbox[]) ?? [];
}

export async function listEmails(
  apiUrl: string,
  accountId: string,
  mailboxId: string,
  limit = 50
): Promise<Email[]> {
  const data = await jmapCall(apiUrl, [
    [
      "Email/query",
      {
        accountId,
        filter: { inMailbox: mailboxId },
        sort: [{ property: "receivedAt", isAscending: false }],
        limit,
      },
      "0",
    ],
    [
      "Email/get",
      {
        accountId,
        "#ids": { resultOf: "0", name: "Email/query", path: "/ids" },
        properties: [
          "id",
          "threadId",
          "mailboxIds",
          "subject",
          "from",
          "to",
          "receivedAt",
          "preview",
          "keywords",
          "hasAttachment",
          "size",
        ],
      },
      "1",
    ],
  ]);
  const [, result] = data.methodResponses[1];
  return (result.list as Email[]) ?? [];
}

export async function getEmail(
  apiUrl: string,
  accountId: string,
  emailId: string
): Promise<Email | null> {
  const data = await jmapCall(apiUrl, [
    [
      "Email/get",
      {
        accountId,
        ids: [emailId],
        properties: [
          "id",
          "threadId",
          "mailboxIds",
          "subject",
          "from",
          "to",
          "cc",
          "replyTo",
          "receivedAt",
          "preview",
          "keywords",
          "hasAttachment",
          "size",
          "htmlBody",
          "textBody",
          "attachments",
          "bodyValues",
        ],
        fetchHTMLBodyValues: true,
        fetchTextBodyValues: true,
        maxBodyValueBytes: 1024 * 1024, // 1MB
      },
      "0",
    ],
  ]);
  const [, result] = data.methodResponses[0];
  const list = result.list as Email[];
  return list?.[0] ?? null;
}

export async function getIdentities(
  apiUrl: string,
  accountId: string
): Promise<Identity[]> {
  const data = await jmapCall(apiUrl, [
    ["Identity/get", { accountId, ids: null }, "0"],
  ]);
  const [, result] = data.methodResponses[0];
  return (result.list as Identity[]) ?? [];
}

export async function sendEmail(
  apiUrl: string,
  accountId: string,
  {
    identityId,
    from,
    to,
    subject,
    textBody,
    htmlBody,
    inReplyToId,
  }: {
    identityId: string;
    from: { name: string; email: string };
    to: string[];
    subject: string;
    textBody: string;
    htmlBody: string;
    inReplyToId?: string;
  }
): Promise<{ emailId: string; submissionId: string }> {
  const toAddresses = to.map((addr) => {
    const m = addr.match(/^(.+?)\s*<(.+?)>$/);
    if (m) return { name: m[1].trim(), email: m[2].trim() };
    return { name: null, email: addr.trim() };
  });

  const emailCreate: Record<string, unknown> = {
    mailboxIds: {},
    from: [from],
    to: toAddresses,
    subject,
    bodyStructure: {
      type: "multipart/alternative",
      subParts: [
        { partId: "text", type: "text/plain" },
        { partId: "html", type: "text/html" },
      ],
    },
    bodyValues: {
      text: { value: textBody, charset: "utf-8" },
      html: { value: htmlBody, charset: "utf-8" },
    },
  };

  if (inReplyToId) {
    emailCreate.inReplyTo = [inReplyToId];
  }

  const data = await jmapCall(apiUrl, [
    ["Email/set", { accountId, create: { draft: emailCreate } }, "0"],
    [
      "EmailSubmission/set",
      {
        accountId,
        create: {
          submission: {
            identityId,
            emailId: "#draft",
          },
        },
        onSuccessDestroyEmail: [],
      },
      "1",
    ],
  ]);

  const [, emailResult] = data.methodResponses[0];
  const [, submissionResult] = data.methodResponses[1];

  const created = (emailResult.created as Record<string, { id: string }>) ?? {};
  const subCreated =
    (submissionResult.created as Record<string, { id: string }>) ?? {};

  const emailId = created.draft?.id;
  const submissionId = subCreated.submission?.id;

  if (!emailId) {
    const err = emailResult.notCreated as Record<string, unknown>;
    throw new Error(
      `Email create failed: ${JSON.stringify(err?.draft ?? emailResult)}`
    );
  }

  return { emailId, submissionId };
}
