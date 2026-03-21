import { EmailAddress } from "./types";
import { formatAddressRFC } from "./format";

/**
 * Convert HTML email body to plain text for quoting.
 * Converts block-level elements to newlines, strips tags, decodes entities.
 */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/?(p|div|tr|li|h[1-6]|blockquote)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
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
  return `\n\n---\n\n*On ${date}, ${from} wrote:*\n\n${quoted}`;
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
