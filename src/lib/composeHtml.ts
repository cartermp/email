const EMAIL_CONTENT_CSS = `
  .mail-content {
    box-sizing: border-box;
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
    padding: 24px;
  }
  .mail-authored-content {
    color: #172033;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    font-size: 15px;
    line-height: 1.65;
    overflow-wrap: anywhere;
  }
  .mail-authored-content > :first-child { margin-top: 0; }
  .mail-authored-content > :last-child { margin-bottom: 0; }
  .mail-authored-content h1 { font-size: 1.45em; line-height: 1.25; font-weight: 650; margin: 1.4em 0 0.5em; }
  .mail-authored-content h2 { font-size: 1.25em; line-height: 1.3; font-weight: 650; margin: 1.4em 0 0.5em; }
  .mail-authored-content h3 { font-size: 1.08em; line-height: 1.35; font-weight: 650; margin: 1.4em 0 0.5em; }
  .mail-authored-content p { margin: 0 0 1em; }
  .mail-authored-content a { color: #1d4ed8; text-decoration: underline; text-underline-offset: 2px; }
  .mail-authored-content ul, .mail-authored-content ol { padding-left: 1.5em; margin: 0 0 1em; }
  .mail-authored-content li { margin: 0.2em 0; }
  .mail-authored-content hr { border: 0; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
  .mail-authored-content img { max-width: 100%; height: auto; display: block; margin: 1em 0; }
  .mail-authored-content code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    background: #f1f5f9;
    padding: 0.15em 0.35em;
    border-radius: 4px;
    font-size: 0.9em;
  }
  .mail-authored-content pre {
    box-sizing: border-box;
    max-width: 100%;
    padding: 14px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
    overflow-x: auto;
    white-space: pre-wrap;
  }
  .mail-authored-content pre code { padding: 0; border: 0; background: transparent; }
  .mail-authored-content blockquote {
    margin: 1em 0;
    padding: 0 0 0 14px;
    border-left: 2px solid #cbd5e1;
    color: #64748b;
  }
  .mail-authored-content table { max-width: 100%; border-collapse: collapse; }
  .mail-authored-content th, .mail-authored-content td { padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left; }
`;

const FORWARDED_HTML_START = "<!--mail-forward-start-->";
const FORWARDED_HTML_END = "<!--mail-forward-end-->";

function extractBodyContent(html: string): string {
  const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (body) return body[1];
  return html
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .trim();
}

function extractHeadStyles(html: string): string {
  const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? "";
  return (head.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) ?? []).join("\n");
}

function extractBodyPresentation(html: string): { className: string; style: string } {
  const attributes = html.match(/<body\b([^>]*)>/i)?.[1] ?? "";
  const className = attributes.match(/\bclass\s*=\s*(["'])(.*?)\1/i)?.[2] ?? "";
  const style = attributes.match(/\bstyle\s*=\s*(["'])(.*?)\1/i)?.[2] ?? "";
  return { className, style };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export interface ForwardedMessageHeaders {
  from: string;
  to: string;
  date: string;
  subject: string;
}

/** Build the preserved original-message fragment used by rich HTML forwards. */
export function buildForwardedHtml(
  originalHtml: string,
  headers: ForwardedMessageHeaders,
): string {
  const originalStyles = extractHeadStyles(originalHtml);
  const originalBody = extractBodyContent(originalHtml)
    .replaceAll(FORWARDED_HTML_START, "")
    .replaceAll(FORWARDED_HTML_END, "");
  const bodyPresentation = extractBodyPresentation(originalHtml);
  const classAttribute = bodyPresentation.className
    ? ` class="${escapeHtml(bodyPresentation.className)}"`
    : "";
  const styleAttribute = bodyPresentation.style
    ? ` style="${escapeHtml(bodyPresentation.style)}"`
    : "";

  return `${originalStyles}
<div data-forwarded-metadata="true" style="margin:0 0 18px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:13px;line-height:1.55;color:#3f3f46;">
  <div style="margin:0 0 8px;font-weight:600;">---------- Forwarded message ----------</div>
  <div><strong>From:</strong> ${escapeHtml(headers.from)}</div>
  <div><strong>To:</strong> ${escapeHtml(headers.to)}</div>
  <div><strong>Date:</strong> ${escapeHtml(headers.date)}</div>
  <div><strong>Subject:</strong> ${escapeHtml(headers.subject)}</div>
</div>
<div data-forwarded-original="true"${classAttribute}${styleAttribute}>${originalBody}</div>`;
}

/** Replace CID references without otherwise rewriting the original HTML. */
export function replaceCidReferences(
  html: string,
  replacements: ReadonlyArray<{ cid: string; url: string }>,
): string {
  const byCid = new Map(
    replacements.map(({ cid, url }) => [normalizeCid(cid), url]),
  );
  if (byCid.size === 0) return html;

  return html.replace(/cid:([^\s"'()<>]+)/gi, (match, cid: string) => {
    return byCid.get(normalizeCid(cid)) ?? match;
  });
}

function normalizeCid(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Preserve malformed identifiers exactly as received.
  }
  return decoded.replace(/^cid:/i, "").replace(/^<|>$/g, "").trim().toLowerCase();
}

export function appendForwardedHtml(forwardedHtml: string): string {
  return `<div data-forwarded-email="true" style="margin-top:24px;padding-top:16px;border-top:1px solid #e4e4e7;">${FORWARDED_HTML_START}${forwardedHtml}${FORWARDED_HTML_END}</div>`;
}

export function combineEmailHtml(
  authoredHtml: string,
  forwardedHtml?: string,
): string {
  const authored = `<div class="mail-authored-content" style="color:#172033;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.65;overflow-wrap:anywhere;">${authoredHtml}</div>`;
  return forwardedHtml
    ? `${authored}${appendForwardedHtml(forwardedHtml)}`
    : authored;
}

export function extractForwardedHtml(draftHtml: string): string | undefined {
  const start = draftHtml.indexOf(FORWARDED_HTML_START);
  const end = draftHtml.indexOf(FORWARDED_HTML_END);
  if (start < 0 || end <= start) return undefined;
  return draftHtml.slice(start + FORWARDED_HTML_START.length, end);
}

/**
 * Mark the final Markdown blockquote as the quoted part of a reply.
 * The editor remains pure Markdown; this transport-only annotation lets email
 * clients collapse the quote and lets our thread view hide duplicate history.
 */
export function markQuotedReplyHtml(body: string): string {
  const openings = [...body.matchAll(/<blockquote(?:\s[^>]*)?>/gi)];
  const last = openings[openings.length - 1];
  if (!last || last.index === undefined) return body;

  const opening = last[0];
  if (
    /\btype\s*=\s*["']cite["']/i.test(opening) ||
    /\bdata-quoted-reply\s*=/i.test(opening)
  ) {
    return body;
  }

  const replacement = opening.replace(
    /^<blockquote/i,
    '<blockquote type="cite" class="email-client-quoted-reply" data-quoted-reply="true"',
  );
  return body.slice(0, last.index) + replacement + body.slice(last.index + opening.length);
}

export function wrapEmailHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  html, body { margin: 0; padding: 0; background: #ffffff; }
  ${EMAIL_CONTENT_CSS}
</style>
</head>
<body>
  <div class="mail-content" style="box-sizing:border-box;width:100%;max-width:680px;margin:0 auto;padding:24px;">
    ${body}
  </div>
</body>
</html>`;
}

export function wrapComposePreviewHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<style>
  :root {
    color-scheme: light dark;
    --canvas: #f8fafc;
    --surface: #ffffff;
    --border: #e2e8f0;
  }
  html, body {
    box-sizing: border-box;
    min-height: 100%;
    margin: 0;
    background: var(--canvas);
  }
  body { padding: 20px; }
  .preview-surface {
    max-width: 680px;
    margin: 0 auto;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface);
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
    overflow: hidden;
  }
  ${EMAIL_CONTENT_CSS}
  @media (prefers-color-scheme: dark) {
    :root { --canvas: #020617; --border: #334155; }
    /* The preview intentionally remains a white email surface. That is what
       recipients see and avoids a misleading filter-based dark rendering. */
  }
</style>
</head>
<body>
  <div class="preview-surface">
    <div class="mail-content">${body}</div>
  </div>
</body>
</html>`;
}
