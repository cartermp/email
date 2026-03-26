import { Email } from "@/lib/types";

/**
 * Server-side HTML sanitizer — no DOM required.
 * Strips scripts and event handlers; keeps styles and layout intact.
 */
export function sanitizeHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/\s+on[a-zA-Z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\s+on[a-zA-Z]+\s*=\s*'[^']*'/gi, "")
    .replace(/(href|src|action)\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, "$1=\"#\"");
}

export function extractStyles(html: string): string {
  const out: string[] = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return out.join("\n");
}

export function extractBodyContent(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (m) return m[1];
  return html
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .trim();
}

/** Resolve the printable body HTML and styles from an Email object. */
export function resolvePrintBody(email: Email): {
  bodyHtml: string;
  emailStyles: string;
  bodyType: "html" | "text";
} {
  let rawBody: string | null = null;
  let bodyType: "html" | "text" = "text";

  if (email.htmlBody?.length > 0) {
    const part = email.htmlBody[0];
    if (part.partId && email.bodyValues?.[part.partId]) {
      rawBody = email.bodyValues[part.partId].value;
      bodyType = "html";
    }
  }
  if (!rawBody && email.textBody?.length > 0) {
    const part = email.textBody[0];
    if (part.partId && email.bodyValues?.[part.partId]) {
      rawBody = email.bodyValues[part.partId].value;
      bodyType = "text";
    }
  }

  if (bodyType === "html" && rawBody) {
    const sanitized = sanitizeHtml(rawBody);
    return {
      bodyHtml: extractBodyContent(sanitized),
      emailStyles: extractStyles(sanitized),
      bodyType,
    };
  }

  if (rawBody) {
    return {
      bodyHtml: rawBody
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;"),
      emailStyles: "",
      bodyType: "text",
    };
  }

  return { bodyHtml: "", emailStyles: "", bodyType: "text" };
}
