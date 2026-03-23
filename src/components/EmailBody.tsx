"use client";

import { useEffect, useRef } from "react";
import { prepareHtml, prepareTextBody } from "@/lib/emailHtml";

interface Props {
  body: string;
  type: "html" | "text";
}

export default function EmailBody({ body, type }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const handleMessage = (e: MessageEvent) => {
      if (
        e.source === iframe.contentWindow &&
        e.data?.type === "iframe-resize" &&
        typeof e.data.height === "number" &&
        e.data.height > 0
      ) {
        iframe.style.height = e.data.height + "px";
      }
    };
    window.addEventListener("message", handleMessage);

    // On load, tell the iframe its actual rendered width so it can zoom
    // wide content down to fit. iOS Safari ignores <meta viewport> inside
    // iframes, so the layout viewport inside stays at ~980px regardless of
    // the element's CSS width. PostMessage is the only reliable bridge.
    const onLoad = () => {
      iframe.contentWindow?.postMessage(
        { type: "iframe-viewport", width: iframe.clientWidth },
        "*"
      );
    };
    iframe.addEventListener("load", onLoad);

    return () => {
      window.removeEventListener("message", handleMessage);
      iframe.removeEventListener("load", onLoad);
    };
  }, []);

  const srcDoc = type === "html" ? prepareHtml(body) : prepareTextBody(body);

  return (
    <iframe
      ref={iframeRef}
      srcDoc={srcDoc}
      className="w-full border-0 block"
      style={{ minHeight: "200px" }}
      // allow-scripts: needed for the injected resize script.
      // No allow-same-origin so email scripts cannot access parent frame,
      // cookies, or application storage.
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      title="Email content"
    />
  );
}
