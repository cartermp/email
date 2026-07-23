const EMAIL_CONTENT_CSS = `
  .mail-content {
    box-sizing: border-box;
    width: 100%;
    max-width: 680px;
    margin: 0 auto;
    padding: 24px;
    color: #172033;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
    font-size: 15px;
    line-height: 1.65;
    overflow-wrap: anywhere;
  }
  .mail-content > :first-child { margin-top: 0; }
  .mail-content > :last-child { margin-bottom: 0; }
  .mail-content h1 { font-size: 1.45em; line-height: 1.25; font-weight: 650; margin: 1.4em 0 0.5em; }
  .mail-content h2 { font-size: 1.25em; line-height: 1.3; font-weight: 650; margin: 1.4em 0 0.5em; }
  .mail-content h3 { font-size: 1.08em; line-height: 1.35; font-weight: 650; margin: 1.4em 0 0.5em; }
  .mail-content p { margin: 0 0 1em; }
  .mail-content a { color: #1d4ed8; text-decoration: underline; text-underline-offset: 2px; }
  .mail-content ul, .mail-content ol { padding-left: 1.5em; margin: 0 0 1em; }
  .mail-content li { margin: 0.2em 0; }
  .mail-content hr { border: 0; border-top: 1px solid #e2e8f0; margin: 1.5em 0; }
  .mail-content img { max-width: 100%; height: auto; display: block; margin: 1em 0; }
  .mail-content code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
    background: #f1f5f9;
    padding: 0.15em 0.35em;
    border-radius: 4px;
    font-size: 0.9em;
  }
  .mail-content pre {
    box-sizing: border-box;
    max-width: 100%;
    padding: 14px 16px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
    overflow-x: auto;
    white-space: pre-wrap;
  }
  .mail-content pre code { padding: 0; border: 0; background: transparent; }
  .mail-content blockquote {
    margin: 1em 0;
    padding: 0 0 0 14px;
    border-left: 2px solid #cbd5e1;
    color: #64748b;
  }
  .mail-content table { max-width: 100%; border-collapse: collapse; }
  .mail-content th, .mail-content td { padding: 6px 8px; border: 1px solid #e2e8f0; text-align: left; }
`;

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
  <div class="mail-content" style="box-sizing:border-box;width:100%;max-width:680px;margin:0 auto;padding:24px;color:#172033;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;font-size:15px;line-height:1.65;overflow-wrap:anywhere;">
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
  [data-forwarded-email="true"] { color: #475569; }
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
