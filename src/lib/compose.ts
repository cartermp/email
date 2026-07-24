import { EmailAddress } from "./types";
import { formatAddressRFC } from "./format";

/**
 * Convert HTML email body to plain text for quoting.
 * Converts block-level elements to newlines, strips tags, decodes entities.
 */
export function htmlToPlainText(html: string): string {
  return html
    // Strip whole blocks whose content should never appear as text
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    // Convert structural elements to newlines before stripping tags
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|tr|li|h[1-6]|blockquote)[^>]*>/gi, "\n")
    // Strip all remaining tags (including doctype, CDATA, etc.)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function reSubject(subject: string | null): string {
  const s = subject ?? "";
  return /^re:/i.test(s) ? s : `Re: ${s}`;
}

export function fwdSubject(subject: string | null): string {
  const s = subject ?? "";
  return /^fwd?:/i.test(s) ? s : `Fwd: ${s}`;
}

export function addrList(addrs: EmailAddress[] | null): string {
  return (addrs ?? []).map(formatAddressRFC).join(", ");
}

export function buildReplyQuote(
  date: string,
  from: string,
  body: string
): string {
  const quoted = body
    .trimEnd()
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return `\n\n> On ${date}, ${from} wrote:\n>\n${quoted}`;
}

/**
 * Strip all leading `-- \n` signature separators from a Fastmail-stored
 * signature string. Fastmail (and other clients) prepend `-- \n` to the
 * signature content; this removes every such prefix so callers can insert
 * exactly one canonical separator themselves.
 */
export function stripSignatureSeparator(sig: string): string {
  return sig.replace(/^(--[ \t]*\r?\n)+/, "").trimStart();
}

export function formatSignatureForSave(signature: string): string {
  const normalized = signature.trim();
  return normalized ? `-- \n${normalized}` : "";
}

/**
 * Escape RFC-3676 signature separator lines so markdown renderers do not
 * interpret them as Setext heading underlines.
 */
export function normalizeComposeMarkdown(markdown: string): string {
  return markdown.replace(/^--[ \t]*$/gm, "&#45;&#45;");
}

/**
 * Locate reply or forward history so the composer can keep the transport
 * representation intact while presenting only the editable reply by default.
 */
export function quotedSectionStart(markdown: string): number {
  const replyMatch = /(^|\n)> On [^\n]+ wrote:\n/m.exec(markdown);
  const forwardMatch =
    /(^|\n)---\n\n\*\*-+ Forwarded message -+\*\*/m.exec(markdown);
  const starts = [replyMatch, forwardMatch]
    .filter((match): match is RegExpExecArray => match !== null)
    .map((match) => match.index + (match[1] ? 1 : 0));
  return starts.length > 0 ? Math.min(...starts) : -1;
}

export function buildForwardQuote({
  from,
  to,
  date,
  subject,
  body,
}: {
  from: string;
  to: string;
  date: string;
  subject: string;
  body: string;
}): string {
  return `\n\n---\n\n**---------- Forwarded message ----------**\n\n**From:** ${from}  \n**To:** ${to}  \n**Date:** ${date}  \n**Subject:** ${subject}\n\n${body}`;
}
