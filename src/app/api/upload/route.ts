import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { getSession, getAccountId, uploadBlob } from "@/lib/jmap";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
  const t = Date.now();
  try {
    const sessionData = await auth();
    if (!sessionData?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      log.warn({}, "route.upload.no_file");
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const session = await getSession();
    const accountId = getAccountId(session);
    const buffer = await file.arrayBuffer();
    const result = await uploadBlob(session.uploadUrl, accountId, buffer, file.type);

    log.info({
      file_type: file.type,
      file_size_bytes: buffer.byteLength,
      blob_id: result.blobId,
      duration_ms: Date.now() - t,
    }, "route.upload");

    return NextResponse.json({ blobId: result.blobId, type: result.type });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    log.error({ err: message, duration_ms: Date.now() - t }, "route.upload.error");
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
