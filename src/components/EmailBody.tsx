"use client";

interface Props {
  body: string;
  type: "html" | "text";
}

export default function EmailBody({ body, type }: Props) {
  if (type === "html") {
    return (
      <iframe
        srcDoc={body}
        className="w-full min-h-96 border-0"
        sandbox="allow-popups allow-popups-to-escape-sandbox"
        style={{ height: "600px" }}
        title="Email content"
      />
    );
  }

  // Plain text: preserve whitespace
  return (
    <pre className="text-sm text-zinc-700 whitespace-pre-wrap font-sans leading-relaxed">
      {body}
    </pre>
  );
}
