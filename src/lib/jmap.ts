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

const EMAIL_LIST_PROPERTIES = [
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
];

export async function listEmails(
  apiUrl: string,
  accountId: string,
  mailboxId: string,
  limit = 50,
  position = 0
): Promise<{ emails: Email[]; total: number }> {
  const data = await jmapCall(apiUrl, [
    [
      "Email/query",
      {
        accountId,
        filter: { inMailbox: mailboxId },
        sort: [{ property: "receivedAt", isAscending: false }],
        limit,
        position,
      },
      "0",
    ],
    [
      "Email/get",
      {
        accountId,
        "#ids": { resultOf: "0", name: "Email/query", path: "/ids" },
        properties: EMAIL_LIST_PROPERTIES,
      },
      "1",
    ],
  ]);
  const [, queryResult] = data.methodResponses[0];
  const [, getResult] = data.methodResponses[1];
  return {
    emails: (getResult.list as Email[]) ?? [],
    total: (queryResult.total as number) ?? 0,
  };
}

export async function searchEmails(
  apiUrl: string,
  accountId: string,
  query: string,
  limit = 50
): Promise<Email[]> {
  const data = await jmapCall(apiUrl, [
    [
      "Email/query",
      {
        accountId,
        filter: { text: query },
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
        properties: EMAIL_LIST_PROPERTIES,
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
          "messageId",
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

export async function markAsRead(
  apiUrl: string,
  accountId: string,
  emailId: string
): Promise<void> {
  await jmapCall(apiUrl, [
    [
      "Email/set",
      {
        accountId,
        update: { [emailId]: { "keywords/$seen": true } },
      },
      "0",
    ],
  ]);
}

export async function uploadBlob(
  uploadUrl: string,
  accountId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<{ blobId: string; type: string; size: number }> {
  const url = uploadUrl.replace("{accountId}", accountId);
  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": contentType },
    body: data,
  });
  if (!res.ok) throw new Error(`Blob upload failed: ${res.statusText}`);
  return res.json();
}

export interface InlineImage {
  id: string;
  blobId: string;
  type: string;
}

function parseAddresses(addrs: string[]): { name: string | null; email: string }[] {
  return addrs.map((addr) => {
    const m = addr.match(/^(.+?)\s*<(.+?)>$/);
    if (m) return { name: m[1].trim(), email: m[2].trim() };
    return { name: null, email: addr.trim() };
  });
}

export async function sendEmail(
  apiUrl: string,
  accountId: string,
  {
    identityId,
    from,
    to,
    cc,
    bcc,
    subject,
    textBody,
    htmlBody,
    inlineImages,
    inReplyToId,
  }: {
    identityId: string;
    from: { name: string; email: string };
    to: string[];
    cc?: string[];
    bcc?: string[];
    subject: string;
    textBody: string;
    htmlBody: string;
    inlineImages?: InlineImage[];
    inReplyToId?: string;
  }
): Promise<{ emailId: string; submissionId: string }> {
  const toAddresses = parseAddresses(to);

  const alternativePart = {
    type: "multipart/alternative",
    subParts: [
      { partId: "text", type: "text/plain" },
      { partId: "html", type: "text/html" },
    ],
  };

  const bodyStructure =
    inlineImages && inlineImages.length > 0
      ? {
          type: "multipart/related",
          subParts: [
            alternativePart,
            ...inlineImages.map((img) => ({
              type: img.type,
              blobId: img.blobId,
              cid: `${img.id}@mail`,
              disposition: "inline",
            })),
          ],
        }
      : alternativePart;

  const emailCreate: Record<string, unknown> = {
    mailboxIds: {},
    from: [from],
    to: toAddresses,
    subject,
    bodyStructure,
    bodyValues: {
      text: { value: textBody, charset: "utf-8" },
      html: { value: htmlBody, charset: "utf-8" },
    },
  };

  if (cc && cc.length > 0) emailCreate.cc = parseAddresses(cc);
  if (bcc && bcc.length > 0) emailCreate.bcc = parseAddresses(bcc);
  if (inReplyToId) emailCreate.inReplyTo = [inReplyToId];

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
