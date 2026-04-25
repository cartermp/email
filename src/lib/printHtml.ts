import { JSDOM } from "jsdom";
import { Email } from "@/lib/types";

const BLOCKED_TAGS = [
  "applet",
  "base",
  "button",
  "embed",
  "form",
  "frame",
  "frameset",
  "iframe",
  "input",
  "link",
  "meta",
  "noscript",
  "object",
  "script",
  "select",
  "source",
  "style",
  "textarea",
];

const URL_ATTRIBUTES = new Set([
  "action",
  "formaction",
  "href",
  "poster",
  "src",
  "xlink:href",
]);

const SAFE_DATA_URL_RE = /^data:image\/(?:bmp|gif|jpeg|jpg|png|webp);base64,[a-z0-9+/=\s]+$/i;

function sanitizeCss(css: string): string {
  return css
    .replace(/@import[\s\S]*?;/gi, "")
    .replace(/url\s*\((?:[^)(]|\([^)(]*\))*\)/gi, "")
    .replace(/expression\s*\([^)]*\)/gi, "")
    .replace(/behavior\s*:[^;"}]+;?/gi, "")
    .replace(/-moz-binding\s*:[^;"}]+;?/gi, "")
    .trim();
}

function sanitizeUrl(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("#") ||
    trimmed.startsWith("/") ||
    trimmed.startsWith("./") ||
    trimmed.startsWith("../")
  ) {
    return trimmed;
  }
  if (trimmed.startsWith("cid:")) return trimmed;
  if (trimmed.startsWith("mailto:") || trimmed.startsWith("tel:")) return trimmed;
  if (/^data:/i.test(trimmed)) {
    return SAFE_DATA_URL_RE.test(trimmed) ? trimmed : null;
  }

  try {
    const hasExplicitScheme = /^[a-zA-Z][a-zA-Z\d+.-]*:/.test(trimmed);
    const parsed = new URL(trimmed, "https://email.invalid");
    if (!hasExplicitScheme && !trimmed.startsWith("//")) return trimmed;
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

/**
 * Server-side HTML sanitizer for print views.
 * Parses untrusted email HTML, removes active content, and strips dangerous URL/CSS vectors.
 */
export function sanitizeHtml(html: string): string {
  const dom = new JSDOM(html);
  const { document } = dom.window;

  for (const tag of BLOCKED_TAGS) {
    document.querySelectorAll(tag).forEach((element) => element.remove());
  }

  document.querySelectorAll("*").forEach((element) => {
    for (const attr of Array.from(element.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "srcdoc" || name === "srcset") {
        element.removeAttribute(attr.name);
        continue;
      }

      if (name === "style") {
        const sanitizedStyle = sanitizeCss(attr.value);
        if (sanitizedStyle) {
          element.setAttribute("style", sanitizedStyle);
        } else {
          element.removeAttribute(attr.name);
        }
        continue;
      }

      if (URL_ATTRIBUTES.has(name)) {
        const sanitizedUrl = sanitizeUrl(attr.value);
        if (sanitizedUrl === null) {
          element.removeAttribute(attr.name);
        } else {
          element.setAttribute(attr.name, sanitizedUrl);
        }
      }
    }
  });

  return document.documentElement.outerHTML;
}

export function extractStyles(html: string): string {
  const out: string[] = [];
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let m;
  while ((m = re.exec(html)) !== null) out.push(m[1]);
  return sanitizeCss(out.join("\n"));
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
      bodyType = part.type === "text/html" ? "html" : "text";
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
      emailStyles: extractStyles(rawBody),
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
