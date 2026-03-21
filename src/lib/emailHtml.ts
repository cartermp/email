/**
 * Prepare email HTML for display in a sandboxed iframe.
 *
 * - Injects a low-specificity light-mode fallback so emails without explicit
 *   colors stay readable.
 * - Injects a warm dark-mode override (stone-900 palette) for emails that
 *   don't have their own prefers-color-scheme: dark rules.
 * - Injects a resize script that reports the document height to the parent
 *   frame via postMessage so the iframe can grow to fit its content.
 */
export function prepareHtml(html: string): string {
  const hasNativeDark = /prefers-color-scheme\s*:\s*dark/i.test(html);
  const darkOverride = hasNativeDark
    ? ""
    : "@media(prefers-color-scheme:dark){" +
      "html,body{background-color:#1c1917!important;color:#e7e5e4!important}" +
      "a{color:#7dd3fc}" +
      "}";

  const inject = [
    `<style>html,body{background-color:#ffffff;color:#000000;overflow:hidden}${darkOverride}</style>`,
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
