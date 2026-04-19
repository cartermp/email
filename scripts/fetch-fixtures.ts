/**
 * Fetches real emails from Fastmail and saves them as test fixtures.
 *
 * Usage:
 *   pnpm tsx scripts/fetch-fixtures.ts [count]
 *
 * Reads FASTMAIL_API_TOKEN from .env.local.
 * Writes fixtures to src/lib/__tests__/fixtures/<id>.json
 */

import fs from "node:fs";
import path from "node:path";

function parseEnvValue(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const quote = trimmed[0];
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed
      .slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\'/g, "'");
  }

  const commentStart = trimmed.search(/\s#/);
  return commentStart === -1 ? trimmed : trimmed.slice(0, commentStart).trim();
}

function loadEnvFile(filePath: string) {
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const match = trimmed.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;

    process.env[match[1]] = parseEnvValue(match[2]);
  }
}

async function parseJsonResponse<T>(res: Response, label: string): Promise<T> {
  const text = await res.text();

  if (!res.ok) {
    throw new Error(`${label} failed (${res.status}): ${text.slice(0, 200)}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(`${label} returned non-JSON: ${text.slice(0, 200)}`);
  }
}

// Load .env.local manually
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  loadEnvFile(envPath);
}

const TOKEN = process.env.FASTMAIL_API_TOKEN;
if (!TOKEN) {
  console.error("FASTMAIL_API_TOKEN not set in .env.local");
  process.exit(1);
}

const COUNT = parseInt(process.argv[2] ?? "10", 10);
const OUT_DIR = path.resolve(process.cwd(), "src/lib/__tests__/fixtures");
const SESSION_URL = "https://api.fastmail.com/jmap/session";
const JMAP_USING = [
  "urn:ietf:params:jmap:core",
  "urn:ietf:params:jmap:mail",
];

async function jmap(apiUrl: string, methodCalls: unknown[]) {
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ using: JMAP_USING, methodCalls }),
  });
  return parseJsonResponse<{ methodResponses: [string, Record<string, unknown>, string][] }>(
    res,
    "JMAP request"
  );
}

async function main() {
  const session = await fetch(SESSION_URL, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  }).then((r) => parseJsonResponse<Record<string, unknown>>(r, "JMAP session"));

  const apiUrl = session.apiUrl as string;
  const accountId = (session.primaryAccounts as Record<string, string>)[
    "urn:ietf:params:jmap:mail"
  ];

  // Find inbox
  const mbData = await jmap(apiUrl, [
    ["Mailbox/get", { accountId, ids: null }, "0"],
  ]);
  const mailboxes = (mbData.methodResponses[0][1] as { list: { id: string; role: string }[] }).list;
  const inbox = mailboxes.find((m) => m.role === "inbox");
  if (!inbox) { console.error("No inbox found"); process.exit(1); return; }

  // Query + fetch emails
  const data = await jmap(apiUrl, [
    ["Email/query", {
      accountId,
      filter: { inMailbox: inbox.id },
      sort: [{ property: "receivedAt", isAscending: false }],
      limit: COUNT,
    }, "0"],
    ["Email/get", {
      accountId,
      "#ids": { resultOf: "0", name: "Email/query", path: "/ids" },
      properties: [
        "id", "subject", "from", "to", "receivedAt",
        "htmlBody", "textBody", "bodyValues", "preview",
      ],
      fetchHTMLBodyValues: true,
      fetchTextBodyValues: true,
      maxBodyValueBytes: 512 * 1024,
    }, "1"],
  ]);

  const emails = (data.methodResponses[1][1] as { list: unknown[] }).list;

  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const email of emails as Record<string, unknown>[]) {
    const id = email.id as string;
    const subject = (email.subject as string | undefined) ?? "";
    const slug = subject
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/, "")
      .slice(0, 60);
    const file = path.join(OUT_DIR, `${slug ? slug + "_" : ""}${id}.json`);
    fs.writeFileSync(file, JSON.stringify(email, null, 2));
    const hasHtml = (email.htmlBody as unknown[])?.length > 0;
    const hasText = (email.textBody as unknown[])?.length > 0;
    console.log(`✓ ${id} — ${subject || "(no subject)"} [${hasHtml ? "html" : ""}${hasText ? " text" : ""}]`);
  }

  console.log(`\nWrote ${emails.length} fixtures to ${OUT_DIR}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
