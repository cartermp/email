/**
 * Parses a user-typed search query into structured fields.
 *
 * Supported prefixes:  from:, to:, cc:, subject:
 * Everything else becomes a full-text filter.
 *
 * Examples:
 *   "from:alice hello world"  → { from: "alice", text: "hello world" }
 *   "to:team@co.com invoices" → { to: "team@co.com", text: "invoices" }
 *   "from:alice to:bob"       → { from: "alice", to: "bob" }
 */

export interface ParsedQuery {
  from?: string;
  to?: string;
  cc?: string;
  subject?: string;
  text?: string;
}

const PREFIXES = ["from", "to", "cc", "subject"] as const;

export function parseSearchQuery(raw: string): ParsedQuery {
  const result: ParsedQuery = {};
  let remaining = raw;

  for (const prefix of PREFIXES) {
    // Match "prefix:value" where value is either a quoted string or a run of non-space chars
    const re = new RegExp(`(?:^|\\s)${prefix}:("([^"]+)"|([^\\s]+))`, "i");
    const m = remaining.match(re);
    if (m) {
      (result as Record<string, string>)[prefix] = (m[2] ?? m[3]).trim();
      remaining = remaining.replace(m[0], " ");
    }
  }

  const text = remaining.replace(/\s+/g, " ").trim();
  if (text) result.text = text;

  return result;
}

export function buildJmapFilter(
  parsed: ParsedQuery
): Record<string, unknown> {
  const conditions: Record<string, string>[] = [];

  if (parsed.from) conditions.push({ from: parsed.from });
  if (parsed.to) conditions.push({ to: parsed.to });
  if (parsed.cc) conditions.push({ cc: parsed.cc });
  if (parsed.subject) conditions.push({ subject: parsed.subject });
  if (parsed.text) conditions.push({ text: parsed.text });

  if (conditions.length === 0) return {};
  if (conditions.length === 1) return conditions[0];
  return { operator: "AND", conditions };
}
