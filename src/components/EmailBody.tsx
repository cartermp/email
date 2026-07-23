"use client";

import { useCallback, useEffect, useRef } from "react";
import useBodyClass from "@/components/useBodyClass";
import { prepareHtml, prepareTextBody } from "@/lib/emailHtml";
import type { EmailBodyPart } from "@/lib/types";

interface Props {
  body: string;
  type: "html" | "text";
  stripQuotes?: boolean;
  embeddedParts?: EmailBodyPart[];
}

export default function EmailBody({
  body,
  type,
  stripQuotes,
  embeddedParts = [],
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastDimsRef = useRef({ h: 0, w: 0 });

  useBodyClass("rich-content-open");

  const syncIframeLayout = useCallback(() => {
    const iframe = iframeRef.current;
    const wrapper = wrapperRef.current;
    if (!iframe || !wrapper) return;

    const parentWidth = wrapper.clientWidth;
    iframe.contentWindow?.postMessage({ type: "iframe-parent-width", width: parentWidth }, "*");
    iframe.contentWindow?.postMessage("iframe-ping", "*");
  }, []);

  useEffect(() => {
    lastDimsRef.current = { h: 0, w: 0 };
    window.requestAnimationFrame(syncIframeLayout);
  }, [body, type, syncIframeLayout]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      const iframe = iframeRef.current;
      const wrapper = wrapperRef.current;
      if (!iframe || !wrapper) return;
      if (e.source !== iframe.contentWindow) return;
      if (e.origin !== "null") return;
      if (e.data?.type !== "iframe-resize") return;

      const naturalH = Number(e.data.height);
      const naturalW = Number(e.data.width);
      if (!Number.isFinite(naturalH) || naturalH <= 0) return;
      if (!Number.isFinite(naturalW) || naturalW < 0) return;
      if (naturalH === lastDimsRef.current.h && naturalW === lastDimsRef.current.w) return;
      lastDimsRef.current = { h: naturalH, w: naturalW };

      const availW = wrapper.clientWidth;

      if (naturalW > availW + 2 && availW > 0) {
        const scale = availW / naturalW;
        iframe.style.width = naturalW + "px";
        iframe.style.height = naturalH + "px";
        iframe.style.transform = `scale(${scale})`;
        iframe.style.transformOrigin = "top left";
        iframe.style.willChange = "transform";
        wrapper.style.height = Math.ceil(naturalH * scale) + "px";
      } else {
        iframe.style.width = "100%";
        iframe.style.height = naturalH + "px";
        iframe.style.transform = "";
        iframe.style.willChange = "";
        wrapper.style.height = "";
      }
    };

    window.addEventListener("message", handleMessage);

    const wrapper = wrapperRef.current;
    const resizeObserver =
      wrapper && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => syncIframeLayout())
        : null;
    if (wrapper && resizeObserver) {
      resizeObserver.observe(wrapper);
    }
    window.addEventListener("resize", syncIframeLayout);
    syncIframeLayout();

    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("resize", syncIframeLayout);
      resizeObserver?.disconnect();
    };
  }, [syncIframeLayout]);

  const srcDoc =
    type === "html"
      ? prepareHtml(body, { stripQuotes, embeddedParts })
      : prepareTextBody(body, { stripQuotes });

  return (
    <div
      ref={wrapperRef}
      className="bg-white"
      style={{ minHeight: "160px", overflow: "hidden", position: "relative" }}
    >
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        className="w-full border-0 block"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="no-referrer"
        title="Email content"
        onLoad={syncIframeLayout}
      />
    </div>
  );
}
