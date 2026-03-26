import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccountId } from "@/lib/jmap";
import { log } from "@/lib/logger";

export async function GET(req: NextRequest) {
  const t = Date.now();
  try {
    const { searchParams } = new URL(req.url);
    const blobId = searchParams.get("blobId");
    const name = searchParams.get("name") ?? "file";
    const type = searchParams.get("type") ?? "application/octet-stream";

    if (!blobId) {
      return NextResponse.json({ error: "Missing blobId" }, { status: 400 });
    }

    const token = process.env.FASTMAIL_API_TOKEN;
    if (!token) throw new Error("FASTMAIL_API_TOKEN is not set");

    const session = await getSession();
    const accountId = getAccountId(session);

    const url = session.downloadUrl
      .replace(/\{accountId\}/, accountId)
      .replace(/\{blobId\}/, blobId)
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

    log.info({ blob_id: blobId, name, type, duration_ms: Date.now() - t }, "route.download");

    const inline = searchParams.get("inline") === "true";
    const disposition = inline ? "inline" : "attachment";
    const headers: Record<string, string> = {
      "Content-Type": type,
      "Content-Disposition": `${disposition}; filename="${name.replace(/"/g, '\\"')}"`,
    };
    const contentLength = res.headers.get("Content-Length");
    if (contentLength) headers["Content-Length"] = contentLength;

    return new Response(res.body, { headers });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    log.error({ err: message, duration_ms: Date.now() - t }, "route.download.error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
