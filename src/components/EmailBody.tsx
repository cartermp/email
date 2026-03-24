"use client";

import { useEffect, useRef } from "react";
import { prepareHtml, prepareTextBody } from "@/lib/emailHtml";

interface Props {
  body: string;
  type: "html" | "text";
  stripQuotes?: boolean;
}

export default function EmailBody({ body, type, stripQuotes }: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const iframe = iframeRef.current;
      const wrapper = wrapperRef.current;
      if (!iframe || !wrapper) return;
      if (e.source !== iframe.contentWindow) return;
      if (e.data?.type !== "iframe-resize") return;

      const naturalH: number = e.data.height;
      const naturalW: number = e.data.width ?? 0;
      if (!naturalH || naturalH <= 0) return;

      const availW = wrapper.clientWidth;

      if (naturalW > availW + 2 && availW > 0) {
        // Content is wider than the container (common for HTML newsletters on
        // mobile — iOS Safari ignores <meta viewport> inside iframes so layout
        // happens at ~980 px). Scale the iframe element down from the outside
        // so the full content fits without any internal rewriting.
        const scale = availW / naturalW;
        iframe.style.width = naturalW + "px";
        iframe.style.height = naturalH + "px";
        iframe.style.transform = `scale(${scale})`;
        iframe.style.transformOrigin = "top left";
        wrapper.style.height = Math.ceil(naturalH * scale) + "px";
      } else {
        // Content fits — normal sizing.
        iframe.style.width = "100%";
        iframe.style.height = naturalH + "px";
        iframe.style.transform = "";
        wrapper.style.height = "";
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const srcDoc =
    type === "html"
      ? prepareHtml(body, { stripQuotes })
      : prepareTextBody(body, { stripQuotes });

  return (
    <div ref={wrapperRef} style={{ minHeight: "200px", overflow: "hidden" }}>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        className="w-full border-0 block"
        // allow-scripts: needed for the injected resize script.
        // No allow-same-origin so email scripts cannot access parent frame,
        // cookies, or application storage.
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        title="Email content"
      />
    </div>
  );
}
