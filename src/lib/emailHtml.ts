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
 *   color-scheme:light prevents the browser from auto-adapting UI controls
 *   on top of our filter.
 *
 * Scrolling: overflow:hidden on html,body prevents the iframe from ever
 * getting its own scrollbar; the parent container handles all scrolling.
 *
 * Resizing: injected script reports document height via postMessage so the
 * iframe grows to fit its content.
 *
 * Mobile: max-width:100% on html prevents fixed-width email tables from
 * causing horizontal bleed/overflow on narrow viewports.
 */
export function prepareHtml(html: string): string {
  const hasNativeDark = /prefers-color-scheme\s*:\s*dark/i.test(html);

  const baseStyle = hasNativeDark
    ? "html,body{overflow:hidden;max-width:100%}"
    : "html,body{background-color:#ffffff;color:#000000;overflow:hidden;color-scheme:light;max-width:100%}" +
      "table{max-width:100%!important}img{max-width:100%!important;height:auto!important}";

  // Dark mode: use JS matchMedia so it works even when color-scheme:light
  // suppresses CSS media queries inside the iframe.
  const darkAdaptJs = hasNativeDark
    ? ""
    : `if(window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches){` +
      `var ds=document.createElement('style');` +
      `ds.textContent='html{filter:invert(1) hue-rotate(180deg)}img,video{filter:invert(1) hue-rotate(180deg)}';` +
      `document.head.appendChild(ds);}`;

  const inject = [
    `<style>${baseStyle}</style>`,
    `<script>(function(){
  ${darkAdaptJs}
  function send(){
    var h=Math.max(
      document.body?document.body.scrollHeight:0,
      document.documentElement.scrollHeight
    );
    window.parent.postMessage({type:'iframe-resize',height:h},'*');
  }
  send();
  window.addEventListener('load',function(){
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
export function prepareTextBody(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const html = `<html><head>
<style>
html,body{margin:0;padding:0;overflow:hidden;max-width:100%}
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
    s.textContent='body{color:#e7e5e4!important;background:#1c1917!important}';
    document.head.appendChild(s);
  }
})();</script>
</head><body>${escaped}</body></html>`;

  const resize = `<script>(function(){
  function send(){
    var h=Math.max(
      document.body?document.body.scrollHeight:0,
      document.documentElement.scrollHeight
    );
    window.parent.postMessage({type:'iframe-resize',height:h},'*');
  }
  send();
  window.addEventListener('load',send);
  if(window.ResizeObserver){new ResizeObserver(send).observe(document.documentElement);}
})();</script>`;

  return html.replace("</body>", resize + "</body>");
}
