export function wrapEmailHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; max-width: 640px; margin: 0 auto; padding: 24px; }
  h1 { font-size: 1.3em; font-weight: 600; margin: 1.5em 0 0.5em; }
  h2 { font-size: 1.15em; font-weight: 600; margin: 1.5em 0 0.5em; }
  h3 { font-size: 1em; font-weight: 600; margin: 1.5em 0 0.5em; }
  p { margin: 0 0 1em; }
  img { max-width: 100%; height: auto; display: block; margin: 1em 0; }
  code { font-family: monospace; background: #f4f4f5; padding: 2px 5px; border-radius: 3px; font-size: 0.9em; }
  pre { background: #f4f4f5; padding: 12px 16px; border-radius: 6px; overflow-x: auto; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 3px solid #d4d4d8; margin: 0 0 1em; padding: 4px 16px; color: #71717a; }
  a { color: #2563eb; }
  ul, ol { padding-left: 1.5em; margin: 0 0 1em; }
  li { margin-bottom: 0.25em; }
  hr { border: none; border-top: 1px solid #e4e4e7; margin: 1.5em 0; }
</style>
</head>
<body>${body}</body>
</html>`;
}

export function wrapComposePreviewHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="color-scheme" content="dark light">
<style>
  :root {
    color-scheme: light dark;
    --preview-bg: #f0f5f0;
    --preview-panel: #ffffff;
    --preview-border: #d6e4d6;
    --preview-text: #1e3e1e;
    --preview-muted: #607060;
    --preview-accent: #15803d;
    --preview-accent-soft: #dcfce7;
    --preview-code-bg: #ecf5ec;
    --preview-code-border: #bbd2bb;
    --preview-quote: #7a8a7a;
    --preview-table-head: #e7f0e7;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --preview-bg: #060e06;
      --preview-panel: #030704;
      --preview-border: #122a12;
      --preview-text: #e0ece0;
      --preview-muted: #a8c8a8;
      --preview-accent: #4ade80;
      --preview-accent-soft: #0a1c0a;
      --preview-code-bg: #0a1c0a;
      --preview-code-border: #1e3e1e;
      --preview-quote: #80b880;
      --preview-table-head: #0a1c0a;
    }
  }

  html, body {
    margin: 0;
    min-height: 100%;
    background: var(--preview-bg);
    color: var(--preview-text);
    font-family: 'Share Tech Mono', monospace;
  }

  body {
    padding: 20px;
    box-sizing: border-box;
  }

  .preview-shell {
    max-width: 720px;
    margin: 0 auto;
    padding: 24px 28px;
    background: var(--preview-panel);
    border: 1px solid var(--preview-border);
    box-shadow: inset 0 1px 0 rgba(128, 184, 128, 0.08);
  }

  .preview-shell > :first-child { margin-top: 0; }
  .preview-shell > :last-child { margin-bottom: 0; }

  h1 { font-size: 1.3em; font-weight: 600; margin: 1.5em 0 0.5em; color: var(--preview-text); }
  h2 { font-size: 1.15em; font-weight: 600; margin: 1.5em 0 0.5em; color: var(--preview-text); }
  h3 { font-size: 1em; font-weight: 600; margin: 1.5em 0 0.5em; color: var(--preview-text); }
  p { margin: 0 0 1em; }
  a { color: var(--preview-accent); }
  ul, ol { padding-left: 1.5em; margin: 0 0 1em; }
  li { margin-bottom: 0.25em; }
  hr { border: none; border-top: 1px solid var(--preview-border); margin: 1.5em 0; }

  img {
    max-width: 100%;
    height: auto;
    display: block;
    margin: 1em 0;
    border: 1px solid var(--preview-border);
    background: var(--preview-accent-soft);
  }

  code {
    font-family: 'Share Tech Mono', monospace;
    background: var(--preview-code-bg);
    border: 1px solid var(--preview-code-border);
    padding: 2px 5px;
    border-radius: 3px;
    font-size: 0.9em;
  }

  pre {
    background: var(--preview-code-bg);
    border: 1px solid var(--preview-code-border);
    padding: 12px 16px;
    border-radius: 6px;
    overflow-x: auto;
  }

  pre code {
    background: none;
    border: 0;
    padding: 0;
  }

  blockquote {
    border-left: 3px solid var(--preview-accent);
    margin: 0 0 1em;
    padding: 4px 16px;
    color: var(--preview-quote);
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 1em;
  }

  th, td {
    border: 1px solid var(--preview-border);
    padding: 8px 10px;
    text-align: left;
    vertical-align: top;
  }

  th {
    background: var(--preview-table-head);
  }

  [data-forwarded-email="true"] {
    border-top-color: var(--preview-border) !important;
    color: var(--preview-muted);
  }
</style>
</head>
<body><div class="preview-shell">${body}</div></body>
</html>`;
}
