import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSession, getAccountId } from "@/lib/jmap";
import { log } from "@/lib/logger";

const MIME_RE = /^[a-z0-9][a-z0-9!#$&^_.+-]*\/[a-z0-9][a-z0-9!#$&^_.+-]*$/i;

function normalizeMimeType(value: string | null | undefined): string | null {
  if (!value) return null;
  const [mimeType] = value.split(";", 1);
  const normalized = mimeType.trim().toLowerCase();
  return MIME_RE.test(normalized) ? normalized : null;
}

function sanitizeFilename(name: string): string {
  const sanitized = name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[\\/:"*?<>|]+/g, "_")
    .trim();
  return sanitized || "file";
}

function formatContentDisposition(disposition: "attachment" | "inline", filename: string): string {
  const asciiFallback = filename
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\]/g, "_");
  return `${disposition}; filename="${asciiFallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function canInline(contentType: string): boolean {
  return (
    contentType === "application/pdf" ||
    (contentType.startsWith("image/") && contentType !== "image/svg+xml")
  );
}

export async function GET(req: NextRequest) {
  const t = Date.now();
  try {
    const sessionData = await auth();
    if (!sessionData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const blobId = searchParams.get("blobId");
    const name = sanitizeFilename(searchParams.get("name") ?? "file");
    const type = normalizeMimeType(searchParams.get("type")) ?? "application/octet-stream";

    if (!blobId) {
      return NextResponse.json({ error: "Missing blobId" }, { status: 400 });
    }

    const token = process.env.FASTMAIL_API_TOKEN;
    if (!token) throw new Error("FASTMAIL_API_TOKEN is not set");

    const session = await getSession();
    const accountId = getAccountId(session);

    const url = session.downloadUrl
      .replace(/\{accountId\}/, accountId)
      .replace(/\{blobId\}/, encodeURIComponent(blobId))
      .replace(/\{name\}/, encodeURIComponent(name))
      .replace(/\{type\}/, encodeURIComponent(type));

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (!res.ok) {
      log.error({ blob_id: blobId, http_status: res.status, duration_ms: Date.now() - t }, "route.download.error");
      return NextResponse.json({ error: "Download failed" }, { status: res.status });
    }

    const contentType = normalizeMimeType(res.headers.get("Content-Type")) ?? type;
    const inline = searchParams.get("inline") === "true";
    const disposition = inline && canInline(contentType) ? "inline" : "attachment";
    const headers: Record<string, string> = {
      "Content-Type": contentType,
      "Content-Disposition": formatContentDisposition(disposition, name),
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
    };
    const contentLength = res.headers.get("Content-Length");
    if (contentLength) headers["Content-Length"] = contentLength;

    log.info({
      blob_id: blobId,
      content_type: contentType,
      inline: disposition === "inline",
      duration_ms: Date.now() - t,
    }, "route.download");

    return new Response(res.body, { headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    log.error({ err: message, duration_ms: Date.now() - t }, "route.download.error");
    return NextResponse.json({ error: "Download failed" }, { status: 500 });
  }
}
