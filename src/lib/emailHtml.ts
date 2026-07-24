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

export type EmailColorMode = "system" | "light" | "dark";

function darkTextAdaptationScript(
  theme: EmailRenderTheme,
  colorMode: EmailColorMode,
): string {
  const fallbackBackground = JSON.stringify(theme.surfaceDarkColor);
  const darkModeSource =
    colorMode === "system"
      ? "window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)')"
      : `{matches:${colorMode === "dark"}}`;
  return `
  var darkMode=${darkModeSource};
  function parseRgb(value){
    var text=String(value||'');
    var hex=text.match(/^#([\\da-f]{6})$/i);
    if(hex){
      return {
        r:parseInt(hex[1].slice(0,2),16),
        g:parseInt(hex[1].slice(2,4),16),
        b:parseInt(hex[1].slice(4,6),16),
        a:1
      };
    }
    var match=text.match(
      /^rgba?\\(\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*,\\s*([\\d.]+)(?:\\s*,\\s*([\\d.]+))?\\s*\\)$/
    );
    return match?{
      r:Number(match[1]),g:Number(match[2]),b:Number(match[3]),
      a:match[4]===undefined?1:Number(match[4])
    }:null;
  }
  function luminance(colour){
    function channel(value){
      value=value/255;
      return value<=0.04045?value/12.92:Math.pow((value+0.055)/1.055,2.4);
    }
    return 0.2126*channel(colour.r)+
      0.7152*channel(colour.g)+
      0.0722*channel(colour.b);
  }
  function contrastRatio(foreground,background){
    var light=Math.max(luminance(foreground),luminance(background));
    var dark=Math.min(luminance(foreground),luminance(background));
    return (light+0.05)/(dark+0.05);
  }
  function hasDirectText(element){
    for(var node=element.firstChild;node;node=node.nextSibling){
      if(node.nodeType===3&&String(node.nodeValue||'').trim())return true;
    }
    return false;
  }
  function effectiveBackground(element,style,backgrounds){
    if(style.backgroundImage&&style.backgroundImage!=='none')return null;
    var colour=parseRgb(style.backgroundColor);
    if(colour&&colour.a>0.01)return colour;
    var parent=element.parentElement;
    return parent&&backgrounds.has(parent)
      ?backgrounds.get(parent)
      :parseRgb(${fallbackBackground});
  }
  function needsAdaptation(foreground,background){
    if(!foreground||!background)return false;
    var spread=Math.max(foreground.r,foreground.g,foreground.b)-
      Math.min(foreground.r,foreground.g,foreground.b);
    if(spread>56||luminance(foreground)>0.18)return false;
    return contrastRatio(foreground,background)<4.5;
  }
  var darkTextAdapted=false;
  function adaptDarkText(){
    darkTextAdapted=true;
    var marked=document.querySelectorAll(
      '[data-email-client-adapted-text],[data-email-client-adapted-marker]'
    );
    for(var i=0;i<marked.length;i++){
      marked[i].removeAttribute('data-email-client-adapted-text');
      marked[i].removeAttribute('data-email-client-adapted-marker');
    }
    if(!darkMode||!darkMode.matches||!document.body)return;

    var elements=[document.body];
    var descendants=document.body.getElementsByTagName('*');
    for(var j=0;j<descendants.length;j++)elements.push(descendants[j]);
    var backgrounds=new WeakMap();

    for(var k=0;k<elements.length;k++){
      var element=elements[k];
      var computed=window.getComputedStyle(element);
      var background=effectiveBackground(element,computed,backgrounds);
      backgrounds.set(element,background);
      if(computed.display==='none'||computed.visibility==='hidden')continue;
      if(!background)continue;

      if(element.tagName==='LI'&&String(element.textContent||'').trim()){
        var markerColour=parseRgb(computed.color);
        try{
          var markerStyle=window.getComputedStyle(element,'::marker');
          markerColour=parseRgb(markerStyle&&markerStyle.color)||markerColour;
        }catch(_markerStyleError){}
        if(needsAdaptation(markerColour,background)){
          element.setAttribute('data-email-client-adapted-marker','true');
        }
      }

      if(hasDirectText(element)&&needsAdaptation(parseRgb(computed.color),background)){
        element.setAttribute('data-email-client-adapted-text','true');
      }
    }
  }
  function safelyAdaptDarkText(force){
    if(darkTextAdapted&&!force)return;
    try{adaptDarkText();}catch(_adaptationError){}
  }
  function handleDarkModeChange(){
    darkTextAdapted=false;
    safelyAdaptDarkText();
  }
  if(darkMode){
    if(darkMode.addEventListener)darkMode.addEventListener('change',handleDarkModeChange);
    else if(darkMode.addListener)darkMode.addListener(handleDarkModeChange);
  }`;
}

function resizeScript(
  stripQuotes: boolean,
  adaptiveTheme?: EmailRenderTheme,
  colorMode: EmailColorMode = "system",
): string {
  return `<script>(function(){
  var lastH=0,lastW=0,raf=0,forceMeasure=false;
  ${adaptiveTheme ? darkTextAdaptationScript(adaptiveTheme, colorMode) : ""}
  function repairOneSidedCenteredWrappers(){
    if(!document.body)return;
    var rows=document.querySelectorAll(
      'table[width="100%"] > tbody > tr'
    );
    for(var rowIndex=0;rowIndex<rows.length;rowIndex++){
      var row=rows[rowIndex];
      var cells=[];
      for(var childIndex=0;childIndex<row.children.length;childIndex++){
        var child=row.children[childIndex];
        if(child.tagName==='TD'||child.tagName==='TH')cells.push(child);
      }
      if(cells.length!==2)continue;
      var leading=cells[0];
      var content=cells[1];
      if(
        !leading.classList.contains('device-width')||
        !content.classList.contains('content-width')||
        String(leading.textContent||'').replace(/\\u00a0/g,'').trim()||
        !String(content.textContent||'').trim()
      )continue;
      var trailing=leading.cloneNode(true);
      trailing.setAttribute('data-email-client-mirrored-spacer','true');
      trailing.setAttribute('aria-hidden','true');
      row.appendChild(trailing);
    }
  }
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
    if(h===lastH&&w===lastW&&!forceMeasure)return;
    forceMeasure=false;
    lastH=h;lastW=w;
    window.parent.postMessage({type:'iframe-resize',height:h,width:w},'*');
  }
  function schedule(){
    if(!raf)raf=window.requestAnimationFrame(measure);
  }
  function finishSetup(){
    ${stripQuotes ? STRIP_QUOTES_JS : ""}
    repairOneSidedCenteredWrappers();
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
    ${adaptiveTheme ? "safelyAdaptDarkText();" : ""}
  }
  window.addEventListener('message',function(e){
    if(
      e.data==='iframe-ping'||
      (e.data&&e.data.type==='iframe-parent-width')
    ){
      forceMeasure=true;
      schedule();
    }
  });
  window.addEventListener('load',finishSetup);
  document.addEventListener('DOMContentLoaded',function(){
    repairOneSidedCenteredWrappers();
    schedule();
    ${adaptiveTheme ? "safelyAdaptDarkText();" : ""}
  });
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
    colorMode?: EmailColorMode;
  },
): string {
  const theme = opts?.theme ?? defaultEmailRenderTheme;
  const colorMode = opts?.colorMode ?? "system";
  html = resolveEmbeddedImages(html, opts?.embeddedParts);
  html = unwrapGoogleUrlsInHtml(html);
  html = linkifyHtmlText(html);

  const hasViewport = /<meta[^>]*name=["']viewport["'][^>]*>/i.test(html);
  const viewport = hasViewport
    ? ""
    : '<meta name="viewport" content="width=device-width, initial-scale=1">';
  const useDarkDefaults = colorMode === "dark";
  const darkRules = `
      html:not([bgcolor]):not([background]){background:${theme.surfaceDarkColor}}
      body:not([text]){color:${theme.textDarkColor}}
      body:not([link]) a{color:${theme.linkDarkColor}}
      [data-email-client-adapted-text]{color:${theme.textDarkColor}!important}
      li[data-email-client-adapted-marker]::marker{color:${theme.textDarkColor}!important}`;
  const darkModeRules =
    colorMode === "system"
      ? `@media(prefers-color-scheme:dark){${darkRules}}`
      : colorMode === "dark"
        ? darkRules
        : "";
  const baseStyle = `<style>
    html,body{overflow:hidden;min-height:0}
    html:not([bgcolor]):not([background]){background:${useDarkDefaults ? theme.surfaceDarkColor : theme.surfaceLightColor}}
    body:not([bgcolor]):not([background]){background:transparent}
    body:not([text]){color:${useDarkDefaults ? theme.textDarkColor : theme.textLightColor}}
    body{font-family:${theme.fontFamily}}
    body:not([link]) a{color:${useDarkDefaults ? theme.linkDarkColor : theme.linkLightColor}}
    a{cursor:pointer}
    img{max-width:100%!important;height:auto!important;object-fit:contain!important}
    video,canvas,svg{max-width:100%!important;height:auto!important}
    pre{max-width:100%;white-space:pre-wrap;overflow-wrap:anywhere}
    ${darkModeRules}
  </style>`;
  const inject = `${viewport}${baseStyle}${resizeScript(!!opts?.stripQuotes, theme, colorMode)}`;

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
  opts?: {
    stripQuotes?: boolean;
    theme?: EmailRenderTheme;
    colorMode?: EmailColorMode;
  },
): string {
  const theme = opts?.theme ?? defaultEmailRenderTheme;
  const colorMode = opts?.colorMode ?? "system";
  if (opts?.stripQuotes) text = stripQuotedText(text);

  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const useDarkDefaults = colorMode === "dark";
  const darkRules = `
  html{background:${theme.surfaceDarkColor}}
  body{color:${theme.textDarkColor};background:transparent}`;
  const darkModeRules =
    colorMode === "system"
      ? `@media(prefers-color-scheme:dark){${darkRules}}`
      : colorMode === "dark"
        ? darkRules
        : "";

  return `<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
html,body{margin:0;padding:0;overflow:hidden}
html{background:${useDarkDefaults ? theme.surfaceDarkColor : theme.surfaceLightColor}}
body{
  box-sizing:border-box;
  font-family:${theme.fontFamily};
  font-size:15px;line-height:1.65;
  color:${useDarkDefaults ? theme.textDarkColor : theme.textLightColor};background:transparent;
  word-break:break-word;overflow-wrap:anywhere;white-space:pre-wrap;
}
${darkModeRules}
</style>
${resizeScript(false, undefined, colorMode)}
</head><body>${escaped}</body></html>`;
}
