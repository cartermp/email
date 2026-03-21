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
 */
export function prepareHtml(html: string): string {
  const hasNativeDark = /prefers-color-scheme\s*:\s*dark/i.test(html);

  const baseStyle = hasNativeDark
    ? "html,body{overflow:hidden}"
    : "html,body{background-color:#ffffff;color:#000000;overflow:hidden;color-scheme:light}";

  const darkAdapt = hasNativeDark
    ? ""
    : "@media(prefers-color-scheme:dark){" +
      "html{filter:invert(1) hue-rotate(180deg)}" +
      "img,video{filter:invert(1) hue-rotate(180deg)}" +
      "}";

  const inject = [
    `<style>${baseStyle}${darkAdapt}</style>`,
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
