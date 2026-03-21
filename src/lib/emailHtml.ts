/**
 * Prepare email HTML for display in a sandboxed iframe.
 *
 * - For emails with native dark mode (prefers-color-scheme: dark rules): step
 *   aside and let their own CSS handle theming.
 * - For all other emails: lock to light rendering with color-scheme:light so
 *   the browser never applies dark-mode transforms to emails designed for
 *   light backgrounds. Forcing a dark background on these causes illegible
 *   text because inline color styles (e.g. color:#000) can't be overridden
 *   without being extremely aggressive.
 * - Injects overflow:hidden so the iframe never gets its own scrollbar; the
 *   parent container handles all scrolling.
 * - Injects a resize script that reports the document height to the parent
 *   frame via postMessage so the iframe grows to fit its content.
 */
export function prepareHtml(html: string): string {
  const hasNativeDark = /prefers-color-scheme\s*:\s*dark/i.test(html);

  // Non-dark-mode emails: lock to light so inline colors render as intended.
  // Dark-mode emails: no base style injection — their own CSS takes over.
  const baseStyle = hasNativeDark
    ? "html,body{overflow:hidden}"
    : "html,body{background-color:#ffffff;color:#000000;overflow:hidden;color-scheme:light}";

  const inject = [
    `<style>${baseStyle}</style>`,
    `<script>(function(){
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
