import { NextRequest, NextResponse } from "next/server";
import { getSession, getAccountId, uploadBlob } from "@/lib/jmap";
import { log } from "@/lib/logger";

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/svg+xml",
]);

export async function POST(req: NextRequest) {
  const t = Date.now();
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      log.warn({}, "route.upload.no_file");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      log.warn({ file_type: file.type, file_name: file.name }, "route.upload.unsupported_type");
      return NextResponse.json({ error: "Unsupported file type" }, { status: 415 });
    }

    const session = await getSession();
    const accountId = getAccountId(session);
    const buffer = await file.arrayBuffer();
    const result = await uploadBlob(session.uploadUrl, accountId, buffer, file.type);

    log.info({
      file_name: file.name,
      file_type: file.type,
      file_size_bytes: buffer.byteLength,
      blob_id: result.blobId,
      duration_ms: Date.now() - t,
    }, "route.upload");

    return NextResponse.json({ blobId: result.blobId, type: result.type });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    log.error({ err: message, duration_ms: Date.now() - t }, "route.upload.error");
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
