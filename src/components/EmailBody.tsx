"use client";

import { useEffect, useRef } from "react";

interface Props {
  body: string;
  type: "html" | "text";
}

/**
 * Prepare the email HTML for display:
 * - Inject a low-specificity white/black fallback so emails without explicit
 *   colors stay readable. Emails with their own styles (including dark-mode
 *   media queries) will override this naturally.
 * - Inject a tiny resize script that reports the document height to the
 *   parent frame via postMessage so the iframe can grow to fit its content.
 *   (requires allow-scripts; without allow-same-origin the script has no
 *   access to the parent's DOM, cookies, or storage.)
 */
/**
 * Returns true if the email already handles dark mode itself.
 * We check for a prefers-color-scheme:dark media query anywhere in the HTML.
 */
function hasDarkModeSupport(html: string): boolean {
  return /prefers-color-scheme\s*:\s*dark/i.test(html);
}

function prepareHtml(html: string): string {
  // Emails without native dark-mode support get a CSS inversion so they match
  // the OS dark theme.  Images get a counter-inversion so they look normal.
  const forceDark = hasDarkModeSupport(html)
    ? ""
    : "@media(prefers-color-scheme:dark){html{filter:invert(1) hue-rotate(180deg)}" +
      "img,video,canvas,svg{filter:invert(1) hue-rotate(180deg)}}";

  const inject = [
    // Low-specificity fallback; emails with explicit colors override this.
    `<style>html,body{background-color:#ffffff;color:#000000}${forceDark}</style>`,
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

export default function EmailBody({ body, type }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const iframe = iframeRef.current;
      if (
        iframe &&
        e.source === iframe.contentWindow &&
        e.data?.type === "iframe-resize" &&
        typeof e.data.height === "number" &&
        e.data.height > 0
      ) {
        iframe.style.height = e.data.height + "px";
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  if (type === "html") {
    return (
      <iframe
        ref={iframeRef}
        srcDoc={prepareHtml(body)}
        className="w-full border-0 block"
        style={{ minHeight: "200px", backgroundColor: "white" }}
        // allow-scripts: needed for the injected resize script.
        // No allow-same-origin so email scripts cannot access parent frame,
        // cookies, or application storage.
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        title="Email content"
      />
    );
  }

  return (
    <pre className="text-sm text-stone-800 dark:text-stone-200 whitespace-pre-wrap font-sans leading-relaxed">
      {body}
    </pre>
  );
}
