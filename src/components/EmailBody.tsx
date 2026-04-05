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
  const lastDimsRef = useRef({ h: 0, w: 0 });

  useEffect(() => {
    lastDimsRef.current = { h: 0, w: 0 };
  }, [body, type]);

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
      if (naturalH === lastDimsRef.current.h && naturalW === lastDimsRef.current.w) return;
      lastDimsRef.current = { h: naturalH, w: naturalW };

      const availW = wrapper.clientWidth;

      if (naturalW > availW + 2 && availW > 0) {
        const scale = availW / naturalW;
        iframe.style.width = naturalW + "px";
        iframe.style.height = naturalH + "px";
        iframe.style.transform = `scale(${scale})`;
        iframe.style.transformOrigin = "top left";
        wrapper.style.height = Math.ceil(naturalH * scale) + "px";
      } else {
        iframe.style.width = "100%";
        iframe.style.height = naturalH + "px";
        iframe.style.transform = "";
        wrapper.style.height = "";
      }
    };

    window.addEventListener("message", handleMessage);

    // On hard refresh the iframe loads from the SSR HTML before this
    // listener exists and the initial postMessages are lost. Ping the
    // iframe now that the listener is attached; the iframe script responds
    // by calling send() again.
    iframeRef.current?.contentWindow?.postMessage("iframe-ping", "*");

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const srcDoc =
    type === "html"
      ? prepareHtml(body, { stripQuotes })
      : prepareTextBody(body, { stripQuotes });

  return (
    <div ref={wrapperRef} className="bg-white dark:bg-stone-900" style={{ minHeight: "200px", overflow: "hidden", position: "relative", zIndex: 10000 }}>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        className="w-full border-0 block"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        title="Email content"
      />
    </div>
  );
}
