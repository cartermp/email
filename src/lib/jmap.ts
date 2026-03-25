import { Email, Identity, JMAPSession, Mailbox } from "./types";
import { log } from "./logger";

const SESSION_URL = "https://api.fastmail.com/jmap/session";

const JMAP_USING = [
  "urn:ietf:params:jmap:core",
  "urn:ietf:params:jmap:mail",
  "urn:ietf:params:jmap:submission",
];

type MethodCall = [string, Record<string, unknown>, string];

function authHeader() {
  const token = process.env.FASTMAIL_API_TOKEN;
  if (!token) throw new Error("FASTMAIL_API_TOKEN is not set");
  return { Authorization: `Bearer ${token}` };
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
  const t = Date.now();
  const methods = methodCalls.map(([name]) => name);
  // accountId is present in every method call's params object
  const accountId = methodCalls[0]?.[1]?.accountId as string | undefined;

  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({ using: JMAP_USING, methodCalls }),
    cache: "no-store",
  });

  if (!res.ok) {
    log.error(
      { methods, method_count: methodCalls.length, account_id: accountId, http_status: res.status, duration_ms: Date.now() - t },
      "jmap.error"
    );
    throw new Error(`JMAP call failed: ${res.statusText}`);
  }

  const data: { methodResponses: [string, Record<string, unknown>, string][] } = await res.json();
  log.info(
    { methods, method_count: methodCalls.length, account_id: accountId, response_count: data.methodResponses.length, duration_ms: Date.now() - t },
    "jmap.call"
  );
  return data;
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

/**
 * Fetch the inbox in two separate queries (unread + read) batched in one HTTP
 * request. Unreads always appear before reads in the combined result.
 */
export async function listInboxEmails(
  apiUrl: string,
  accountId: string,
  mailboxId: string,
  limit = 50
): Promise<{ unreads: Email[]; unreadTotal: number; reads: Email[]; readTotal: number }> {
  const data = await jmapCall(apiUrl, [
    ["Email/query", {
      accountId,
      filter: { inMailbox: mailboxId, notKeyword: "$seen" },
      sort: [{ property: "receivedAt", isAscending: false }],
      limit, position: 0,
    }, "uq"],
    ["Email/get", {
      accountId,
      "#ids": { resultOf: "uq", name: "Email/query", path: "/ids" },
      properties: EMAIL_LIST_PROPERTIES,
    }, "ug"],
    ["Email/query", {
      accountId,
      filter: { inMailbox: mailboxId, hasKeyword: "$seen" },
      sort: [{ property: "receivedAt", isAscending: false }],
      limit, position: 0,
    }, "rq"],
    ["Email/get", {
      accountId,
      "#ids": { resultOf: "rq", name: "Email/query", path: "/ids" },
      properties: EMAIL_LIST_PROPERTIES,
    }, "rg"],
  ]);
  const [, uq] = data.methodResponses[0];
  const [, ug] = data.methodResponses[1];
  const [, rq] = data.methodResponses[2];
  const [, rg] = data.methodResponses[3];
  return {
    unreads: (ug.list as Email[]) ?? [],
    unreadTotal: (uq.total as number) ?? 0,
    reads: (rg.list as Email[]) ?? [],
    readTotal: (rq.total as number) ?? 0,
  };
}

export async function loadMoreEmailsFiltered(
  apiUrl: string,
  accountId: string,
  mailboxId: string,
  filter: "unread" | "read",
  position: number,
  limit = 50
): Promise<{ emails: Email[]; total: number }> {
  const jmapFilter =
    filter === "unread"
      ? { inMailbox: mailboxId, notKeyword: "$seen" }
      : { inMailbox: mailboxId, hasKeyword: "$seen" };
  const data = await jmapCall(apiUrl, [
    ["Email/query", {
      accountId,
      filter: jmapFilter,
      sort: [{ property: "receivedAt", isAscending: false }],
      limit, position,
    }, "0"],
    ["Email/get", {
      accountId,
      "#ids": { resultOf: "0", name: "Email/query", path: "/ids" },
      properties: EMAIL_LIST_PROPERTIES,
    }, "1"],
  ]);
  const [, queryResult] = data.methodResponses[0];
  const [, getResult] = data.methodResponses[1];
  return {
    emails: (getResult.list as Email[]) ?? [],
    total: (queryResult.total as number) ?? 0,
  };
}

export async function listPinnedEmails(
  apiUrl: string,
  accountId: string
): Promise<Email[]> {
  const data = await jmapCall(apiUrl, [
    [
      "Email/query",
      {
        accountId,
        filter: { hasKeyword: "$flagged" },
        sort: [{ property: "receivedAt", isAscending: false }],
        limit: 100,
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

export async function searchEmails(
  apiUrl: string,
  accountId: string,
  filter: Record<string, unknown>,
  limit = 50
): Promise<Email[]> {
  const data = await jmapCall(apiUrl, [
    [
      "Email/query",
      {
        accountId,
        filter,
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

/**
 * Fetch every email in a thread, with full body values, sorted oldest-first.
 * Uses a two-step JMAP batch: Thread/get → Email/get back-reference.
 */
export async function getThreadEmails(
  apiUrl: string,
  accountId: string,
  threadId: string
): Promise<Email[]> {
  const data = await jmapCall(apiUrl, [
    ["Thread/get", { accountId, ids: [threadId] }, "t"],
    [
      "Email/get",
      {
        accountId,
        "#ids": {
          resultOf: "t",
          name: "Thread/get",
          path: "/list/*/emailIds",
        },
        properties: [
          "id", "messageId", "threadId", "mailboxIds",
          "subject", "from", "to", "cc", "replyTo",
          "receivedAt", "preview", "keywords",
          "hasAttachment", "size",
          "htmlBody", "textBody", "attachments", "bodyValues",
        ],
        fetchHTMLBodyValues: true,
        fetchTextBodyValues: true,
        maxBodyValueBytes: 1024 * 1024,
      },
      "e",
    ],
  ]);
  const emails: Email[] =
    (data.methodResponses.find(([n]) => n === "Email/get")?.[1] as { list?: Email[] })
      ?.list ?? [];
  return emails.sort(
    (a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime()
  );
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

export async function setPin(
  apiUrl: string,
  accountId: string,
  emailId: string,
  pin: boolean
): Promise<void> {
  await jmapCall(apiUrl, [
    [
      "Email/set",
      {
        accountId,
        // JMAP RFC 8620 §5.3: set to true to add a keyword, null to remove it.
        // Setting to false is not valid and is silently ignored by some servers.
        update: { [emailId]: { "keywords/$flagged": pin ? true : null } },
      },
      "0",
    ],
  ]);
}

export async function listDrafts(
  apiUrl: string,
  accountId: string,
  draftsMailboxId: string
): Promise<Email[]> {
  const data = await jmapCall(apiUrl, [
    [
      "Email/query",
      {
        accountId,
        filter: { inMailbox: draftsMailboxId },
        sort: [{ property: "receivedAt", isAscending: false }],
        limit: 50,
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

export async function saveDraft(
  apiUrl: string,
  accountId: string,
  draftsMailboxId: string,
  fields: {
    from: { name: string; email: string };
    to: { name: string | null; email: string }[];
    cc: { name: string | null; email: string }[];
    bcc: { name: string | null; email: string }[];
    subject: string;
    body: string;
  },
  existingDraftId?: string | null
): Promise<string> {
  const draftEmail: Record<string, unknown> = {
    mailboxIds: { [draftsMailboxId]: true },
    keywords: { "$draft": true },
    from: [fields.from],
    subject: fields.subject || "(no subject)",
    bodyStructure: { partId: "body", type: "text/plain" },
    bodyValues: { body: { value: fields.body, charset: "utf-8" } },
  };
  if (fields.to.length) draftEmail.to = fields.to;
  if (fields.cc.length) draftEmail.cc = fields.cc;
  if (fields.bcc.length) draftEmail.bcc = fields.bcc;

  const data = await jmapCall(apiUrl, [
    [
      "Email/set",
      {
        accountId,
        create: { draft: draftEmail },
        ...(existingDraftId ? { destroy: [existingDraftId] } : {}),
      },
      "0",
    ],
  ]);

  const [, result] = data.methodResponses[0];
  const created = (result.created as Record<string, { id: string }> | null)
    ?.draft;
  if (!created?.id) {
    const err = result.notCreated as Record<string, unknown>;
    throw new Error(
      `Draft save failed: ${JSON.stringify(err?.draft ?? result)}`
    );
  }
  return created.id;
}

export async function deleteDraft(
  apiUrl: string,
  accountId: string,
  draftId: string
): Promise<void> {
  await jmapCall(apiUrl, [
    ["Email/set", { accountId, destroy: [draftId] }, "0"],
  ]);
}

export async function markAsRead(
  apiUrl: string,
  accountId: string,
  emailId: string
): Promise<void> {
  await jmapCall(apiUrl, [
    [
      "Email/set",
      { accountId, update: { [emailId]: { "keywords/$seen": true } } },
      "0",
    ],
  ]);
}

export async function markAsUnread(
  apiUrl: string,
  accountId: string,
  emailId: string
): Promise<void> {
  await jmapCall(apiUrl, [
    [
      "Email/set",
      // null removes the keyword per RFC 8620 §5.3
      { accountId, update: { [emailId]: { "keywords/$seen": null } } },
      "0",
    ],
  ]);
}

export async function downloadBlobAsText(
  downloadUrl: string,
  accountId: string,
  blobId: string,
  name = "file"
): Promise<string> {
  const t = Date.now();
  const url = downloadUrl
    .replace(/\{accountId\}/, accountId)
    .replace(/\{blobId\}/, blobId)
    .replace(/\{name\}/, encodeURIComponent(name))
    .replace(/\{type\}/, "text%2Fcalendar");
  const res = await fetch(url, { headers: authHeader(), cache: "no-store" });
  if (!res.ok) {
    log.error({ blob_id: blobId, http_status: res.status, duration_ms: Date.now() - t }, "jmap.blob_download.error");
    throw new Error(`Blob download failed: ${res.statusText}`);
  }
  const text = await res.text();
  log.info({ blob_id: blobId, bytes: text.length, duration_ms: Date.now() - t }, "jmap.blob_download");
  return text;
}

export async function uploadBlob(
  uploadUrl: string,
  accountId: string,
  data: ArrayBuffer,
  contentType: string
): Promise<{ blobId: string; type: string; size: number }> {
  const t = Date.now();
  const url = uploadUrl.replace("{accountId}", accountId);
  const res = await fetch(url, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": contentType },
    body: data,
  });
  if (!res.ok) {
    log.error({ content_type: contentType, bytes: data.byteLength, http_status: res.status, duration_ms: Date.now() - t }, "jmap.blob_upload.error");
    throw new Error(`Blob upload failed: ${res.statusText}`);
  }
  const result: { blobId: string; type: string; size: number } = await res.json();
  log.info({ blob_id: result.blobId, content_type: contentType, bytes: data.byteLength, duration_ms: Date.now() - t }, "jmap.blob_upload");
  return result;
}

export interface InlineImage {
  id: string;
  blobId: string;
  type: string;
}

export function parseAddresses(addrs: string[]): { name: string | null; email: string }[] {
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
    sentMailboxId,
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
    sentMailboxId?: string;
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
    mailboxIds: sentMailboxId ? { [sentMailboxId]: true } : {},
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
  if (inReplyToId) {
    emailCreate.inReplyTo = [inReplyToId];
    emailCreate.references = [inReplyToId];
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

export async function sendCalendarReply(
  apiUrl: string,
  uploadUrl: string,
  accountId: string,
  identityId: string,
  from: { name: string; email: string },
  to: { name: string | null; email: string },
  subject: string,
  textBody: string,
  icsText: string,
  inReplyToId?: string,
  sentMailboxId?: string
): Promise<void> {
  // Upload the ICS blob
  const icsBytes = new TextEncoder().encode(icsText).buffer as ArrayBuffer;
  const { blobId } = await uploadBlob(uploadUrl, accountId, icsBytes, "text/calendar");

  const emailCreate: Record<string, unknown> = {
    mailboxIds: sentMailboxId ? { [sentMailboxId]: true } : {},
    from: [from],
    to: [to],
    subject,
    bodyStructure: {
      type: "multipart/mixed",
      subParts: [
        { partId: "text", type: "text/plain" },
        { blobId, type: "text/calendar", name: "invite.ics", disposition: "attachment" },
      ],
    },
    bodyValues: {
      text: { value: textBody, charset: "utf-8" },
    },
  };
  if (inReplyToId) emailCreate.inReplyTo = [inReplyToId];

  const data = await jmapCall(apiUrl, [
    ["Email/set", { accountId, create: { reply: emailCreate } }, "0"],
    [
      "EmailSubmission/set",
      {
        accountId,
        create: { submission: { identityId, emailId: "#reply" } },
        onSuccessDestroyEmail: [],
      },
      "1",
    ],
  ]);

  const [, emailResult] = data.methodResponses[0];
  const created = (emailResult.created as Record<string, { id: string }>) ?? {};
  if (!created.reply?.id) {
    const err = emailResult.notCreated as Record<string, unknown>;
    throw new Error(`Calendar reply failed: ${JSON.stringify(err?.reply ?? emailResult)}`);
  }
}

/**
 * Apply a keyword patch to many emails in one JMAP call.
 * Use `true` to add a keyword, `null` to remove it (RFC 8620 §5.3).
 */
export async function setKeywordsOnMany(
  apiUrl: string,
  accountId: string,
  emailIds: string[],
  patch: Record<string, boolean | null>
): Promise<void> {
  if (!emailIds.length) return;
  const update: Record<string, Record<string, boolean | null>> = {};
  for (const id of emailIds) update[id] = patch;
  await jmapCall(apiUrl, [["Email/set", { accountId, update }, "0"]]);
}

/**
 * Move emails into a target mailbox, removing them from all current mailboxes.
 */
export async function moveEmailsToMailbox(
  apiUrl: string,
  accountId: string,
  emails: Pick<Email, "id" | "mailboxIds">[],
  targetMailboxId: string
): Promise<void> {
  if (!emails.length) return;
  const update: Record<string, Record<string, boolean | null>> = {};
  for (const email of emails) {
    const patch: Record<string, boolean | null> = {
      [`mailboxIds/${targetMailboxId}`]: true,
    };
    for (const mbId of Object.keys(email.mailboxIds)) {
      if (mbId !== targetMailboxId) patch[`mailboxIds/${mbId}`] = null;
    }
    update[email.id] = patch;
  }
  await jmapCall(apiUrl, [["Email/set", { accountId, update }, "0"]]);
}

// ---------------------------------------------------------------------------
// Contacts search
// ---------------------------------------------------------------------------

export interface ContactSuggestion {
  name: string;
  email: string;
}

export async function searchContacts(
  apiUrl: string,
  accountId: string,
  query: string
): Promise<ContactSuggestion[]> {
  const t = Date.now();
  // Contacts use a separate JMAP capability — issue a dedicated request
  // rather than mixing into the mail-capability batch.
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { ...authHeader(), "Content-Type": "application/json" },
    body: JSON.stringify({
      using: [
        "urn:ietf:params:jmap:core",
        "https://cyrusimap.org/ns/jmap/contacts",
      ],
      methodCalls: [
        ["Contact/query", { accountId, filter: { text: query }, limit: 10 }, "q"],
        [
          "Contact/get",
          {
            accountId,
            "#ids": { resultOf: "q", name: "Contact/query", path: "/ids" },
            properties: ["firstName", "lastName", "emails"],
          },
          "g",
        ],
      ],
    }),
    cache: "no-store",
  });

  const duration_ms = Date.now() - t;

  if (!res.ok) {
    log.warn({ query, http_status: res.status, duration_ms }, "jmap.contacts.error");
    return [];
  }

  const data = await res.json();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const contacts: any[] = data.methodResponses?.[1]?.[1]?.list ?? [];

  const results: ContactSuggestion[] = [];
  for (const c of contacts) {
    const name = [c.firstName, c.lastName].filter(Boolean).join(" ").trim();
    for (const entry of c.emails ?? []) {
      if (entry.value) results.push({ name: name || entry.value, email: entry.value });
    }
  }

  log.info({ query, results: results.length, duration_ms }, "jmap.contacts");
  return results;
}
