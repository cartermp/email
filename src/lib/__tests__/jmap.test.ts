process.env.FASTMAIL_API_TOKEN = "test-token";

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { getAccountId, listInboxEmails, loadMoreEmailsFiltered } from "../jmap";

const MAIL_CAP = "urn:ietf:params:jmap:mail";

// ---------------------------------------------------------------------------
// Fetch mock (installed once for the whole file)
// ---------------------------------------------------------------------------

let capturedBodies: unknown[] = [];
let mockResponses: unknown[] = [];

globalThis.fetch = async (_url: string | URL | Request, init?: RequestInit) => {
  const body = init?.body ? JSON.parse(init.body as string) : undefined;
  capturedBodies.push(body);
  const response = mockResponses.shift();
  return {
    ok: true,
    json: async () => response,
  } as Response;
};

function makeEmailResponse(id: string, seen: boolean) {
  return {
    id,
    threadId: `t-${id}`,
    mailboxIds: {},
    subject: `Subject ${id}`,
    from: null,
    to: null,
    receivedAt: "2024-01-01T00:00:00Z",
    preview: "",
    keywords: seen ? { "$seen": true } : {},
    hasAttachment: false,
    size: 0,
  };
}

function makeJmapResponse(
  methodResponses: [string, Record<string, unknown>, string][]
) {
  return { methodResponses };
}

describe("getAccountId", () => {
  it("returns the primary mail account ID", () => {
    const session = {
      primaryAccounts: { [MAIL_CAP]: "abc-123" },
    } as any;
    assert.equal(getAccountId(session), "abc-123");
  });

  it("throws when the mail capability is absent", () => {
    const session = { primaryAccounts: {} } as any;
    assert.throws(() => getAccountId(session), /No primary mail account/);
  });

  it("throws when primaryAccounts is empty", () => {
    const session = { primaryAccounts: { "urn:ietf:params:jmap:core": "x" } } as any;
    assert.throws(() => getAccountId(session));
  });
});

// ---------------------------------------------------------------------------
// listInboxEmails
// ---------------------------------------------------------------------------

describe("listInboxEmails", () => {
  function setupMock(unreads: unknown[], unreadTotal: number, reads: unknown[], readTotal: number) {
    capturedBodies = [];
    mockResponses = [
      makeJmapResponse([
        ["Email/queryResponse", { ids: unreads.map((e: any) => e.id), total: unreadTotal }, "uq"],
        ["Email/gotResponse",   { list: unreads }, "ug"],
        ["Email/queryResponse", { ids: reads.map((e: any) => e.id), total: readTotal }, "rq"],
        ["Email/gotResponse",   { list: reads }, "rg"],
      ]),
    ];
  }

  it("issues a single batched request with four method calls", async () => {
    setupMock([], 0, [], 0);
    await listInboxEmails("https://api.example.com/jmap", "acct1", "mbox1");
    assert.equal(capturedBodies.length, 1);
    const body = capturedBodies[0] as any;
    assert.equal(body.methodCalls.length, 4);
  });

  it("uses notKeyword:$seen for the unread query", async () => {
    setupMock([], 0, [], 0);
    await listInboxEmails("https://api.example.com/jmap", "acct1", "mbox1");
    const calls = (capturedBodies[0] as any).methodCalls;
    const [unreadQueryName, unreadQueryArgs] = calls[0];
    assert.equal(unreadQueryName, "Email/query");
    assert.deepEqual(unreadQueryArgs.filter, { inMailbox: "mbox1", notKeyword: "$seen" });
  });

  it("uses hasKeyword:$seen for the read query", async () => {
    setupMock([], 0, [], 0);
    await listInboxEmails("https://api.example.com/jmap", "acct1", "mbox1");
    const calls = (capturedBodies[0] as any).methodCalls;
    const [readQueryName, readQueryArgs] = calls[2];
    assert.equal(readQueryName, "Email/query");
    assert.deepEqual(readQueryArgs.filter, { inMailbox: "mbox1", hasKeyword: "$seen" });
  });

  it("sorts both queries by receivedAt descending", async () => {
    setupMock([], 0, [], 0);
    await listInboxEmails("https://api.example.com/jmap", "acct1", "mbox1");
    const calls = (capturedBodies[0] as any).methodCalls;
    const expectedSort = [{ property: "receivedAt", isAscending: false }];
    assert.deepEqual(calls[0][1].sort, expectedSort);
    assert.deepEqual(calls[2][1].sort, expectedSort);
  });

  it("uses distinct method call IDs for each call", async () => {
    setupMock([], 0, [], 0);
    await listInboxEmails("https://api.example.com/jmap", "acct1", "mbox1");
    const ids = (capturedBodies[0] as any).methodCalls.map((c: any) => c[2]);
    assert.equal(new Set(ids).size, 4, "all four call IDs must be unique");
  });

  it("returns unreads and reads in separate buckets", async () => {
    const unread = makeEmailResponse("u1", false);
    const read = makeEmailResponse("r1", true);
    setupMock([unread], 1, [read], 1);
    const result = await listInboxEmails("https://api.example.com/jmap", "acct1", "mbox1");
    assert.equal(result.unreads.length, 1);
    assert.equal(result.unreads[0].id, "u1");
    assert.equal(result.reads.length, 1);
    assert.equal(result.reads[0].id, "r1");
  });

  it("returns correct totals from query responses", async () => {
    setupMock([], 7, [], 42);
    const result = await listInboxEmails("https://api.example.com/jmap", "acct1", "mbox1");
    assert.equal(result.unreadTotal, 7);
    assert.equal(result.readTotal, 42);
  });

  it("returns empty buckets when server returns no emails", async () => {
    setupMock([], 0, [], 0);
    const result = await listInboxEmails("https://api.example.com/jmap", "acct1", "mbox1");
    assert.deepEqual(result.unreads, []);
    assert.deepEqual(result.reads, []);
    assert.equal(result.unreadTotal, 0);
    assert.equal(result.readTotal, 0);
  });

  it("applies the limit parameter to both queries", async () => {
    setupMock([], 0, [], 0);
    await listInboxEmails("https://api.example.com/jmap", "acct1", "mbox1", 25);
    const calls = (capturedBodies[0] as any).methodCalls;
    assert.equal(calls[0][1].limit, 25);
    assert.equal(calls[2][1].limit, 25);
  });

  it("both queries start at position 0", async () => {
    setupMock([], 0, [], 0);
    await listInboxEmails("https://api.example.com/jmap", "acct1", "mbox1");
    const calls = (capturedBodies[0] as any).methodCalls;
    assert.equal(calls[0][1].position, 0);
    assert.equal(calls[2][1].position, 0);
  });
});

// ---------------------------------------------------------------------------
// loadMoreEmailsFiltered
// ---------------------------------------------------------------------------

describe("loadMoreEmailsFiltered", () => {
  function setupMock(emails: unknown[], total: number) {
    capturedBodies = [];
    mockResponses = [
      makeJmapResponse([
        ["Email/queryResponse", { ids: emails.map((e: any) => e.id), total }, "0"],
        ["Email/gotResponse",   { list: emails }, "1"],
      ]),
    ];
  }

  it('uses notKeyword:$seen when filter is "unread"', async () => {
    setupMock([], 0);
    await loadMoreEmailsFiltered("https://api.example.com/jmap", "acct1", "mbox1", "unread", 0);
    const call = (capturedBodies[0] as any).methodCalls[0];
    assert.deepEqual(call[1].filter, { inMailbox: "mbox1", notKeyword: "$seen" });
  });

  it('uses hasKeyword:$seen when filter is "read"', async () => {
    setupMock([], 0);
    await loadMoreEmailsFiltered("https://api.example.com/jmap", "acct1", "mbox1", "read", 0);
    const call = (capturedBodies[0] as any).methodCalls[0];
    assert.deepEqual(call[1].filter, { inMailbox: "mbox1", hasKeyword: "$seen" });
  });

  it("passes the position parameter to the query", async () => {
    setupMock([], 0);
    await loadMoreEmailsFiltered("https://api.example.com/jmap", "acct1", "mbox1", "unread", 30);
    const call = (capturedBodies[0] as any).methodCalls[0];
    assert.equal(call[1].position, 30);
  });

  it("sorts by receivedAt descending", async () => {
    setupMock([], 0);
    await loadMoreEmailsFiltered("https://api.example.com/jmap", "acct1", "mbox1", "read", 0);
    const call = (capturedBodies[0] as any).methodCalls[0];
    assert.deepEqual(call[1].sort, [{ property: "receivedAt", isAscending: false }]);
  });

  it("returns emails and total from the response", async () => {
    const email = makeEmailResponse("e1", false);
    setupMock([email], 99);
    const result = await loadMoreEmailsFiltered("https://api.example.com/jmap", "acct1", "mbox1", "unread", 50);
    assert.equal(result.emails.length, 1);
    assert.equal(result.emails[0].id, "e1");
    assert.equal(result.total, 99);
  });

  it("returns empty emails and zero total when server has no results", async () => {
    setupMock([], 0);
    const result = await loadMoreEmailsFiltered("https://api.example.com/jmap", "acct1", "mbox1", "read", 0);
    assert.deepEqual(result.emails, []);
    assert.equal(result.total, 0);
  });
});
