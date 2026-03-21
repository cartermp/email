"use client";

import { useEffect, useRef } from "react";

interface Props {
  body: string;
  type: "html" | "text";
}

export default function EmailBody({ body, type }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-resize iframe to fit its content
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const resize = () => {
      const doc = iframe.contentDocument;
      if (doc) {
        iframe.style.height = doc.documentElement.scrollHeight + "px";
      }
    };
    iframe.addEventListener("load", resize);
    return () => iframe.removeEventListener("load", resize);
  }, [body]);

  if (type === "html") {
    return (
      <iframe
        ref={iframeRef}
        srcDoc={body}
        className="w-full border-0 block"
        style={{ minHeight: "400px", colorScheme: "light" }}
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        title="Email content"
      />
    );
  }

  return (
    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
      {body}
    </pre>
  );
}
