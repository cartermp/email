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
