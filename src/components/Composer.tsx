"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { marked } from "marked";

interface Identity {
  id: string;
  name: string;
  email: string;
}

interface Props {
  identities: Identity[];
}

marked.setOptions({ gfm: true, breaks: true });

export default function Composer({ identities }: Props) {
  const [identityId, setIdentityId] = useState(identities[0]?.id ?? "");
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [preview, setPreview] = useState("");
  const [showPreview, setShowPreview] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Update preview whenever markdown changes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const html = await marked.parse(markdown);
      if (!cancelled) setPreview(wrapEmailHtml(html));
    })();
    return () => { cancelled = true; };
  }, [markdown]);

  const handleSend = useCallback(async () => {
    if (!to.trim() || !subject.trim() || !markdown.trim()) {
      setError("To, subject, and body are required.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const html = await marked.parse(markdown);
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityId,
          to: to.split(/[,;]/).map((s) => s.trim()).filter(Boolean),
          subject,
          textBody: markdown,
          htmlBody: wrapEmailHtml(html),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Send failed (${res.status})`);
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSending(false);
    }
  }, [identityId, to, subject, markdown]);

  if (sent) {
    return (
      <div className="flex items-center justify-center h-64 text-zinc-500 text-sm">
        Message sent.{" "}
        <button
          onClick={() => {
            setSent(false);
            setTo("");
            setSubject("");
            setMarkdown("");
          }}
          className="ml-2 text-zinc-900 underline"
        >
          Compose another
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header fields */}
      <div className="border-b border-zinc-200 divide-y divide-zinc-100">
        {identities.length > 1 && (
          <div className="flex items-center px-6 py-2 gap-3">
            <label className="text-xs text-zinc-400 w-16">From</label>
            <select
              value={identityId}
              onChange={(e) => setIdentityId(e.target.value)}
              className="flex-1 text-sm text-zinc-700 bg-transparent outline-none"
            >
              {identities.map((id) => (
                <option key={id.id} value={id.id}>
                  {id.name} &lt;{id.email}&gt;
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex items-center px-6 py-2 gap-3">
          <label className="text-xs text-zinc-400 w-16">To</label>
          <input
            type="text"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="recipient@example.com"
            className="flex-1 text-sm text-zinc-700 bg-transparent outline-none placeholder:text-zinc-300"
          />
        </div>
        <div className="flex items-center px-6 py-2 gap-3">
          <label className="text-xs text-zinc-400 w-16">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="flex-1 text-sm text-zinc-700 bg-transparent outline-none placeholder:text-zinc-300"
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 px-6 py-2 border-b border-zinc-100 bg-zinc-50">
        <span className="text-xs text-zinc-400">Markdown</span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setShowPreview(false)}
            className={`text-xs px-2 py-1 rounded ${!showPreview ? "bg-zinc-200 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
          >
            Write
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className={`text-xs px-2 py-1 rounded ${showPreview ? "bg-zinc-200 text-zinc-900" : "text-zinc-500 hover:text-zinc-700"}`}
          >
            Split
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Markdown textarea */}
        <div className={`flex flex-col ${showPreview ? "w-1/2 border-r border-zinc-200" : "w-full"}`}>
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            placeholder={"Write your email in Markdown…\n\n**Bold**, *italic*, `code`, lists, links — all supported."}
            className="flex-1 resize-none px-6 py-4 text-sm text-zinc-700 font-mono leading-relaxed outline-none placeholder:text-zinc-300"
          />
        </div>

        {/* HTML preview */}
        {showPreview && (
          <div className="w-1/2 overflow-auto">
            <iframe
              srcDoc={preview}
              className="w-full h-full border-0"
              sandbox=""
              title="Email preview"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-zinc-200 px-6 py-3 flex items-center gap-4">
        <button
          onClick={handleSend}
          disabled={sending}
          className="text-sm bg-zinc-900 text-white px-4 py-2 rounded hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}

// Wrap HTML with minimal email-safe styling
function wrapEmailHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; max-width: 640px; margin: 0 auto; padding: 24px; }
  h1, h2, h3 { font-weight: 600; margin: 1.5em 0 0.5em; }
  p { margin: 0 0 1em; }
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
