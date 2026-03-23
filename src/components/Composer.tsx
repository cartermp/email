"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { marked } from "marked";
import { saveDraftAction, deleteDraftAction } from "@/app/compose/actions";

// ---------------------------------------------------------------------------
// RecipientInput — text input with contact autocomplete dropdown
// ---------------------------------------------------------------------------

interface ContactSuggestion { name: string; email: string; }

function RecipientInput({
  value,
  onChange,
  placeholder,
  autoFocus,
  inputClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputClassName: string;
}) {
  const [suggestions, setSuggestions] = useState<ContactSuggestion[]>([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The "current token" is everything after the last comma — what the user is
  // actively typing before completing it into an address.
  function currentToken(v: string) {
    const parts = v.split(/,/);
    return parts[parts.length - 1].trimStart();
  }

  function replaceLastToken(v: string, replacement: string) {
    const parts = v.split(/,/);
    parts[parts.length - 1] = " " + replacement;
    // Strip the leading space on the first token if there was nothing before it
    return parts.join(",").replace(/^,\s*/, "");
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);

    const token = currentToken(v);
    clearTimeout(debounceRef.current);

    if (token.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/contacts?q=${encodeURIComponent(token)}`);
        if (!res.ok) return;
        const data: ContactSuggestion[] = await res.json();
        setSuggestions(data);
        setActiveIdx(-1);
        setOpen(data.length > 0);
      } catch { /* network error — silently skip */ }
    }, 200);
  }

  function select(s: ContactSuggestion) {
    const formatted = s.name ? `${s.name} <${s.email}>` : s.email;
    // Replace the current token with the chosen address, then add ", " so the
    // user can immediately start typing another recipient.
    const base = replaceLastToken(value, formatted);
    const next = base.trimEnd() + ", ";
    onChange(next);
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(next.length, next.length);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter" || e.key === "Tab") {
      if (activeIdx >= 0) {
        e.preventDefault();
        select(suggestions[activeIdx]);
      } else {
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
    }
  }

  return (
    <div className="relative flex-1 min-w-0">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => { setOpen(false); setActiveIdx(-1); }, 150)}
        placeholder={placeholder}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        autoFocus={autoFocus}
        className={inputClassName}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full mt-0.5 z-50 rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 shadow-lg overflow-hidden">
          {suggestions.map((s, i) => (
            <button
              key={`${s.name}-${s.email}-${i}`}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); select(s); }}
              className={[
                "w-full flex flex-col items-start px-3 py-2 text-left",
                i === activeIdx
                  ? "bg-blue-50 dark:bg-blue-900/40"
                  : "hover:bg-stone-50 dark:hover:bg-stone-700/50",
                i > 0 ? "border-t border-stone-100 dark:border-stone-700/60" : "",
              ].join(" ")}
            >
              {s.name && (
                <span className="text-sm font-medium text-stone-800 dark:text-stone-100 truncate w-full">
                  {s.name}
                </span>
              )}
              <span className="text-xs text-stone-500 dark:text-stone-400 truncate w-full">
                {s.email}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface Identity {
  id: string;
  name: string;
  email: string;
}

interface InlineImage {
  id: string;
  blobId: string;
  dataUrl: string;
  type: string;
}

interface Props {
  identities: Identity[];
  initialTo?: string;
  initialCc?: string;
  initialBcc?: string;
  initialSubject?: string;
  initialBody?: string;
  inReplyToId?: string;
  initialDraftId?: string;
  forwardedHtml?: string;
}

marked.setOptions({ gfm: true, breaks: true });

function replacePlaceholders(html: string, getSrc: (id: string) => string) {
  return html.replace(/src="@@([^"@]+)@@"/g, (_, id) => `src="${getSrc(id)}"`);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function Composer({
  identities,
  initialTo = "",
  initialCc = "",
  initialBcc = "",
  initialSubject = "",
  initialBody = "",
  inReplyToId,
  initialDraftId,
  forwardedHtml,
}: Props) {
  const [identityId, setIdentityId] = useState(identities[0]?.id ?? "");
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState(initialCc);
  const [bcc, setBcc] = useState(initialBcc);
  const [showCc, setShowCc] = useState(!!initialCc);
  const [showBcc, setShowBcc] = useState(!!initialBcc);
  const [subject, setSubject] = useState(initialSubject);
  const [markdown, setMarkdown] = useState(initialBody);
  const [preview, setPreview] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [inlineImages, setInlineImages] = useState<InlineImage[]>([]);
  const [uploading, setUploading] = useState(0);

  // Draft state
  const [draftId, setDraftId] = useState<string | null>(initialDraftId ?? null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const draftIdRef = useRef<string | null>(initialDraftId ?? null);
  const savingRef = useRef(false);
  const isInitialRender = useRef(true);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inlineImagesRef = useRef(inlineImages);
  useEffect(() => {
    inlineImagesRef.current = inlineImages;
  }, [inlineImages]);

  // Keep draftId ref in sync
  useEffect(() => {
    draftIdRef.current = draftId;
  }, [draftId]);

  // Preview rendering
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const html = await marked.parse(markdown);
      const withImages = replacePlaceholders(html, (id) => {
        return inlineImages.find((img) => img.id === id)?.dataUrl ?? "";
      });
      const body = forwardedHtml
        ? withImages + appendForwardedHtml(forwardedHtml)
        : withImages;
      if (!cancelled) setPreview(wrapEmailHtml(body));
    })();
    return () => {
      cancelled = true;
    };
  }, [markdown, inlineImages]);

  // Auto-save: debounce 2s after any content change
  useEffect(() => {
    if (isInitialRender.current) {
      isInitialRender.current = false;
      return;
    }
    // Nothing worth saving yet
    if (!to && !subject && !markdown) return;

    const timer = setTimeout(async () => {
      if (savingRef.current) return;
      savingRef.current = true;
      setSaveStatus("saving");

      const identity = identities.find((i) => i.id === identityId) ?? identities[0];
      try {
        const result = await saveDraftAction({
          draftId: draftIdRef.current,
          fromName: identity?.name ?? "",
          fromEmail: identity?.email ?? "",
          to,
          cc: showCc ? cc : "",
          bcc: showBcc ? bcc : "",
          subject,
          body: markdown,
        });

        const isFirstSave = !draftIdRef.current;
        draftIdRef.current = result.draftId;
        setDraftId(result.draftId);

        if (isFirstSave) {
          window.history.replaceState(
            {},
            "",
            `/compose?draftId=${result.draftId}`
          );
        }

        setSaveStatus("saved");
        setLastSaved(new Date());
      } catch {
        setSaveStatus("error");
      } finally {
        savingRef.current = false;
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [to, cc, bcc, showCc, showBcc, subject, markdown, identityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePaste = useCallback(
    async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const imageItem = Array.from(e.clipboardData.items).find((item) =>
        item.type.startsWith("image/")
      );
      if (!imageItem) return;
      e.preventDefault();

      const file = imageItem.getAsFile();
      if (!file) return;

      const id = `img-${Date.now()}`;
      const placeholder = `![image](@@${id}@@)`;

      const textarea = textareaRef.current;
      const start = textarea?.selectionStart ?? markdown.length;
      const end = textarea?.selectionEnd ?? markdown.length;
      setMarkdown(markdown.slice(0, start) + placeholder + markdown.slice(end));

      requestAnimationFrame(() => {
        if (textarea) {
          const pos = start + placeholder.length;
          textarea.selectionStart = pos;
          textarea.selectionEnd = pos;
        }
      });

      setUploading((n) => n + 1);
      try {
        const [dataUrl, uploadRes] = await Promise.all([
          fileToDataUrl(file),
          fetch("/api/upload", {
            method: "POST",
            body: (() => {
              const fd = new FormData();
              fd.append("file", file);
              return fd;
            })(),
          }),
        ]);

        if (!uploadRes.ok) {
          const data = await uploadRes.json().catch(() => ({}));
          throw new Error(data.error ?? "Upload failed");
        }
        const { blobId, type } = await uploadRes.json();
        setInlineImages((prev) => [...prev, { id, blobId, dataUrl, type }]);
      } catch (err) {
        setMarkdown((prev) => prev.replace(placeholder, ""));
        setError(
          `Image upload failed: ${err instanceof Error ? err.message : "unknown error"}`
        );
      } finally {
        setUploading((n) => n - 1);
      }
    },
    [markdown]
  );

  const handleDiscard = useCallback(async () => {
    if (!draftIdRef.current) {
      window.history.back();
      return;
    }
    try {
      await deleteDraftAction(draftIdRef.current);
    } catch {
      // best-effort
    }
    window.history.replaceState({}, "", "/compose");
    window.history.back();
  }, []);

  const handleSend = useCallback(async () => {
    if (!to.trim() || !subject.trim() || !markdown.trim()) {
      setError("To, subject, and body are required.");
      return;
    }
    if (uploading > 0) {
      setError("Please wait for images to finish uploading.");
      return;
    }
    setError(null);
    setSending(true);
    try {
      const rawHtml = await marked.parse(markdown);
      const htmlWithCids = replacePlaceholders(rawHtml, (id) => `cid:${id}@mail`);
      const composedBody = forwardedHtml
        ? htmlWithCids + appendForwardedHtml(forwardedHtml)
        : htmlWithCids;

      const splitAddrs = (val: string) =>
        val
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter(Boolean);

      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identityId,
          to: splitAddrs(to),
          cc: showCc && cc.trim() ? splitAddrs(cc) : undefined,
          bcc: showBcc && bcc.trim() ? splitAddrs(bcc) : undefined,
          subject,
          textBody: markdown,
          htmlBody: wrapEmailHtml(composedBody),
          inlineImages: inlineImagesRef.current.map(({ id, blobId, type }) => ({
            id,
            blobId,
            type,
          })),
          inReplyToId: inReplyToId ?? undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Send failed (${res.status})`);
      }

      // Clean up the draft now that it's sent
      if (draftIdRef.current) {
        deleteDraftAction(draftIdRef.current).catch(() => {});
        draftIdRef.current = null;
        setDraftId(null);
      }

      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSending(false);
    }
  }, [
    identityId,
    to,
    cc,
    bcc,
    showCc,
    showBcc,
    subject,
    markdown,
    uploading,
    inReplyToId,
  ]);

  if (sent) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-stone-500 dark:text-stone-400">
        Message sent.{" "}
        <button
          onClick={() => {
            setSent(false);
            setTo("");
            setCc("");
            setBcc("");
            setSubject("");
            setMarkdown("");
            setInlineImages([]);
            setDraftId(null);
            draftIdRef.current = null;
            setSaveStatus("idle");
            setLastSaved(null);
            window.history.replaceState({}, "", "/compose");
          }}
          className="ml-2 text-stone-900 dark:text-stone-100 underline"
        >
          Compose another
        </button>
      </div>
    );
  }

  const fieldClass =
    "flex-1 text-sm text-stone-700 dark:text-stone-300 bg-transparent outline-none placeholder:text-stone-300 dark:placeholder:text-stone-600";
  const labelClass = "text-xs text-stone-400 dark:text-stone-500 w-16";
  const rowClass = "flex items-center px-6 py-2 gap-3";

  return (
    <div className="flex flex-col h-full bg-white dark:bg-stone-900">
      {/* Header fields */}
      <div className="border-b border-stone-200 dark:border-stone-800 divide-y divide-stone-100 dark:divide-stone-800">
        {identities.length > 1 && (
          <div className={rowClass}>
            <label className={labelClass}>From</label>
            <select
              value={identityId}
              onChange={(e) => setIdentityId(e.target.value)}
              className="flex-1 text-sm text-stone-700 dark:text-stone-300 bg-transparent outline-none"
            >
              {identities.map((id) => (
                <option key={id.id} value={id.id}>
                  {id.name} &lt;{id.email}&gt;
                </option>
              ))}
            </select>
          </div>
        )}
        <div className={rowClass}>
          <label className={labelClass}>To</label>
          <RecipientInput
            value={to}
            onChange={setTo}
            placeholder="recipient@example.com"
            inputClassName={fieldClass}
          />
          <div className="flex items-center gap-2 shrink-0">
            {!showCc && (
              <button
                onClick={() => setShowCc(true)}
                className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
              >
                Cc
              </button>
            )}
            {!showBcc && (
              <button
                onClick={() => setShowBcc(true)}
                className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300"
              >
                Bcc
              </button>
            )}
          </div>
        </div>
        {showCc && (
          <div className={rowClass}>
            <label className={labelClass}>Cc</label>
            <RecipientInput
              value={cc}
              onChange={setCc}
              placeholder="cc@example.com"
              autoFocus={!initialCc}
              inputClassName={fieldClass}
            />
          </div>
        )}
        {showBcc && (
          <div className={rowClass}>
            <label className={labelClass}>Bcc</label>
            <RecipientInput
              value={bcc}
              onChange={setBcc}
              placeholder="bcc@example.com"
              inputClassName={fieldClass}
            />
          </div>
        )}
        <div className={rowClass}>
          <label className={labelClass}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className={fieldClass}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 px-6 py-2 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
        <span className="text-xs text-stone-400 dark:text-stone-500">Markdown</span>
        {uploading > 0 && (
          <span className="text-xs text-stone-400 dark:text-stone-500">
            Uploading {uploading} image{uploading > 1 ? "s" : ""}…
          </span>
        )}
        {/* Save status */}
        <span className="text-xs text-stone-400 dark:text-stone-500">
          {saveStatus === "saving" && "Saving…"}
          {saveStatus === "saved" &&
            lastSaved &&
            `Saved ${lastSaved.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
          {saveStatus === "error" && "Draft save failed"}
        </span>
        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={() => setShowPreview(false)}
            className={`text-xs px-2 py-1 rounded ${
              !showPreview
                ? "bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            }`}
          >
            Write
          </button>
          <button
            onClick={() => setShowPreview(true)}
            className={`text-xs px-2 py-1 rounded ${
              showPreview
                ? "bg-stone-200 dark:bg-stone-700 text-stone-900 dark:text-stone-100"
                : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            }`}
          >
            Split
          </button>
        </div>
      </div>

      {/* Editor area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div
          className={`flex flex-col ${
            showPreview
              ? "w-1/2 border-r border-stone-200 dark:border-stone-800"
              : "w-full"
          }`}
        >
          <textarea
            ref={textareaRef}
            value={markdown}
            onChange={(e) => setMarkdown(e.target.value)}
            onPaste={handlePaste}
            placeholder={
              "Write your email in Markdown…\n\n**Bold**, *italic*, `code`, lists, links — all supported.\nPaste an image anywhere to embed it."
            }
            className="flex-1 resize-none px-6 py-4 text-sm text-stone-700 dark:text-stone-300 font-mono leading-relaxed outline-none placeholder:text-stone-300 dark:placeholder:text-stone-600 bg-white dark:bg-stone-900"
          />
        </div>

        {showPreview && (
          <div className="w-1/2 overflow-auto bg-white dark:bg-stone-900">
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
      <div className="border-t border-stone-200 dark:border-stone-800 px-6 py-3 flex items-center gap-4 bg-white dark:bg-stone-900">
        <button
          onClick={handleSend}
          disabled={sending || uploading > 0}
          className="text-sm bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 px-4 py-2 rounded hover:bg-stone-700 dark:hover:bg-stone-300 transition-colors disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send"}
        </button>
        <button
          onClick={handleDiscard}
          className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
        >
          Discard
        </button>
        {error && <span className="text-xs text-red-500">{error}</span>}
      </div>
    </div>
  );
}

function wrapEmailHtml(body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; line-height: 1.6; color: #1a1a1a; max-width: 640px; margin: 0 auto; padding: 24px; }
  h1, h2, h3 { font-weight: 600; margin: 1.5em 0 0.5em; }
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

// Extract the <body> content from a full HTML document, or return the input
// as-is if no <body> tag is found (e.g. HTML fragments).
function extractBodyContent(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (m) return m[1];
  // Strip doctype / html / head wrappers and return the rest
  return html
    .replace(/<!DOCTYPE[^>]*>/gi, "")
    .replace(/<\/?html[^>]*>/gi, "")
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .trim();
}

// Returns an HTML snippet to append after the composed content when forwarding.
// The original email is rendered in a visually separated block.
function appendForwardedHtml(originalHtml: string): string {
  const content = extractBodyContent(originalHtml);
  return `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e4e4e7;font-size:14px;">${content}</div>`;
}
