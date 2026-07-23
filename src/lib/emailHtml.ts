/**
 * Prepare untrusted email HTML for display in a sandboxed iframe.
 *
 * The sender's layout is treated as the source of truth. The injected CSS only
 * prevents media from overflowing or being cropped; it does not rewrite table
 * widths, cell widths, colours, or responsive helper classes. If a message is
 * wider than the reader, EmailBody scales the complete document as one unit.
 */
import { defaultEmailRenderTheme, type EmailRenderTheme } from "./emailRenderTheme";
import type { EmailBodyPart } from "./types";

function unwrapGoogleCalendarUrl(href: string): string {
  try {
    const url = new URL(href.replace(/&amp;/g, "&"));
    if (
      (url.hostname === "google.com" || url.hostname === "www.google.com") &&
      url.pathname === "/url"
    ) {
      const destination = url.searchParams.get("q");
      if (destination && /^https?:\/\//i.test(destination)) return destination;
    }
  } catch {
    // Malformed links are left untouched.
  }
  return href;
}

function escapeAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function unwrapGoogleUrlsInHtml(html: string): string {
  return html.replace(/\bhref=(['"])(.*?)\1/gi, (_match, quote, href) => {
    const unescaped = href
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&amp;/g, "&");
    return `href=${quote}${escapeAttribute(unwrapGoogleCalendarUrl(unescaped))}${quote}`;
  });
}

const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
const TOKEN_RE =
  /(<script[\s\S]*?<\/script\s*>|<style[\s\S]*?<\/style\s*>|<\/a\s*>|<a[\s>][^>]*>|<[^>]*>)|([^<]*)/gi;

function linkifyHtmlText(html: string): string {
  let inAnchor = 0;
  return html.replace(
    TOKEN_RE,
    (_match, tag: string | undefined, text: string | undefined) => {
      if (tag !== undefined) {
        if (/^<\/a/i.test(tag)) inAnchor = Math.max(0, inAnchor - 1);
        else if (/^<a[\s>]/i.test(tag)) inAnchor++;
        return tag;
      }
      if (!text || inAnchor > 0) return text ?? "";
      return text.replace(URL_RE, (url) => {
        const trimmed = url.replace(/[.,;:!?)]+$/, "");
        const rest = url.slice(trimmed.length);
        return `<a href="${escapeAttribute(trimmed)}" target="_blank" rel="noopener noreferrer">${trimmed}</a>${rest}`;
      });
    },
  );
}

function normalizeCid(value: string): string {
  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    // Keep the original when it is not valid URL-encoded text.
  }
  return decoded.replace(/^cid:/i, "").replace(/^<|>$/g, "").trim().toLowerCase();
}

function inlinePartUrl(part: EmailBodyPart): string | null {
  if (!part.blobId) return null;
  const name = part.name || "inline-image";
  const params = new URLSearchParams({
    blobId: part.blobId,
    name,
    type: part.type,
    inline: "true",
  });
  return `/api/download?${params.toString()}`;
}

/**
 * Replace cid: image references with authenticated local download URLs.
 * JMAP exposes the matching content-id and blob id on the body part.
 */
export function resolveEmbeddedImages(
  html: string,
  parts: EmailBodyPart[] = [],
): string {
  const byCid = new Map<string, string>();
  for (const part of parts) {
    if (!part.cid) continue;
    const url = inlinePartUrl(part);
    if (url) byCid.set(normalizeCid(part.cid), url);
  }
  if (byCid.size === 0) return html;

  return html.replace(
    /\b(src|background)=(['"])(cid:[^'"]+)\2/gi,
    (match, attribute: string, quote: string, cidUrl: string) => {
      const resolved = byCid.get(normalizeCid(cidUrl));
      return resolved
        ? `${attribute}=${quote}${escapeAttribute(resolved)}${quote}`
        : match;
    },
  );
}

const STRIP_QUOTES_JS = `(function(){
  var sels=[
    '[data-quoted-reply="true"]',
    '.email-client-quoted-reply',
    'blockquote[type="cite"]',
    '.gmail_quote','.gmail_extra',
    '#divRplyFwdMsg','#appendonsend',
    '.yahoo_quoted',
    'div[id^="mail-editor-reference-message"]'
  ];
  sels.forEach(function(s){
    var els=document.querySelectorAll(s);
    for(var i=0;i<els.length;i++){
      var el=els[i];
      el.parentNode&&el.parentNode.removeChild(el);
    }
  });
})();`;

function resizeScript(stripQuotes: boolean): string {
  return `<script>(function(){
  var lastH=0,lastW=0,raf=0;
  function measure(){
    raf=0;
    var root=document.documentElement;
    var body=document.body;
    var h=Math.ceil(Math.max(
      root?root.scrollHeight:0,
      root?root.offsetHeight:0,
      body?body.scrollHeight:0,
      body?body.offsetHeight:0
    ));
    var w=Math.ceil(Math.max(
      root?root.scrollWidth:0,
      root?root.offsetWidth:0,
      body?body.scrollWidth:0,
      body?body.offsetWidth:0
    ));
    if(!h||h<1)return;
    if(h===lastH&&w===lastW)return;
    lastH=h;lastW=w;
    window.parent.postMessage({type:'iframe-resize',height:h,width:w},'*');
  }
  function schedule(){
    if(!raf)raf=window.requestAnimationFrame(measure);
  }
  function finishSetup(){
    ${stripQuotes ? STRIP_QUOTES_JS : ""}
    var links=document.getElementsByTagName('a');
    for(var i=0;i<links.length;i++){
      links[i].setAttribute('target','_blank');
      links[i].setAttribute('rel','noopener noreferrer');
    }
    var media=document.querySelectorAll('img,video');
    for(var j=0;j<media.length;j++){
      media[j].addEventListener('load',schedule);
      media[j].addEventListener('error',schedule);
      media[j].addEventListener('loadedmetadata',schedule);
    }
    schedule();
  }
  window.addEventListener('message',function(e){
    if(e.data==='iframe-ping')schedule();
  });
  window.addEventListener('load',finishSetup);
  document.addEventListener('DOMContentLoaded',schedule);
  if(window.ResizeObserver){
    new ResizeObserver(schedule).observe(document.documentElement);
  }
  if(window.MutationObserver){
    new MutationObserver(schedule).observe(document.documentElement,{
      childList:true,subtree:true,attributes:true
    });
  }
  if(document.fonts&&document.fonts.ready){
    document.fonts.ready.then(schedule);
  }
  schedule();
})();</script>`;
}

export function prepareHtml(
  html: string,
  opts?: {
    stripQuotes?: boolean;
    theme?: EmailRenderTheme;
    embeddedParts?: EmailBodyPart[];
  },
): string {
  const theme = opts?.theme ?? defaultEmailRenderTheme;
  html = resolveEmbeddedImages(html, opts?.embeddedParts);
  html = unwrapGoogleUrlsInHtml(html);
  html = linkifyHtmlText(html);

  const hasViewport = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(html);
  const viewport = hasViewport
    ? ""
    : '<meta name="viewport" content="width=device-width, initial-scale=1">';
  const baseStyle = `<style>
    html,body{overflow:hidden;min-height:0}
    html{background:#fff}
    body{font-family:${theme.fontFamily}}
    a{cursor:pointer}
    img{max-width:100%!important;height:auto!important;object-fit:contain!important}
    video,canvas,svg{max-width:100%!important;height:auto!important}
    pre{max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere}
  </style>`;
  const inject = `${viewport}${baseStyle}${resizeScript(!!opts?.stripQuotes)}`;

  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${inject}`);
  }
  return `<html><head>${inject}</head><body>${html}</body></html>`;
}

function stripQuotedText(text: string): string {
  const lines = text.split("\n");
  let cutAt = -1;
  for (let i = 0; i < lines.length; i++) {
    if (/^>/.test(lines[i])) {
      cutAt = i > 0 && /wrote:\s*$/i.test(lines[i - 1].trim()) ? i - 1 : i;
      while (cutAt > 0 && lines[cutAt - 1].trim() === "") cutAt--;
      break;
    }
  }
  return cutAt > 0 ? lines.slice(0, cutAt).join("\n").trimEnd() : text;
}

export function prepareTextBody(
  text: string,
  opts?: { stripQuotes?: boolean; theme?: EmailRenderTheme },
): string {
  const theme = opts?.theme ?? defaultEmailRenderTheme;
  if (opts?.stripQuotes) text = stripQuotedText(text);

  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html,body{margin:0;padding:0;overflow:hidden}
body{
  box-sizing:border-box;
  font-family:${theme.fontFamily};
  font-size:15px;line-height:1.65;
  color:${theme.textLightColor};background:${theme.textLightBg};
  word-break:break-word;overflow-wrap:anywhere;white-space:pre-wrap;
}
@media(prefers-color-scheme:dark){
  html,body{color:${theme.textDarkColor};background:${theme.textDarkBg}}
}
</style>
${resizeScript(false)}
</head><body>${escaped}</body></html>`;
}
