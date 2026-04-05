/**
 * Prepare email HTML for display in a sandboxed iframe.
 *
 * Dark mode strategy:
 * - Emails with native dark mode (prefers-color-scheme: dark rules): step
 *   aside entirely, let their own CSS handle theming.
 * - All other emails: in dark mode, apply filter:invert(1) hue-rotate(180deg)
 *   to the html element. This flips white→black and dark text→light text.
 *   A counter-filter on img/video restores images to their original colors
 *   (applying the same filter twice is self-inverse for images).
 *
 * Scrolling: overflow:hidden on html,body prevents the iframe from ever
 * getting its own scrollbar; the parent container handles all scrolling.
 *
 * Resizing: the injected script reports { height, width } via postMessage.
 * The parent (EmailBody) sizes the iframe element to these natural dimensions
 * and applies a CSS transform to scale it down when the content is wider
 * than the available space. This handles the iOS Safari limitation where
 * <meta viewport> is ignored inside iframes and content lays out at ~980px.
 */
import { defaultEmailRenderTheme, type EmailRenderTheme } from "./emailRenderTheme";

// Linkify bare URLs in HTML text content at the string level (server-side),
// so no browser DOM manipulation is needed. Skips content inside <a>, <script>,
// and <style> tags. Tracks <a> nesting so already-linked URLs are not re-wrapped.
const URL_RE = /(https?:\/\/[^\s<>"']+)/g;
const TOKEN_RE = /(<script[\s\S]*?<\/script\s*>|<style[\s\S]*?<\/style\s*>|<\/a\s*>|<a[\s>][^>]*>|<[^>]*>)|([^<]*)/gi;
function linkifyHtmlText(html: string): string {
  let inAnchor = 0;
  return html.replace(TOKEN_RE, (_match, tag: string | undefined, text: string | undefined) => {
    if (tag !== undefined) {
      if (/^<\/a/i.test(tag)) inAnchor = Math.max(0, inAnchor - 1);
      else if (/^<a[\s>]/i.test(tag)) inAnchor++;
      return tag;
    }
    if (!text || inAnchor > 0) return text ?? "";
    return text.replace(URL_RE, (url) => {
      const trimmed = url.replace(/[.,;:!?)]+$/, "");
      const rest = url.slice(trimmed.length);
      const safeHref = trimmed.replace(/&/g, "&amp;");
      return `<a href="${safeHref}" target="_blank" rel="noopener noreferrer">${trimmed}</a>${rest}`;
    });
  });
}

// JS injected into HTML emails to remove quoted reply sections.
// Targets the most common quote containers across major email clients.
const STRIP_QUOTES_JS = `(function(){
  var sels=[
    'blockquote[type="cite"]',
    '.gmail_quote','.gmail_extra',
    '#divRplyFwdMsg','#appendonsend',
    '.yahoo_quoted',
    'div[id^="mail-editor-reference-message"]'
  ];
  sels.forEach(function(s){
    var els=document.querySelectorAll(s);
    for(var i=0;i<els.length;i++){els[i].parentNode&&els[i].parentNode.removeChild(els[i]);}
  });
  // Remove "On [date], [name] wrote:" attribution line immediately before a removed quote.
  // After removal above, look for trailing <br> + attribution text nodes and drop them.
  function trimTrailingAttribution(node){
    if(!node)return;
    var ch=node.childNodes;
    for(var i=ch.length-1;i>=0;i--){
      var n=ch[i];
      if(n.nodeType===3&&n.nodeValue&&n.nodeValue.trim()==='')continue;
      if(n.nodeType===1&&n.tagName==='BR'){n.parentNode.removeChild(n);continue;}
      if(n.nodeType===3&&/wrote:\\s*$/.test(n.nodeValue)){n.parentNode.removeChild(n);}
      break;
    }
  }
  trimTrailingAttribution(document.body);
})();`;

export function prepareHtml(
  html: string,
  opts?: { stripQuotes?: boolean; theme?: EmailRenderTheme },
): string {
  const theme = opts?.theme ?? defaultEmailRenderTheme;
  const hasNativeDark = /prefers-color-scheme\s*:\s*dark/i.test(html);

  // Strip any existing viewport meta — we control sizing from outside.
  html = html.replace(/<meta[^>]*name=["']viewport["'][^>]*>/gi, "");

  // Auto-link bare URLs in text content (server-side, no DOM manipulation needed).
  html = linkifyHtmlText(html);

  const baseStyle = hasNativeDark
    ? "html,body{overflow:hidden;height:auto!important}"
    : `html,body{background-color:#ffffff;color:#000000;overflow:hidden;height:auto!important;font-family:${theme.fontFamily}}` +
      "a{cursor:pointer}" +
      "img{max-width:100%!important;height:auto!important}" +
      "@media(prefers-color-scheme:dark){" +
      // html gets the actual dark colour directly — no filter on html avoids
      // browser quirks where the html/body background escapes the filter scope.
      `html{background-color:${theme.htmlDarkBg}}` +
      `body{filter:invert(1) hue-rotate(180deg);background-color:${theme.bodyDarkPreFilterBg};color:${theme.bodyDarkPreFilterColor}}` +
      "img,video,picture,canvas{filter:invert(1) hue-rotate(180deg)!important}}";

  const stripQuotesJs = opts?.stripQuotes ? STRIP_QUOTES_JS : "";

  const inject = [
    `<style>${baseStyle}</style>`,
    `<script>(function(){
  var lastH=0,lastW=0;
  function send(){
    var h=Math.max(
      document.body?document.body.scrollHeight:0,
      document.documentElement.scrollHeight
    );
    // Measure width via direct body children only (offsetLeft+offsetWidth).
    // Using scrollWidth or descending into nested elements picks up inner-table
    // margin/position micro-overflow (a few px) which creates an infinite
    // scale loop. The direct-child offsetWidth gives the outer wrapper's true
    // layout width (which expands correctly for min-width constraints) without
    // leaking sub-element overflow.
    var w=document.documentElement.clientWidth||0;
    if(document.body){
      var ch=document.body.children;
      for(var i=0;i<ch.length;i++){
        var rr=ch[i].offsetLeft+ch[i].offsetWidth;
        if(rr>w)w=rr;
      }
    }
    if(h===lastH&&w===lastW)return;
    lastH=h;lastW=w;
    window.parent.postMessage({type:'iframe-resize',height:h,width:w},'*');
  }
  send();
  window.addEventListener('message',function(e){if(e.data==='iframe-ping')send();});
  function openLinksInNewTab(){
    var links=document.getElementsByTagName('a');
    for(var i=0;i<links.length;i++){
      links[i].setAttribute('target','_blank');
      links[i].setAttribute('rel','noopener noreferrer');
    }
  }
  window.addEventListener('load',function(){
    ${stripQuotesJs}
    openLinksInNewTab();
    send();
    var imgs=document.getElementsByTagName('img');
    for(var i=0;i<imgs.length;i++){
      imgs[i].addEventListener('load',send);
      imgs[i].addEventListener('error',send);
    }
  });
  if(window.ResizeObserver){new ResizeObserver(send).observe(document.documentElement);}
})();</script>`,
  ].join("");

  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([^>]*)>/i, `<head$1>${inject}`);
  }
  return `<html><head>${inject}</head><body>${html}</body></html>`;
}

/**
 * Wrap a plain-text email body in themed HTML for iframe display.
 * Uses the same resize/dark-mode infrastructure as prepareHtml so the
 * rendered output matches the app's visual style.
 */
export function prepareTextBody(
  text: string,
  opts?: { stripQuotes?: boolean; theme?: EmailRenderTheme },
): string {
  const theme = opts?.theme ?? defaultEmailRenderTheme;
  if (opts?.stripQuotes) {
    // Find the first quoted line or "On ... wrote:" attribution and trim from there.
    const lines = text.split("\n");
    let cutAt = -1;
    for (let i = 0; i < lines.length; i++) {
      if (/^>/.test(lines[i])) {
        // Also include the attribution line immediately before it, if present.
        cutAt = i > 0 && /wrote:\s*$/.test(lines[i - 1].trim()) ? i - 1 : i;
        // Walk back over any blank lines before the attribution.
        while (cutAt > 0 && lines[cutAt - 1].trim() === "") cutAt--;
        break;
      }
    }
    if (cutAt > 0) text = lines.slice(0, cutAt).join("\n").trimEnd();
  }

  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<html><head>
<style>
html,body{margin:0;padding:0;overflow:hidden}
body{
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-size:14px;line-height:1.6;
  color:#1c1917;background:#ffffff;
  padding:0;word-break:break-word;white-space:pre-wrap;
}
</style>
<script>(function(){
  if(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches){
    var s=document.createElement('style');
    s.textContent='body{color:${theme.textDarkColor}!important;background:${theme.textDarkBg}!important}';
    document.head.appendChild(s);
  }
  var lastH=0,lastW=0;
  function send(){
    var h=Math.max(
      document.body?document.body.scrollHeight:0,
      document.documentElement.scrollHeight
    );
    var w=document.documentElement.clientWidth||0;
    if(document.body){
      var ch=document.body.children;
      for(var i=0;i<ch.length;i++){
        var rr=ch[i].offsetLeft+ch[i].offsetWidth;
        if(rr>w)w=rr;
      }
    }
    if(h===lastH&&w===lastW)return;
    lastH=h;lastW=w;
    window.parent.postMessage({type:'iframe-resize',height:h,width:w},'*');
  }
  send();
  window.addEventListener('message',function(e){if(e.data==='iframe-ping')send();});
  window.addEventListener('load',send);
  if(window.ResizeObserver){new ResizeObserver(send).observe(document.documentElement);}
})();</script>
</head><body>${escaped}</body></html>`;
}
