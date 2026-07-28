"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import useBodyClass from "@/components/useBodyClass";
import { useAppearance } from "@/components/AppearanceProvider";
import { lockEmailContentWidth } from "@/lib/emailFrameLayout";
import { hasRemoteContent, prepareHtml, prepareTextBody } from "@/lib/emailHtml";
import type { EmailBodyPart } from "@/lib/types";

const EMPTY_EMBEDDED_PARTS: EmailBodyPart[] = [];

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
  embeddedParts = EMPTY_EMBEDDED_PARTS,
}: Props) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastDimsRef = useRef({ h: 0, w: 0, availableWidth: 0 });
  const lockedContentWidthRef = useRef<number | null>(null);
  const [remoteContentAllowedFor, setRemoteContentAllowedFor] = useState<
    string | null
  >(null);
  const { preferences } = useAppearance();
  const remoteContentAvailable = type === "html" && hasRemoteContent(body);
  const allowRemoteContent = remoteContentAllowedFor === body;

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
    const iframe = iframeRef.current;
    const wrapper = wrapperRef.current;
    lastDimsRef.current = { h: 0, w: 0, availableWidth: 0 };
    lockedContentWidthRef.current = null;
    if (iframe) {
      iframe.style.width = "100%";
      iframe.style.transform = "";
      iframe.style.willChange = "";
    }
    if (wrapper) wrapper.style.height = "";
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

      const availW = wrapper.clientWidth;
      if (
        naturalH === lastDimsRef.current.h &&
        naturalW === lastDimsRef.current.w &&
        availW === lastDimsRef.current.availableWidth
      ) {
        return;
      }
      lastDimsRef.current = { h: naturalH, w: naturalW, availableWidth: availW };

      const previousLockedWidth = lockedContentWidthRef.current;
      const lockedWidth = lockEmailContentWidth(
        availW,
        naturalW,
        previousLockedWidth,
      );
      lockedContentWidthRef.current = lockedWidth;

      if (lockedWidth !== null && availW > 0) {
        const scale = availW / lockedWidth;
        iframe.style.width = lockedWidth + "px";
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

        if (previousLockedWidth !== null) {
          window.requestAnimationFrame(syncIframeLayout);
        }
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

  const srcDoc = useMemo(
    () =>
      type === "html"
        ? prepareHtml(body, {
            stripQuotes,
            embeddedParts,
            colorMode: preferences.theme,
            allowRemoteContent,
          })
        : prepareTextBody(body, {
            stripQuotes,
            colorMode: preferences.theme,
          }),
    [
      allowRemoteContent,
      body,
      embeddedParts,
      preferences.theme,
      stripQuotes,
      type,
    ],
  );

  return (
    <div className="bg-transparent">
      {remoteContentAvailable && !allowRemoteContent && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-stone-200 bg-stone-100 px-3 py-2 text-xs text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
          <span className="flex-1">Remote images are blocked for privacy.</span>
          <button
            type="button"
            onClick={() => setRemoteContentAllowedFor(body)}
            className="min-h-8 rounded-md border border-stone-300 bg-white px-2.5 font-medium text-stone-700 transition-colors hover:bg-stone-50 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-200 dark:hover:bg-stone-700"
          >
            Load images
          </button>
        </div>
      )}
      <div
        ref={wrapperRef}
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
    </div>
  );
}
